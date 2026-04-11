import * as vscode from 'vscode';
import { searchHexOrAscii, searchWebviewHtml } from './search';

export class HexDocument implements vscode.CustomDocument {
    uri: vscode.Uri;
    documentData: Uint8Array;
    private readonly _onDidDispose = new vscode.EventEmitter<void>();
    public readonly onDidDispose = this._onDidDispose.event;
    
    constructor(uri: vscode.Uri, initialData: Uint8Array) {
        this.uri = uri;
        this.documentData = initialData;
    }
    
    dispose(): void {
        this._onDidDispose.fire();
        this._onDidDispose.dispose();
    }
}

export class HexEditorProvider implements vscode.CustomEditorProvider<HexDocument> {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            'hexdiff.hexEditor',
            new HexEditorProvider(context),
            {
                webviewOptions: { retainContextWhenHidden: true },
                supportsMultipleEditorsPerDocument: false
            }
        );
    }

    constructor(private readonly context: vscode.ExtensionContext) { }

    private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<HexDocument>>();
    public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

    async saveCustomDocument(document: HexDocument, cancellation: vscode.CancellationToken): Promise<void> {
        await vscode.workspace.fs.writeFile(document.uri, document.documentData);
    }

    async saveCustomDocumentAs(document: HexDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
        await vscode.workspace.fs.writeFile(destination, document.documentData);
    }

    async revertCustomDocument(document: HexDocument, cancellation: vscode.CancellationToken): Promise<void> {
        const diskData = await vscode.workspace.fs.readFile(document.uri);
        document.documentData = new Uint8Array(diskData);
    }

    async backupCustomDocument(document: HexDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
        await vscode.workspace.fs.writeFile(context.destination, document.documentData);
        return { id: context.destination.toString(), delete: async () => vscode.workspace.fs.delete(context.destination) };
    }

    async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): Promise<HexDocument> {
        let documentData: Uint8Array;
        if (openContext.backupId) {
            documentData = new Uint8Array(await vscode.workspace.fs.readFile(vscode.Uri.parse(openContext.backupId)));
        } else {
            if (openContext.untitledDocumentData) {
                documentData = new Uint8Array(openContext.untitledDocumentData);
            } else if (uri.scheme === 'untitled') {
                documentData = new Uint8Array(0);
            } else {
                documentData = new Uint8Array(await vscode.workspace.fs.readFile(uri));
            }
        }
        return new HexDocument(uri, documentData);
    }
    
    async resolveCustomEditor(document: HexDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
        
        const BUFFER_ROWS = 40;
        const BYTES_PER_ROW = 16;
        
        webviewPanel.webview.onDidReceiveMessage(e => {
            if (e.type === 'init') {
                webviewPanel.webview.postMessage({ 
                    type: 'totalSize', 
                    totalBytes: document.documentData.length
                });
            } else if (e.type === 'requestChunk') {
                const start = e.startOffset;
                const end = Math.min(document.documentData.length, e.endOffset);
                const chunkData = Array.from(document.documentData.slice(start, end));
                webviewPanel.webview.postMessage({ 
                    type: 'chunk', 
                    startOffset: start, 
                    data: chunkData 
                });
            } else if (e.type === 'edit') {
                const actualOffset = e.offset;
                document.documentData[actualOffset] = e.value;
                this._onDidChangeCustomDocument.fire({
                    document,
                    undo: () => {
                        document.documentData[actualOffset] = e.oldValue;
                        webviewPanel.webview.postMessage({ type: 'refresh' });
                    },
                    redo: () => {
                        document.documentData[actualOffset] = e.value;
                        webviewPanel.webview.postMessage({ type: 'refresh' });
                    }
                });
            } else if (e.type === 'add') {
                const oldData = document.documentData;
                const newData = new Uint8Array(oldData.length + 1);
                newData.set(oldData);
                newData[oldData.length] = 0x00; // initialize to 00
                
                document.documentData = newData;
                
                this._onDidChangeCustomDocument.fire({
                    document,
                    undo: () => {
                        document.documentData = oldData;
                        webviewPanel.webview.postMessage({ type: 'totalSize', totalBytes: document.documentData.length });
                    },
                    redo: () => {
                        document.documentData = newData;
                        webviewPanel.webview.postMessage({ type: 'totalSize', totalBytes: document.documentData.length });
                    }
                });
                webviewPanel.webview.postMessage({ type: 'totalSize', totalBytes: document.documentData.length });
            } else if (e.type === 'copy') {
                vscode.env.clipboard.writeText(e.text);
                vscode.window.setStatusBarMessage(`Copied \${e.text.split(' ').length} bytes to clipboard`, 2000);
            } else if (e.type === 'search') {
                const results = searchHexOrAscii(e.query, e.searchType, document.documentData);
                const queryLength = e.searchType === 'hex' ? e.query.replace(/\s/g, '').length / 2 : e.query.length;
                webviewPanel.webview.postMessage({
                    type: 'searchResult',
                    matches: results,
                    matchLength: queryLength
                });
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hex Editor</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 0; margin: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); overflow: hidden; }
                #viewport { position: absolute; top: 0; left: 0; right: 0; bottom: 30px; overflow-y: auto; padding: 10px; box-sizing: border-box; }
                #spacer { width: 1px; visibility: hidden; }
                #content-wrapper { position: absolute; top: 10px; left: 10px; right: 10px; }
                .row { display: flex; height: 24px; align-items: center; box-sizing: border-box; }
                .offset { color: var(--vscode-editorLineNumber-foreground); margin-right: 15px; user-select: none; width: 8ch; }
                .hex { margin-right: 15px; display: flex; gap: 5px; }
                .ascii { color: var(--vscode-editorCodeLens-foreground); white-space: pre; }
                .cell { width: 24px; height: 24px; line-height: 24px; text-align: center; cursor: pointer; border-radius: 2px; text-transform: lowercase; border: 1px solid transparent; box-sizing: border-box; }
                .cell:hover { background: var(--vscode-editor-lineHighlightBackground); border-color: var(--vscode-focusBorder); }
                .cell:focus { outline: 1px solid var(--vscode-focusBorder); background: var(--vscode-editor-lineHighlightBackground); }
                .cell.selected { background: var(--vscode-editor-selectionBackground) !important; color: var(--vscode-editor-selectionForeground) !important; }
                
                /* Search highlight */
                .search-match { background: var(--vscode-editor-findMatchBackground) !important; outline: 1px solid var(--vscode-editor-findMatchBorder); }
                .search-active { background: var(--vscode-editor-findMatchHighlightBackground) !important; outline: 1px solid var(--vscode-editor-findMatchHighlightBorder); }
                #search-widget { position: absolute; top: 10px; right: 20px; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); box-shadow: 0 0 8px var(--vscode-widget-shadow); padding: 6px; z-index: 1000; display: flex; align-items: center; gap: 6px; border-radius: 4px; }
                #search-widget input[type="text"] { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 4px; outline: none; width: 200px; }
                #search-widget input[type="text"]:focus { border-color: var(--vscode-focusBorder); }
                #search-widget select { background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); padding: 3px; outline: none; }
                #search-widget button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 4px 8px; cursor: pointer; border-radius: 2px; }
                #search-widget button:hover { background: var(--vscode-button-secondaryHoverBackground); }
                .search-count { font-size: 12px; min-width: 50px; text-align: center; }

                #add-byte-btn { display: inline-block; margin-top: 15px; margin-bottom: 20px; padding: 6px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; border-radius: 2px; }
                #add-byte-btn:hover { background: var(--vscode-button-hoverBackground); border-color: var(--vscode-focusBorder); }
                #status-bar {
                    position: fixed; bottom: 0; left: 0; right: 0; height: 30px;
                    padding: 0 15px;
                    background: var(--vscode-statusBar-background);
                    color: var(--vscode-statusBar-foreground);
                    font-size: 12px;
                    border-top: 1px solid var(--vscode-statusBar-border, transparent);
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                }
                #context-menu {
                    display: none; position: absolute; background: var(--vscode-menu-background); 
                    color: var(--vscode-menu-foreground); border: 1px solid var(--vscode-menu-border);
                    box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0,0,0,0.2)); z-index: 1000; padding: 4px 0; min-width: 120px;
                }
                .context-menu-item { padding: 6px 20px; cursor: pointer; }
                .context-menu-item:hover { background: var(--vscode-menu-selectionBackground); color: var(--vscode-menu-selectionForeground); }
            </style>
        </head>
        <body>
            ${searchWebviewHtml()}
            <div id="viewport">
                <div id="spacer"></div>
                <div id="content-wrapper">
                    <div id="content">Loading...</div>
                    <button id="add-byte-btn" style="display: none;">+ Add Byte at EOF</button>
                </div>
            </div>
            <div id="status-bar">Selected: 0 bytes | Offset: 0x00000000</div>
            <div id="context-menu">
                <div class="context-menu-item" id="menu-copy-hex">Copy as Hex</div>
                <div class="context-menu-item" id="menu-copy-dec">Copy as Decimal</div>
                <div class="context-menu-item" id="menu-copy-bin">Copy as Binary</div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                let currentData = new Uint8Array();
                
                let isDragging = false;
                let selStart = -1;
                let selEnd = -1;
                
                let totalBytes = 0;
                const BYTES_PER_ROW = 16;
                const ROW_HEIGHT = 24;
                const BUFFER_ROWS = 20;

                let loadedStartRow = -1;
                let loadedEndRow = -1;
                let isRequesting = false;
                let pendingRefresh = false;

                let searchMatches = [];
                let searchMatchLength = 0;
                let currentMatchIndex = 0;
                let searchQuery = "";

                document.getElementById('add-byte-btn').addEventListener('click', () => {
                    vscode.postMessage({ type: 'add' });
                });

                document.getElementById('viewport').addEventListener('scroll', () => {
                    requestVisible();
                });

                // Search Event Listeners
                document.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 'f') {
                        e.preventDefault();
                        const widget = document.getElementById('search-widget');
                        widget.style.display = widget.style.display === 'none' ? 'flex' : 'none';
                        if (widget.style.display === 'flex') {
                            document.getElementById('search-input').focus();
                            document.getElementById('search-input').select();
                        }
                    } else if (e.key === 'Escape') {
                        document.getElementById('search-widget').style.display = 'none';
                        searchMatches = [];
                        updateSearchCount();
                        render(loadedStartRow * BYTES_PER_ROW);
                    }
                });

                document.getElementById('search-input').addEventListener('input', (e) => {
                    const query = e.target.value.trim();
                    searchQuery = query;
                    if (!query) {
                        searchMatches = [];
                        updateSearchCount();
                        render(loadedStartRow * BYTES_PER_ROW);
                        return;
                    }
                    const type = document.getElementById('search-type').value;
                    vscode.postMessage({ type: 'search', query, searchType: type });
                });
                
                document.getElementById('search-type').addEventListener('change', () => {
                   document.getElementById('search-input').dispatchEvent(new Event('input'));
                });

                document.getElementById('search-prev').addEventListener('click', () => {
                    if (searchMatches.length > 0) {
                        currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
                        updateSearchCount();
                        scrollToMatch(currentMatchIndex);
                    }
                });
                
                document.getElementById('search-next').addEventListener('click', () => {
                    if (searchMatches.length > 0) {
                        currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
                        updateSearchCount();
                        scrollToMatch(currentMatchIndex);
                    }
                });

                document.getElementById('search-close').addEventListener('click', () => {
                    document.getElementById('search-widget').style.display = 'none';
                    searchMatches = [];
                    updateSearchCount();
                    render(loadedStartRow * BYTES_PER_ROW);
                });
                
                function updateSearchCount() {
                    const countEl = document.getElementById('search-count');
                    if (searchMatches.length === 0) {
                        countEl.innerText = "0/0";
                    } else {
                        countEl.innerText = \`\$\{currentMatchIndex + 1\}/\$\{searchMatches.length\}\`;
                    }
                }
                
                function scrollToMatch(index) {
                    if (!searchMatches || index < 0 || index >= searchMatches.length) return;
                    const offset = searchMatches[index];
                    const row = Math.floor(offset / BYTES_PER_ROW);
                    const viewport = document.getElementById('viewport');
                    const targetScrollTop = row * ROW_HEIGHT;
                    viewport.scrollTop = Math.max(0, targetScrollTop - (viewport.clientHeight / 2));
                    render(loadedStartRow * BYTES_PER_ROW);
                }

                function requestVisible(force = false) {
                    if (totalBytes === 0) {
                        document.getElementById('content').innerHTML = 'File is empty';
                        document.getElementById('add-byte-btn').style.display = 'inline-block';
                        return;
                    }
                    if (isRequesting && !force) {
                        pendingRefresh = true;
                        return; // waiting for chunk
                    }

                    const scrollTop = document.getElementById('viewport').scrollTop;
                    const viewHeight = document.getElementById('viewport').clientHeight;
                    
                    const visibleStartRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
                    const visibleEndRow = visibleStartRow + Math.ceil(viewHeight / ROW_HEIGHT);

                    const maxRow = Math.ceil(totalBytes / BYTES_PER_ROW);

                    if (!force && loadedStartRow !== -1) {
                        // Check if we have enough buffer covering our view
                        const bufferTop = visibleStartRow - loadedStartRow;
                        const bufferBottom = loadedEndRow - visibleEndRow;
                        if (bufferTop >= 5 && bufferBottom >= 5) {
                            return; // still good
                        }
                    }

                    const fetchStartRow = Math.max(0, visibleStartRow - BUFFER_ROWS);
                    const fetchEndRow = Math.min(maxRow, visibleEndRow + BUFFER_ROWS);

                    isRequesting = true;
                    vscode.postMessage({ type: 'requestChunk', startOffset: fetchStartRow * BYTES_PER_ROW, endOffset: fetchEndRow * BYTES_PER_ROW });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'totalSize') {
                        totalBytes = message.totalBytes;
                        document.getElementById('spacer').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT + 60) + 'px';
                        requestVisible(true);
                    } else if (message.type === 'chunk') {
                        currentData = new Uint8Array(message.data);
                        loadedStartRow = message.startOffset / BYTES_PER_ROW;
                        loadedEndRow = loadedStartRow + Math.ceil(currentData.length / BYTES_PER_ROW);
                        
                        document.getElementById('content-wrapper').style.transform = \`translateY(\$\{loadedStartRow * ROW_HEIGHT\}px)\`;
                        
                        render(message.startOffset);
                        isRequesting = false;
                        
                        if (pendingRefresh) {
                            pendingRefresh = false;
                            requestVisible();
                        }
                    } else if (message.type === 'refresh') {
                        requestVisible(true);
                    } else if (message.type === 'searchResult') {
                        searchMatches = message.matches;
                        searchMatchLength = message.matchLength || 0;
                        currentMatchIndex = 0;
                        updateSearchCount();
                        if (searchMatches.length > 0) {
                            scrollToMatch(currentMatchIndex);
                        } else {
                            if (searchQuery) alert('No matches found for: ' + searchQuery);
                        }
                    }
                });

                // Init
                vscode.postMessage({ type: 'init' });

                window.addEventListener('mouseup', () => { isDragging = false; });
                
                document.addEventListener('contextmenu', (e) => {
                    if (selStart !== -1 && selEnd !== -1 && e.target.classList.contains('cell')) {
                        e.preventDefault();
                        const menu = document.getElementById('context-menu');
                        menu.style.display = 'block';
                        menu.style.left = e.pageX + 'px';
                        menu.style.top = e.pageY + 'px';
                    } else {
                        document.getElementById('context-menu').style.display = 'none';
                    }
                });

                document.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('context-menu-item')) {
                        document.getElementById('context-menu').style.display = 'none';
                    }
                });

                document.getElementById('menu-copy-hex').addEventListener('click', () => { copyData(16); });
                document.getElementById('menu-copy-dec').addEventListener('click', () => { copyData(10); });
                document.getElementById('menu-copy-bin').addEventListener('click', () => { copyData(2); });

                function copyData(base) {
                    const min = Math.min(selStart, selEnd);
                    const max = Math.max(selStart, selEnd);
                    if (min !== -1 && max !== -1) {
                        const startIdx = min - (loadedStartRow * BYTES_PER_ROW);
                        const endIdx = max - (loadedStartRow * BYTES_PER_ROW);
                        
                        if (startIdx >= 0 && endIdx < currentData.length) {
                            const bytes = currentData.slice(startIdx, endIdx + 1);
                            const text = Array.from(bytes).map(b => b.toString(base).padStart(base === 16 ? 2 : (base===2 ? 8 : 1), '0')).join(' ');
                            vscode.postMessage({ type: 'copy', text: text });
                        }
                    }
                    document.getElementById('context-menu').style.display = 'none';
                }
                
                function updateSelectionUI() {
                    const min = Math.min(selStart, selEnd);
                    const max = Math.max(selStart, selEnd);
                    const count = selStart !== -1 && selEnd !== -1 ? Math.abs(selEnd - selStart) + 1 : 0;
                    
                    const cells = document.querySelectorAll('.cell[data-offset]');
                    cells.forEach(c => {
                        const idx = parseInt(c.dataset.offset);
                        if (!isNaN(idx) && idx >= min && idx <= max) {
                            c.classList.add('selected');
                        } else {
                            c.classList.remove('selected');
                        }
                    });
                    
                    const status = document.getElementById('status-bar');
                    if (count > 0) {
                        status.innerText = \`Selected: \$\{count\} byte\$\{count > 1 ? 's' : ''\} | Offset: 0x\$\{min.toString(16).padStart(8, '0').toUpperCase()\}\`;
                    } else if (selStart !== -1) {
                        status.innerText = \`Selected: 1 byte | Offset: 0x\$\{selStart.toString(16).padStart(8, '0').toUpperCase()\}\`;
                    } else {
                        status.innerText = 'Selected: 0 bytes | Offset: --';
                    }
                }

                function createHeaderRow() {
                    const row = document.createElement('div');
                    row.className = 'row';
                    row.style.fontWeight = 'bold';
                    
                    const offset = document.createElement('div');
                    offset.className = 'offset';
                    offset.innerText = 'Offset';
                    row.appendChild(offset);
                    
                    const hex = document.createElement('div');
                    hex.className = 'hex';
                    for (let j = 0; j < 16; j++) {
                        const cell = document.createElement('div');
                        cell.className = 'cell';
                        cell.innerText = j.toString(16).padStart(2, '0').toUpperCase();
                        hex.appendChild(cell);
                    }
                    row.appendChild(hex);

                    const ascii = document.createElement('div');
                    ascii.className = 'ascii';
                    ascii.innerText = 'DECODED TEXT';
                    row.appendChild(ascii);

                    return row;
                }

                let lastFocusedOffset = -1;

                function render(baseOffset) {
                    const content = document.getElementById('content');
                    content.innerHTML = '';
                    content.appendChild(createHeaderRow());
                    
                    for (let i = 0; i < currentData.length; i += BYTES_PER_ROW) {
                        const row = document.createElement('div');
                        row.className = 'row';
                        
                        const offset = document.createElement('div');
                        offset.className = 'offset';
                        offset.innerText = (baseOffset + i).toString(16).padStart(8, '0');
                        row.appendChild(offset);
                        
                        const hex = document.createElement('div');
                        hex.className = 'hex';
                        
                        const ascii = document.createElement('div');
                        ascii.className = 'ascii';
                        
                        for (let j = 0; j < BYTES_PER_ROW; j++) {
                            if (i + j < currentData.length) {
                                const absOffset = baseOffset + i + j;
                                const val = currentData[i + j];
                                const cell = document.createElement('div');
                                cell.className = 'cell';
                                cell.dataset.offset = String(absOffset);
                                cell.innerText = val.toString(16).padStart(2, '0');
                                cell.contentEditable = true;
                                cell.addEventListener('blur', (e) => {
                                    let content = e.target.innerText.trim();
                                    if (content === '') { content = '00'; }
                                    if (content.length === 1) { content = '0' + content; }
                                    const newVal = parseInt(content, 16);
                                    if (!isNaN(newVal) && newVal !== val && newVal >= 0 && newVal <= 255) {
                                        currentData[i + j] = newVal;
                                        e.target.innerText = newVal.toString(16).padStart(2, '0');
                                        
                                        const asciiContainer = e.target.parentElement.nextElementSibling;
                                        if (asciiContainer && asciiContainer.children[j]) {
                                            asciiContainer.children[j].innerText = newVal >= 32 && newVal <= 126 ? String.fromCharCode(newVal) : '.';
                                        }

                                        vscode.postMessage({ type: 'edit', offset: absOffset, value: newVal, oldValue: val });
                                    } else {
                                        e.target.innerText = val.toString(16).padStart(2, '0');
                                    }
                                });
                                cell.addEventListener('focus', (e) => {
                                    const offsetId = parseInt(e.target.dataset.offset);
                                    lastFocusedOffset = offsetId;
                                    const min = Math.min(selStart, selEnd);
                                    const max = Math.max(selStart, selEnd);
                                    if (!isDragging && (selStart === -1 || offsetId < min || offsetId > max)) {
                                        selStart = offsetId;
                                        selEnd = offsetId;
                                        updateSelectionUI();
                                    }
                                    const range = document.createRange();
                                    range.selectNodeContents(e.target);
                                    const sel = window.getSelection();
                                    sel.removeAllRanges();
                                    sel.addRange(range);
                                });
                                cell.addEventListener('mousedown', (e) => {
                                    if (e.button === 2) return;
                                    const offsetId = parseInt(e.target.dataset.offset);
                                    if (e.shiftKey && selStart !== -1) {
                                        selEnd = offsetId;
                                        e.preventDefault();
                                    } else {
                                        selStart = offsetId;
                                        selEnd = offsetId;
                                    }
                                    isDragging = true;
                                    updateSelectionUI();
                                });
                                cell.addEventListener('mouseenter', (e) => {
                                    if (isDragging) {
                                        selEnd = parseInt(e.target.dataset.offset);
                                        updateSelectionUI();
                                    }
                                });
                                cell.addEventListener('keydown', (e) => {
                                    if (e.key === 'Enter') { 
                                        e.preventDefault(); 
                                        e.target.blur(); 
                                        return;
                                    }
                                    
                                    const isHex = /^[0-9a-fA-F]$/.test(e.key);
                                    const isNav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key);
                                    const isCopyPaste = e.ctrlKey || e.metaKey;
                                    
                                    if (!isHex && !isNav && !isCopyPaste) {
                                        e.preventDefault();
                                        return;
                                    }
                                    
                                    if (isHex && e.target.innerText.length >= 2) {
                                        const selection = window.getSelection();
                                        if (selection.anchorNode !== selection.focusNode || selection.anchorOffset === selection.focusOffset) {
                                            e.preventDefault();
                                        }
                                    }
                                });
                                
                                // Highlight search matches
                                const charSpan = document.createElement('span');
                                charSpan.className = 'ascii-char';
                                charSpan.innerText = val >= 32 && val <= 126 ? String.fromCharCode(val) : '.';
                                if (searchMatches && searchMatches.length > 0) {
                                    // optimize highlight checking
                                    const activeStart = searchMatches[currentMatchIndex];
                                    const activeEnd = activeStart + searchMatchLength;
                                    
                                    const isMatch = searchMatches.some(m => absOffset >= m && absOffset < m + searchMatchLength);
                                    if (isMatch) {
                                        cell.classList.add('search-match');
                                        charSpan.classList.add('search-match');
                                    }
                                    if (absOffset >= activeStart && absOffset < activeEnd) {
                                        cell.classList.add('search-active');
                                        charSpan.classList.add('search-active');
                                    }
                                }

                                hex.appendChild(cell);
                                ascii.appendChild(charSpan);
                            } else {
                                const cell = document.createElement('div');
                                cell.className = 'cell';
                                cell.innerText = '  ';
                                hex.appendChild(cell);
                                
                                const charSpan = document.createElement('span');
                                charSpan.className = 'ascii-char';
                                charSpan.innerText = ' ';
                                ascii.appendChild(charSpan);
                            }
                        }
                        row.appendChild(hex);
                        row.appendChild(ascii);
                        
                        content.appendChild(row);
                    }
                    
                    if (baseOffset + currentData.length >= totalBytes) {
                        document.getElementById('add-byte-btn').style.display = 'inline-block';
                    } else {
                        document.getElementById('add-byte-btn').style.display = 'none';
                    }
                    
                    updateSelectionUI();
                    
                    if (lastFocusedOffset !== -1) {
                        const targetCell = document.querySelector(\`.cell[data-offset="\$\{lastFocusedOffset\}"]\`);
                        if (targetCell && document.activeElement !== targetCell) {
                            try { targetCell.focus(); } catch(e){}
                        }
                    }
                }
            </script>
        </body>
        </html>`;
    }
}
