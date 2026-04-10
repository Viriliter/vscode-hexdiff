import * as vscode from 'vscode';
import * as fs from 'fs';

export class HexDiffPanel {
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    
    private _data1: Uint8Array = new Uint8Array();
    private _data2: Uint8Array = new Uint8Array();
    public uri1: vscode.Uri;
    public uri2: vscode.Uri;
    private _dataReadyPromise!: Promise<void>;
    
    public static createOrShow(extensionUri: vscode.Uri, uri1: vscode.Uri, uri2: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const name1 = uri1.path.split('/').pop() || 'file1';
        const name2 = uri2.path.split('/').pop() || 'file2';
        const title = `${name1} ↔ ${name2}`;
        
        const panel = vscode.window.createWebviewPanel(
            'hexDiff',
            title,
            column || vscode.ViewColumn.One,
            { enableScripts: true }
        );

        new HexDiffPanel(panel, extensionUri, uri1, uri2, null, null);
    }
    
    public static createOrShowWithData(extensionUri: vscode.Uri, uri1: vscode.Uri, uri2: vscode.Uri, data1: Uint8Array, data2: Uint8Array | null) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const name1 = uri1.path.split('/').pop() || 'file1';
        const name2 = uri2.path.split('/').pop() || 'file2';
        const title = `${name1} ↔ ${name2}`;

        const panel = vscode.window.createWebviewPanel(
            'hexDiff',
            title,
            column || vscode.ViewColumn.One,
            { enableScripts: true }
        );

