import * as vscode from 'vscode';
import * as fs from 'fs';
import { getFileCommitHistory, getRepositoryForFile, getGitFileContentAsBuffer } from './gitHelper';
import { searchHexOrAscii, searchWebviewHtml } from './search';

export class HexDiffPanel {
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    
    private _data1: Uint8Array = new Uint8Array();
    private _data2: Uint8Array = new Uint8Array();
    public uri1: vscode.Uri;
    public uri2: vscode.Uri;
    private _dataReadyPromise!: Promise<void>;
    private _gitCommits1: any[] = [];
    private _gitCommits2: any[] = [];
    private _currentCommit1: string = 'HEAD';
    private _currentCommit2: string = 'HEAD';
    private _repo1: any;
    private _repo2: any;
    
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
        try {
            if (this.uri1.scheme === 'git') {
                this._repo1 = await getRepositoryForFile(this.uri2);
                if (this._repo1) {
                    this._gitCommits1 = await getFileCommitHistory(this.uri2, 100) || [];
                }
            } else {
                this._repo1 = await getRepositoryForFile(this.uri1);
                if (this._repo1) {
                    this._gitCommits1 = await getFileCommitHistory(this.uri1, 100) || [];
                }
                
                this._repo2 = await getRepositoryForFile(this.uri2);
                if (this._repo2) {
                    this._gitCommits2 = await getFileCommitHistory(this.uri2, 100) || [];
                }
            }
        } catch(e) {}

    }
    
    private getDiffRows(): number[] {
        const len = Math.max(this._data1.length, this._data2.length);
        const rows: number[] = [];
        const BYTES_PER_ROW = 16;
        for (let i = 0; i < len; i += BYTES_PER_ROW) {
            for (let j = 0; j < BYTES_PER_ROW; j++) {
                if (i + j >= len) {break;}
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
    
    private getDiffBlocks(): {start: number, end: number}[] {
        const len = Math.max(this._data1.length, this._data2.length);
        const blocks: {start: number, end: number}[] = [];
        let inBlock = false;
        let start = 0;
        for (let i = 0; i < len; i++) {
            const b1 = i < this._data1.length ? this._data1[i] : null;
            const b2 = i < this._data2.length ? this._data2[i] : null;
            if (b1 !== b2) {
                if (!inBlock) {
                    start = i;
                    inBlock = true;
                }
            } else {
                if (inBlock) {
                    blocks.push({ start, end: i - 1 });
                    inBlock = false;
                }
            }
        }
        if (inBlock) {
            blocks.push({ start, end: len - 1 });
        }
        return blocks;
    }
    
    private countDiffs(): number {
        const len = Math.max(this._data1.length, this._data2.length);
        let diffs = 0;
        for (let i = 0; i < len; i++) {
            const b1 = i < this._data1.length ? this._data1[i] : null;
            const b2 = i < this._data2.length ? this._data2[i] : null;
            if (b1 !== b2) {diffs++;}
        }
        return diffs;
    }
    
    private setupMessageListener() {
        this._panel.webview.onDidReceiveMessage(async message => {
            await this._dataReadyPromise; // Pause processing from webview until files are fully loaded!
            if (message.type === 'init') {
                const totalDiffs = this.countDiffs();
                const diffRows = this.getDiffRows();
                const diffBlocks = this.getDiffBlocks();
                this._panel.webview.postMessage({
                    type: 'metadata',
                    uri1: this.uri1.fsPath,
                    uri2: this.uri2.fsPath,
                    readonly1: this.uri1.scheme !== 'file',
                    readonly2: this.uri2.scheme !== 'file',
                    maxLength: Math.max(this._data1.length, this._data2.length),
                    totalDiffs: totalDiffs,
                    diffRows: diffRows,
                    diffBlocks: diffBlocks,
                    gitCommits1: this._gitCommits1.map(c => ({ hash: c.hash, message: c.message })),
                    gitCommits2: this._gitCommits2.map(c => ({ hash: c.hash, message: c.message })),
                    currentCommit1: this._currentCommit1,
                    currentCommit2: this._currentCommit2
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
            } else if (message.type === 'resolveBlock') {
                const blocks = this.getDiffBlocks();
                const rowStart = message.row * 16;
                const rowEnd = rowStart + 15;
                const startingBlocks = blocks.filter(b => b.start >= rowStart && b.start <= rowEnd);
                
                if (startingBlocks.length > 0) {
                    const block = startingBlocks[0]; // resolving the first block found
                    const isLeft = message.direction === 'left';
                    if (isLeft && this.uri1.scheme !== 'file') {return;}
                    if (!isLeft && this.uri2.scheme !== 'file') {return;}

                    const targetData = isLeft ? this._data1 : this._data2;
                    const sourceData = isLeft ? this._data2 : this._data1;
                    const uri = isLeft ? this.uri1 : this.uri2;
                    
                    const sourceSlice = [];
                    for (let i = block.start; i <= block.end; i++) {
                        if (i < sourceData.length) {sourceSlice.push(sourceData[i]);}
                    }
                    
                    const targetPrefix = targetData.subarray(0, Math.min(block.start, targetData.length));
                    const targetSuffix = block.end + 1 < targetData.length ? targetData.subarray(block.end + 1) : new Uint8Array(0);
                    
                    const newData = new Uint8Array(targetPrefix.length + sourceSlice.length + targetSuffix.length);
                    newData.set(targetPrefix, 0);
                    newData.set(new Uint8Array(sourceSlice), targetPrefix.length);
                    newData.set(targetSuffix, targetPrefix.length + sourceSlice.length);
                    
                    if (isLeft) {
                        this._data1 = newData;
                    } else {
                        this._data2 = newData;
                    }
                    
                    // Fire-and-forget save
                    vscode.workspace.fs.writeFile(uri, newData).then(() => {
                        // Tell frontend to re-init
                        this._panel.webview.postMessage({ type: 'init' });
                    });
                }
            } else if (message.type === 'changeCommit') {
                const isLeft = message.direction === 'left';
                const hash = message.hash;
                try {
                    if (isLeft) {
                        this._currentCommit1 = hash;
                    } else {
                        this._currentCommit2 = hash;
                    }
                    if (hash === 'HEAD') {
                        if (isLeft) {
                            const buf = await vscode.workspace.fs.readFile(this.uri1);
                            this._data1 = new Uint8Array(buf);
                        } else {
                            const buf = await vscode.workspace.fs.readFile(this.uri2);
                            this._data2 = new Uint8Array(buf);
                        }
                    } else {
                        if (isLeft) {
                            const fsPath = this.uri1.scheme === 'git' ? this.uri2.fsPath : this.uri1.fsPath;
                            const repoRoot = this._repo1.rootUri.fsPath;
                            const buf = await getGitFileContentAsBuffer(repoRoot, hash, fsPath);
                            this._data1 = new Uint8Array(buf);
                        } else {
                            const fsPath = this.uri2.fsPath;
                            const repoRoot = this._repo2.rootUri.fsPath;
                            const buf = await getGitFileContentAsBuffer(repoRoot, hash, fsPath);
                            this._data2 = new Uint8Array(buf);
                        }
                    }
                    this._panel.webview.postMessage({ type: 'init' });
                } catch (e) {
                    vscode.window.showErrorMessage('Failed to load commit data: ' + e);
                }
            } else if (message.type === 'search') {
                const results1 = searchHexOrAscii(message.query, message.searchType, this._data1);
                const results2 = searchHexOrAscii(message.query, message.searchType, this._data2);
                
                const matches = new Set([...results1, ...results2]);
                const results = Array.from(matches).sort((a, b) => a - b);
                
                this._panel.webview.postMessage({
                    type: 'searchResult',
                    matches: results,
                    matchLength: message.searchType === 'hex' ? message.query.replace(/\s/g, '').length / 2 : message.query.length
                });
            }
        });
    }

    public dispose() {
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {x.dispose();}
        }
    }
    
    private _getWebviewContent(): string {
        const config = vscode.workspace.getConfiguration('hexdiff');
        const themeOption = config.get<string>('theme') || 'Auto';
        const fontFam = config.get<string>('fontFamily') || "'Courier New', monospace";
        
        let diffStyles = '';
        if (themeOption === 'Light') {
            diffStyles = `
                .diff { background: rgba(255, 0, 0, 0.2) !important; font-weight: bold; }
                .added { background: rgba(0, 255, 0, 0.2) !important; font-weight: bold; }
            `;
        } else if (themeOption === 'Dark') {
            diffStyles = `
                .diff { background: rgba(255, 0, 0, 0.4) !important; font-weight: bold; }
                .added { background: rgba(0, 255, 0, 0.3) !important; font-weight: bold; }
            `;
        } else {
            diffStyles = `
                .diff { background: var(--vscode-diffEditor-removedTextBackground) !important; color: inherit; font-weight: bold; }
                .added { background: var(--vscode-diffEditor-insertedTextBackground) !important; color: inherit; font-weight: bold; }
                body.vscode-high-contrast .diff, body.vscode-high-contrast .added { outline: 1px solid var(--vscode-contrastActiveBorder); }
                body.vscode-high-contrast-light .diff, body.vscode-high-contrast-light .added { outline: 1px solid var(--vscode-contrastActiveBorder); }
            `;
        }

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hex Diff</title>
            <style>
                body { font-family: ${fontFam}; padding: 0; margin: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); overflow: hidden; }
                .search-match { background: var(--vscode-editor-findMatchBackground) !important; outline: 1px solid var(--vscode-editor-findMatchBorder); }
                .search-active { background: var(--vscode-editor-findMatchHighlightBackground) !important; outline: 1px solid var(--vscode-editor-findMatchHighlightBorder); }
                #search-widget { position: absolute; top: 10px; right: 20px; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); box-shadow: 0 0 8px var(--vscode-widget-shadow); padding: 6px; z-index: 1000; display: flex; align-items: center; gap: 6px; border-radius: 4px; }
                #search-widget input[type="text"] { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 4px; outline: none; width: 200px; }
                #search-widget input[type="text"]:focus { border-color: var(--vscode-focusBorder); }
                #search-widget select { background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); padding: 3px; outline: none; }
                #search-widget button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 4px 8px; cursor: pointer; }
                #search-widget button:hover { background: var(--vscode-button-secondaryHoverBackground); }
                .search-count { font-size: 12px; min-width: 50px; text-align: center; }
                #viewport { position: absolute; top: 60px; left: 0; right: 0; bottom: 30px; overflow-y: auto; overflow-x: auto; padding: 0 10px 0 10px; box-sizing: border-box; display: flex; gap: 0; align-items: flex-start; flex-wrap: nowrap; }
                .panel-container { display: flex; min-width: max-content; flex: 1 0 auto; overflow: visible; }
                .panel-container:first-child { padding-right: 20px; }
                .panel-container:last-child { padding-left: 20px; }
                .panel { flex: 1 0 auto; position: relative; min-width: max-content; }
                .center-panel { flex: 0 0 60px; position: relative; border-left: 1px solid var(--vscode-editorGroup-border); border-right: 1px solid var(--vscode-editorGroup-border); background: var(--vscode-editorWidget-background); z-index: 10; overflow: visible; }
                #spacer1, #spacer-center, #spacer2 { width: 1px; visibility: hidden; }
                #content-wrapper1, #content-wrapper-center, #content-wrapper2 { position: absolute; top: 0; left: 0; right: 0; }
                .row { display: flex; height: 24px; align-items: center; box-sizing: border-box; }
                .action-row { height: 24px; width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 0 2px; }
                .action-btn { background: transparent; color: var(--vscode-button-secondaryForeground); border: 1px solid transparent; cursor: pointer; padding: 0 4px; font-size: 12px; border-radius: 2px; height: 18px; line-height: 16px; min-width: 18px; text-align: center; font-weight: bold; }
                .action-btn:hover { background: var(--vscode-button-secondaryHoverBackground); border-color: var(--vscode-focusBorder); }
                .action-count { font-size: 11px; color: var(--vscode-descriptionForeground); user-select: none; width: 12px; text-align: center; }
                .offset { color: var(--vscode-editorLineNumber-foreground); margin-right: 15px; user-select: none; width: 8ch; }
                .hex { margin-right: 15px; display: flex; gap: 5px; }
                .ascii { color: var(--vscode-editorCodeLens-foreground); white-space: pre; }
                .cell { width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 2px; text-transform: lowercase; border: 1px solid transparent; box-sizing: border-box; }
                ${diffStyles}
                #status-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 30px; padding: 0 15px; background: var(--vscode-statusBar-background); color: var(--vscode-statusBar-foreground); font-size: 12px; display: flex; align-items: center; justify-content: flex-end; z-index: 100; }
                #floating-nav {                      position: fixed;                      bottom: 50px;                      right: 40px;                      z-index: 1000;                      background: var(--vscode-editorWidget-background);                      border: 1px solid var(--vscode-editorWidget-border);                      padding: 8px 16px;                      border-radius: 20px;                      box-shadow: 0 4px 12px var(--vscode-widget-shadow);                      display: flex;                      align-items: center;                      gap: 12px;                      opacity: 0.5;                      transition: opacity 0.2s ease, box-shadow 0.2s ease;                      backdrop-filter: blur(4px);                  }                 #floating-nav:hover { opacity: 1; box-shadow: 0 6px 16px var(--vscode-widget-shadow); }
                .nav-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px; padding: 4px 8px; cursor: pointer; }
                .nav-btn:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
                .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                #diff-stats { font-weight: bold; }
            </style>
        </head>
        <body>
            ${searchWebviewHtml()}
            <div id="floating-nav" style="display: none;">
                <span id="diff-stats">Loading...</span>
                <button id="btn-prev" class="nav-btn" disabled>&#8593;</button>
                <button id="btn-next" class="nav-btn" disabled>&#8595;</button>
            </div>
            <div id="sticky-header" style="position: absolute; top: 0; left: 0; right: 0; height: 60px; display: flex; align-items: stretch; gap: 0; padding: 6px 10px 0 10px; background: var(--vscode-editor-background); z-index: 50; box-sizing: border-box; overflow-x: hidden; overflow-y: hidden; flex-wrap: nowrap;">
                <div style="flex: 1 0 auto; display: flex; flex-direction: column; min-width: max-content; padding-right: 20px;">
                    <div id="title1" style="font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">File 1</div>
                    <div id="header1"></div>
                </div>
                <div style="flex: 0 0 60px; border-left: 1px solid transparent; border-right: 1px solid transparent;"></div>
                <div style="flex: 1 0 auto; display: flex; flex-direction: column; min-width: max-content; padding-left: 20px;">
                    <div id="title2" style="font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">File 2</div>
                    <div id="header2"></div>
                </div>
            </div>
            <div id="viewport">
                <div class="panel-container">
                    <div class="panel" id="panel1">
                        <div id="spacer1"></div>
                        <div id="content-wrapper1">
                            <div id="content1">Loading...</div>
                        </div>
                    </div>
                </div>
                <div class="panel center-panel" id="center-panel">
                    <div id="spacer-center"></div>
                    <div id="content-wrapper-center">
                        <div id="content-center"></div>
                    </div>
                </div>
                <div class="panel-container">
                    <div class="panel" id="panel2">
                        <div id="spacer2"></div>
                        <div id="content-wrapper2">
                            <div id="content2">Loading...</div>
                        </div>
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
                let diffBlocks = [];
                let isReadonly1 = false;
                let isReadonly2 = false;
                
                let chunk1 = [];
                let chunk2 = [];
                
                const BYTES_PER_ROW = 16;
                const ROW_HEIGHT = 24;
                const BUFFER_ROWS = 20;

                let searchMatches = [];
                let searchMatchLength = 0;
                let currentMatchIndex = 0;
                let searchQuery = "";
                
                vscode.postMessage({ type: 'init' });

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

                document.getElementById('viewport').addEventListener('scroll', (e) => { 
                    document.getElementById('sticky-header').scrollLeft = e.target.scrollLeft;
                    requestVisible(); 
                });

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
                    
                    const maxRow = Math.ceil(totalBytes / BYTES_PER_ROW);
                    const visibleStartRow = Math.max(0, Math.min(Math.floor(scrollTop / ROW_HEIGHT), maxRow));
                    const visibleEndRow = Math.min(maxRow, visibleStartRow + Math.ceil(viewHeight / ROW_HEIGHT));

                    if (!force && loadedStartRow !== -1) {
                        const bufferTop = visibleStartRow - loadedStartRow;
                        const bufferBottom = (loadedStartRow + (Math.max(chunk1.length, chunk2.length) / BYTES_PER_ROW)) - visibleEndRow;
                        if (bufferTop >= 5 && bufferBottom >= 5) return;
                    }

                    const fetchStartRow = Math.max(0, visibleStartRow - BUFFER_ROWS);
                    const fetchEndRow = Math.min(maxRow, visibleEndRow + BUFFER_ROWS);

                    isRequesting = true;
                    // loadedStartRow MUST NOT be set strictly here before data arrives or scrolling will jump
                    vscode.postMessage({ type: 'requestChunk', startOffset: fetchStartRow * BYTES_PER_ROW, endOffset: Math.min(totalBytes, fetchEndRow * BYTES_PER_ROW) });
                }

                function renderHeaderDropdown(direction, commits, currentCommit) {
                if (!commits || commits.length === 0) return '';
                let options = \`<option value="HEAD" \$\{currentCommit === 'HEAD' ? 'selected' : ''\}>Local / HEAD</option>\`;
                commits.forEach(c => {
                    options += \`<option value="\$\{c.hash\}" \$\{currentCommit === c.hash ? 'selected' : ''\}>\$\{c.hash.substring(0,7)\} - \$\{c.message\}</option>\`;
                });
                return \`<select style="margin-right: 10px; padding: 4px 8px; border-radius: 4px; width: auto; max-width: 250px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); outline: none; cursor: pointer; vertical-align: middle; text-overflow: ellipsis;" onchange="vscode.postMessage({ type: 'changeCommit', direction: '\$\{direction\}', hash: this.value })">\$\{options\}</select>\`;
            }

            window.addEventListener('message', e => {
                    const msg = e.data;
                    if (msg.type === 'metadata') {
                        totalBytes = msg.maxLength;
                        document.getElementById('title1').innerHTML = renderHeaderDropdown('left', msg.gitCommits1, msg.currentCommit1) + '<span style="vertical-align: middle;">' + msg.uri1 + '</span>';
                        document.getElementById('title2').innerHTML = renderHeaderDropdown('right', msg.gitCommits2, msg.currentCommit2) + '<span style="vertical-align: middle;">' + msg.uri2 + '</span>';
                        
                        document.getElementById('spacer1').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT + 80) + 'px';
                        document.getElementById('spacer2').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT + 80) + 'px';
                        document.getElementById('spacer-center').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT + 80) + 'px';
                        currentTotalDiffs = msg.totalDiffs;
                        diffRows = msg.diffRows;
                        diffBlocks = msg.diffBlocks || [];
                        isReadonly1 = msg.readonly1 || false;
                        isReadonly2 = msg.readonly2 || false;
                        
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
                        document.getElementById('content-wrapper-center').style.transform = \`translateY(\$\{loadedStartRow * ROW_HEIGHT\}px)\`;
                        document.getElementById('content-wrapper2').style.transform = \`translateY(\$\{loadedStartRow * ROW_HEIGHT\}px)\`;
                        
                        render(msg.startOffset);
                        isRequesting = false;
                        if (pendingRefresh) { pendingRefresh = false; requestVisible(); }
                    } else if (msg.type === 'init') {
                        vscode.postMessage({ type: 'init' });
                    } else if (msg.type === 'searchResult') {
                        searchMatches = msg.matches;
                        searchMatchLength = msg.matchLength || 0;
                        currentMatchIndex = 0;
                        updateSearchCount();
                        if (searchMatches.length > 0) {
                            scrollToMatch(currentMatchIndex);
                        } else {
                            if (searchQuery) alert('No matches found for: ' + searchQuery);
                        }
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

                function createActionRow(i, baseOffset) {
                    const row = document.createElement('div');
                    row.className = 'action-row';
                    const rowIndex = (baseOffset + i) / BYTES_PER_ROW;
                    const rowStart = rowIndex * BYTES_PER_ROW;
                    const rowEnd = rowStart + 15;
                    
                    let startingBlocks = 0;
                    for (const b of diffBlocks) {
                        if (b.start >= rowStart && b.start <= rowEnd) startingBlocks++;
                    }
                    
                    if (startingBlocks > 0) {
                        const btnLeft = document.createElement('button');
                        btnLeft.className = 'action-btn';
                        btnLeft.innerHTML = '&#8592;';
                        btnLeft.title = 'Copy from right to file left';
                        btnLeft.onclick = () => { vscode.postMessage({ type: 'resolveBlock', direction: 'left', row: rowIndex }); };
                        if (isReadonly1) {
                            btnLeft.style.visibility = 'hidden';
                        }
                        
                        const countSpan = document.createElement('span');
                        countSpan.className = 'action-count';
                        countSpan.innerText = startingBlocks > 1 ? startingBlocks : '';
                        
                        const btnRight = document.createElement('button');
                        btnRight.className = 'action-btn';
                        btnRight.innerHTML = '&#8594;';
                        btnRight.title = 'Copy from left to file right';
                        btnRight.onclick = () => { vscode.postMessage({ type: 'resolveBlock', direction: 'right', row: rowIndex }); };
                        if (isReadonly2) {
                            btnRight.style.visibility = 'hidden';
                        }
                        
                        row.appendChild(btnLeft);
                        if (startingBlocks > 1) {
                            row.appendChild(countSpan);
                        } else {
                            const spacer = document.createElement('span');
                            spacer.style.width = '12px';
                            spacer.style.display = 'inline-block';
                            row.appendChild(spacer);
                        }
                        row.appendChild(btnRight);
                    }
                    
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
                        
                        if (i + j < data.length && data[i+j] !== null && data[i+j] !== undefined) {
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
                            
                            // Highlight search matches
                            if (searchMatches && searchMatches.length > 0) {
                                const globalOffset = baseOffset + i + j;
                                const activeStart = searchMatches[currentMatchIndex];
                                const activeEnd = activeStart + searchMatchLength;

                                const isMatch = searchMatches.some(m => globalOffset >= m && globalOffset < m + searchMatchLength);
                                if (isMatch) {
                                    cell.classList.add('search-match');
                                    charSpan.classList.add('search-match');
                                }
                                if (globalOffset >= activeStart && globalOffset < activeEnd) {
                                    cell.classList.add('search-active');
                                    charSpan.classList.add('search-active');
                                }
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
                    const c_center = document.getElementById('content-center');
                    c1.innerHTML = '';
                    c2.innerHTML = '';
                    c_center.innerHTML = '';
                    
                    let rowIndex = loadedStartRow;
                    const len = Math.max(chunk1.length, chunk2.length);
                    for (let i = 0; i < len; i += BYTES_PER_ROW) {
                        const row1 = createRow(chunk1, chunk2, i, baseOffset);
                        const row2 = createRow(chunk2, chunk1, i, baseOffset);
                        const actionRow = createActionRow(i, baseOffset);
                        
                        row1.style.background = 'var(--vscode-editor-background)';
                        row2.style.background = 'var(--vscode-editor-background)';
                        
                        c1.appendChild(row1);
                        c2.appendChild(row2);
                        c_center.appendChild(actionRow);
                        
                        rowIndex++;
                    }
                }

                // Synchronize scrollbar width between viewport and header mathematically
                const resizeObserver = new ResizeObserver(() => {
                    const viewport = document.getElementById('viewport');
                    const header = document.getElementById('sticky-header');
                    if (viewport && header) {
                        const scrollbarWidth = viewport.offsetWidth - viewport.clientWidth;
                        // Based on initialized padding 10px from CSS and HTML style tag
                        header.style.paddingRight = (10 + scrollbarWidth) + 'px';
                    }
                });
                const viewEl = document.getElementById('viewport');
                if (viewEl) {
                    resizeObserver.observe(viewEl);
                    // Trigger manually once on load
                    const initialScrollbarWidth = viewEl.offsetWidth - viewEl.clientWidth;
                    document.getElementById('sticky-header').style.paddingRight = (10 + initialScrollbarWidth) + 'px';
                }
            </script>
        </body>
        </html>`;
    }
}
