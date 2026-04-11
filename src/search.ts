export function searchHexOrAscii(query: string, type: 'hex' | 'ascii', data: Uint8Array): number[] {
    const bytes: number[] = [];
    if (type === 'hex') {
        const hex = query.replace(/\s/g, '');
        if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
            return []; // Invalid hex
        }
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substring(i, i + 2), 16));
        }
    } else {
        for (let i = 0; i < query.length; i++) {
            bytes.push(query.charCodeAt(i));
        }
    }
    if (bytes.length === 0) {return [];}

    const matches: number[] = [];
    const patternLength = bytes.length;
    for (let i = 0; i <= data.length - patternLength; i++) {
        let match = true;
        for (let j = 0; j < patternLength; j++) {
            if (data[i + j] !== bytes[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            matches.push(i);
        }
    }
    return matches;
}

export function searchWebviewHtml(): string {
    return `
            <div id="search-widget" style="display: none;">
                <select id="search-type">
                    <option value="hex">Hex</option>
                    <option value="ascii">ASCII</option>
                </select>
                <input type="text" id="search-input" placeholder="Search..." />
                <span id="search-count" class="search-count">0/0</span>
                <button id="search-prev" class="nav-btn">&#8593;</button>
                <button id="search-next" class="nav-btn">&#8595;</button>
                <button id="search-close" class="nav-btn">X</button>
            </div>
    `;
}