        new HexDiffPanel(panel, extensionUri, uri1, uri2, data1, data2);
    }
    
    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, uri1: vscode.Uri, uri2: vscode.Uri, data1: Uint8Array | null, data2: Uint8Array | null) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.uri1 = uri1;
        this.uri2 = uri2;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this.setupMessageListener(); // Synchronously attach listener before webview executes code
        this._panel.webview.html = this._getWebviewContent();
        
        this._dataReadyPromise = this.loadData(data1, data2);

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('hexdiff')) {
                // If config changed, refresh the view
                this._panel.webview.html = this._getWebviewContent();
                // We also need to trigger re-rendering of the diff data
                // Sending an 'init' message from the backend simulates reloading state
                this._panel.webview.postMessage({ type: 'init' }); 
                // Note: The frontend will re-request chunk
            }
        }, null, this._disposables);
    }
    
    private async loadData(data1: Uint8Array | null, data2: Uint8Array | null) {
        if (data1) {
            this._data1 = data1;
        } else {
            const buf = await vscode.workspace.fs.readFile(this.uri1);
            this._data1 = new Uint8Array(buf);
        }
        
        if (data2) {
            this._data2 = data2;
        } else {
            const buf = await vscode.workspace.fs.readFile(this.uri2);
            this._data2 = new Uint8Array(buf);
        }
    }
    
    private getDiffRows(): number[] {
        const len = Math.max(this._data1.length, this._data2.length);
        const rows: number[] = [];
        const BYTES_PER_ROW = 16;
        for (let i = 0; i < len; i += BYTES_PER_ROW) {
            for (let j = 0; j < BYTES_PER_ROW; j++) {
                if (i + j >= len) break;
                const b1 = i + j < this._data1.length ? this._data1[i + j] : null;
                const b2 = i + j < this._data2.length ? this._data2[i + j] : null;
                if (b1 !== b2) {
                    rows.push(i / BYTES_PER_ROW);
                    break;
                }
            }
        }
        return rows;
    }
    
    private countDiffs(): number {
        const len = Math.max(this._data1.length, this._data2.length);
        let diffs = 0;
        for (let i = 0; i < len; i++) {
            const b1 = i < this._data1.length ? this._data1[i] : null;
            const b2 = i < this._data2.length ? this._data2[i] : null;
            if (b1 !== b2) diffs++;
        }
        return diffs;
    }
    
    private setupMessageListener() {
        this._panel.webview.onDidReceiveMessage(async message => {
            await this._dataReadyPromise; // Pause processing from webview until files are fully loaded!
            if (message.type === 'init') {
                const totalDiffs = this.countDiffs();
                const diffRows = this.getDiffRows();
                this._panel.webview.postMessage({
                    type: 'metadata',
                    uri1: this.uri1.fsPath,
                    uri2: this.uri2.fsPath,
                    maxLength: Math.max(this._data1.length, this._data2.length),
                    totalDiffs: totalDiffs,
                    diffRows: diffRows
                });
            } else if (message.type === 'requestChunk') {
                const start = message.startOffset;
                const end = message.endOffset;
                
                const chunkData1 = [];
                const chunkData2 = [];
                const bound = Math.min(Math.max(this._data1.length, this._data2.length), end);
                
                for(let i = start; i < bound; i++) {
                    chunkData1.push(i < this._data1.length ? this._data1[i] : null);
                    chunkData2.push(i < this._data2.length ? this._data2[i] : null);
                }
                
                this._panel.webview.postMessage({
                    type: 'diffChunk',
                    startOffset: start,
                    data1: chunkData1,
                    data2: chunkData2
                });
            }
        });
    }

    public dispose() {
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }
    
    private _getWebviewContent(): string {
        const config = vscode.workspace.getConfiguration('hexdiff');
        const diffBg = config.get<string>('diffBackgroundColor') || 'rgba(255, 0, 0, 0.3)';
        const addedBg = config.get<string>('addedBackgroundColor') || 'rgba(0, 255, 0, 0.3)';
        const fontFam = config.get<string>('fontFamily') || "'Courier New', monospace";

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hex Diff</title>
            <style>
                body { font-family: ${fontFam}; padding: 0; margin: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); overflow: hidden; }
                #viewport { position: absolute; top: 64px; left: 0; right: 0; bottom: 30px; overflow-y: auto; padding: 0 10px 10px 10px; box-sizing: border-box; display: flex; gap: 20px; }
                .panel { flex: 1; position: relative; }
                #spacer1, #spacer2 { width: 1px; visibility: hidden; }
                #content-wrapper1, #content-wrapper2 { position: absolute; top: 0; left: 0; right: 0; }
                .row { display: flex; height: 24px; align-items: center; box-sizing: border-box; }
                .offset { color: var(--vscode-editorLineNumber-foreground); margin-right: 15px; user-select: none; width: 8ch; }
                .hex { margin-right: 15px; display: flex; gap: 5px; }
                .ascii { color: var(--vscode-editorCodeLens-foreground); white-space: pre; }
                .cell { width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 2px; text-transform: lowercase; border: 1px solid transparent; box-sizing: border-box; }
                .diff { background: ${diffBg} !important; color: white !important; font-weight: bold; }
                .added { background: ${addedBg} !important; color: white !important; }
                #status-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 30px; padding: 0 15px; background: var(--vscode-statusBar-background); color: var(--vscode-statusBar-foreground); font-size: 12px; display: flex; align-items: center; justify-content: flex-end; z-index: 100; }
                #floating-nav {                      position: fixed;                      bottom: 50px;                      right: 40px;                      z-index: 1000;                      background: var(--vscode-editorWidget-background);                      border: 1px solid var(--vscode-editorWidget-border);                      padding: 8px 16px;                      border-radius: 20px;                      box-shadow: 0 4px 12px var(--vscode-widget-shadow);                      display: flex;                      align-items: center;                      gap: 12px;                      opacity: 0.5;                      transition: opacity 0.2s ease, box-shadow 0.2s ease;                      backdrop-filter: blur(4px);                  }                 #floating-nav:hover { opacity: 1; box-shadow: 0 6px 16px var(--vscode-widget-shadow); }
                .nav-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px; padding: 4px 8px; cursor: pointer; }
                .nav-btn:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
                .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                #diff-stats { font-weight: bold; }
            </style>
        </head>
        <body>
            <div id="floating-nav" style="display: none;">
                <span id="diff-stats">Loading...</span>
                <button id="btn-prev" class="nav-btn" disabled>&#8593;</button>
                <button id="btn-next" class="nav-btn" disabled>&#8595;</button>
            </div>
            <div id="sticky-header" style="position: absolute; top: 0; left: 0; right: 0; height: 64px; display: flex; gap: 20px; padding: 10px 10px 0 10px; background: var(--vscode-editor-background); z-index: 50; box-sizing: border-box; overflow: hidden;">
                <div style="flex: 1; display: flex; flex-direction: column;">
                    <div id="title1" style="font-weight: bold; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">File 1</div>
                    <div id="header1"></div>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column;">
                    <div id="title2" style="font-weight: bold; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">File 2</div>
                    <div id="header2"></div>
                </div>
            </div>
            <div id="viewport">
                <div class="panel" id="panel1">
                    <div id="spacer1"></div>
                    <div id="content-wrapper1">
                        <div id="content1">Loading...</div>
                    </div>
                </div>
                <div class="panel" id="panel2">
                    <div id="spacer2"></div>
                    <div id="content-wrapper2">
                        <div id="content2">Loading...</div>
                    </div>
                </div>
            </div>
            <div id="status-bar">Differences: 0</div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                let totalBytes = 0;
                let loadedStartRow = -1;
                let isRequesting = false;
                let pendingRefresh = false;
                let currentTotalDiffs = 0;
                let diffRows = [];
                
                let chunk1 = [];
                let chunk2 = [];
                
                const BYTES_PER_ROW = 16;
                const ROW_HEIGHT = 24;
                const BUFFER_ROWS = 20;

                vscode.postMessage({ type: 'init' });

                document.getElementById('viewport').addEventListener('scroll', () => { requestVisible(); });

                function requestVisible(force = false) {
                    if (totalBytes === 0) return;
                    if (isRequesting && !force) { pendingRefresh = true; return; }
                    
                    const viewport = document.getElementById('viewport');
                    const scrollTop = viewport.scrollTop;
                    const viewHeight = viewport.clientHeight;
                    
                    // Update navigation highlighting based on scroll
                    if (diffRows.length > 0) {
                        updateNavButtons();
                    }
                    
                    const visibleStartRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
                    const visibleEndRow = visibleStartRow + Math.ceil(viewHeight / ROW_HEIGHT);
                    const maxRow = Math.ceil(totalBytes / BYTES_PER_ROW);

                    if (!force && loadedStartRow !== -1) {
                        const bufferTop = visibleStartRow - loadedStartRow;
                        const bufferBottom = (loadedStartRow + (chunk1.length / BYTES_PER_ROW)) - visibleEndRow;
                        if (bufferTop >= 5 && bufferBottom >= 5) return;
                    }

                    const fetchStartRow = Math.max(0, visibleStartRow - BUFFER_ROWS);
                    const fetchEndRow = Math.min(maxRow, visibleEndRow + BUFFER_ROWS);

                    isRequesting = true;
                    vscode.postMessage({ type: 'requestChunk', startOffset: fetchStartRow * BYTES_PER_ROW, endOffset: fetchEndRow * BYTES_PER_ROW });
                }

                window.addEventListener('message', e => {
                    const msg = e.data;
                    if (msg.type === 'metadata') {
                        totalBytes = msg.maxLength;
                        document.getElementById('title1').innerText = msg.uri1;
                        document.getElementById('title2').innerText = msg.uri2;
                        
                        document.getElementById('spacer1').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT + 60) + 'px';
                        document.getElementById('spacer2').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT + 60) + 'px';
                        currentTotalDiffs = msg.totalDiffs;
                        diffRows = msg.diffRows;
                        
                        document.getElementById('status-bar').innerText = 'Differences: ' + currentTotalDiffs;
                        
                        const stats = document.getElementById('diff-stats');
                        if (currentTotalDiffs === 0) {
                            stats.innerText = 'No changes detected';
                        } else {
                            stats.innerText = \`\${currentTotalDiffs} byte differences in total\`;
                        }
                        document.getElementById('floating-nav').style.display = 'flex';
                        updateNavButtons();
                        
                        document.getElementById('header1').innerHTML = '';
                        document.getElementById('header2').innerHTML = '';
                        document.getElementById('header1').appendChild(createHeaderRow());
                        document.getElementById('header2').appendChild(createHeaderRow());

                        requestVisible(true);
                    } else if (msg.type === 'diffChunk') {
                        chunk1 = msg.data1;
                        chunk2 = msg.data2;
                        loadedStartRow = msg.startOffset / BYTES_PER_ROW;
                        
                        // USING ESCAPED \$\{...\} so TS doesn't evaluate it
                        document.getElementById('content-wrapper1').style.transform = \`translateY(\$\{loadedStartRow * ROW_HEIGHT\}px)\`;
                        document.getElementById('content-wrapper2').style.transform = \`translateY(\$\{loadedStartRow * ROW_HEIGHT\}px)\`;
                        
                        render(msg.startOffset);
                        isRequesting = false;
                        if (pendingRefresh) { pendingRefresh = false; requestVisible(); }
                    }
                });

                // Binary search to find the nearest previous diff row
                function findPrevDiff(topRow) {
                    let left = 0, right = diffRows.length - 1;
                    let targetIdx = -1;
                    while (left <= right) {
                        const mid = (left + right) >> 1;
                        if (diffRows[mid] < topRow) {
                            targetIdx = mid;
                            left = mid + 1;
                        } else {
                            right = mid - 1;
                        }
                    }
                    return targetIdx;
                }

                // Binary search to find the nearest next diff row
                function findNextDiff(topRow) {
                    let left = 0, right = diffRows.length - 1;
                    let targetIdx = -1;
                    while (left <= right) {
                        const mid = (left + right) >> 1;
                        if (diffRows[mid] > topRow) {
                            targetIdx = mid;
                            right = mid - 1;
                        } else {
                            left = mid + 1;
                        }
                    }
                    return targetIdx;
                }

                function updateNavButtons() {
                    const viewport = document.getElementById('viewport');
                    const topRow = Math.ceil(viewport.scrollTop / ROW_HEIGHT);
                    const bottomRow = Math.floor((viewport.scrollTop + viewport.clientHeight) / ROW_HEIGHT) - 1;
                    
                    document.getElementById('btn-prev').disabled = findPrevDiff(topRow) === -1;
                    document.getElementById('btn-next').disabled = findNextDiff(bottomRow) === -1;
                }

                document.getElementById('btn-prev').addEventListener('click', () => {
                    const topRow = Math.ceil(document.getElementById('viewport').scrollTop / ROW_HEIGHT);
                    const idx = findPrevDiff(topRow);
                    if (idx !== -1) {
                        document.getElementById('viewport').scrollTop = diffRows[idx] * ROW_HEIGHT;
                        updateNavButtons();
                    }
                });

                document.getElementById('btn-next').addEventListener('click', () => {
                    const viewport = document.getElementById('viewport');
                    const bottomRow = Math.floor((viewport.scrollTop + viewport.clientHeight) / ROW_HEIGHT) - 1;
                    const idx = findNextDiff(bottomRow);
                    if (idx !== -1) {
                        document.getElementById('viewport').scrollTop = diffRows[idx] * ROW_HEIGHT;
                        updateNavButtons();
                    }
                });

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

                function createRow(data, otherData, i, baseOffset) {
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
                        const cell = document.createElement('div');
                        cell.className = 'cell';
                        
                        const charSpan = document.createElement('span');
                        charSpan.className = 'ascii-char';
                        
                        if (i + j < data.length && data[i+j] !== null) {
                            const val = data[i + j];
                            const otherVal = i + j < otherData.length ? otherData[i + j] : null;

                            cell.innerText = val.toString(16).padStart(2, '0');
                            
                            if (otherVal === null) {
                                cell.classList.add('added');
                                charSpan.classList.add('added');
                            }
                            else if (val !== otherVal) {
                                cell.classList.add('diff');
                                charSpan.classList.add('diff');
                            }
                            
                            charSpan.innerText = val >= 32 && val <= 126 ? String.fromCharCode(val) : '.';
                        } else {
                            cell.innerText = '  ';
                            charSpan.innerText = ' ';
                        }
                        hex.appendChild(cell);
                        ascii.appendChild(charSpan);
                    }
                    row.appendChild(hex);
                    row.appendChild(ascii);
                    
                    return row;
                }

                function render(baseOffset) {
                    const c1 = document.getElementById('content1');
                    const c2 = document.getElementById('content2');
                    c1.innerHTML = '';
                    c2.innerHTML = '';
                    
                    for (let i = 0; i < chunk1.length; i += BYTES_PER_ROW) {
                        c1.appendChild(createRow(chunk1, chunk2, i, baseOffset));
                        c2.appendChild(createRow(chunk2, chunk1, i, baseOffset));
                    }
                }
            </script>
        </body>
        </html>`;
    }
}
