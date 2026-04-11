"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
src;
hexDiffPanel.ts;
350;
body;
{
    font - family;
    $;
    {
        fontFam;
    }
    ;
    paddi;
    ng: 0;
    margin: 0;
    background: var ;
    (--vscode - editor - background);
    color: var ;
    (--vsc);
    ode - editor - foreground;
    ;
    overflow: hidden;
}
src;
hexDiffPanel.ts;
351;
search - match;
{
    background: var ;
    (--vsc);
    ode - editor - findMatchBackground;
    !important;
    outline: 1;
    px;
    solid;
    var ;
    (--vscode - edi);
    tor - findMatchBorder;
    ;
}
src;
hexDiffPanel.ts;
352;
search - active;
{
    background: var ;
    (--vs);
    code - editor - findMatchHighlightBackground;
    !important;
    outline: 1;
    px;
    solid;
    var ;
    (--vscode - editor - findMatchHighlightBorder);
}
    > src;
hexDiffPanel.ts;
353;
#search - widget;
{
    position: absolute;
    top: 10;
    px;
    right: 20;
    px;
    background: var ;
    (--vscode - editorWidget - background);
    bord;
    er: 1;
    px;
    solid;
    var ;
    (--vscode - editorWidget - border);
    box - shadow;
    0;
    0;
    8;
    px;
    var ;
    (--vsco);
    de - widget - shadow;
    ;
    padding: 6;
    px;
    z - index;
    1000;
    display: flex;
    align - items;
    cen;
    ter;
    gap: 6;
    px;
    border - radius;
    4;
    px;
}
src;
hexDiffPanel.ts;
354;
#search - widget;
input[type = "text"];
{
    b;
    ackground: var ;
    (--vscode - input - background);
    color: var ;
    (--vscode - input - foreground);
    border: 1;
    px;
    solid;
    var ;
    (--vscode - input - border);
    padding: 4;
    px;
    outline: none;
    w;
    idth: 200;
    px;
}
src;
hexDiffPanel.ts;
355;
#search - widget;
input[type = "text"];
foc;
us;
{
    border - color;
    var ;
    (--vscode - focusBorder);
}
src;
hexDiffPanel.ts;
356;
#search - widget;
select;
{
    background: v;
    ar(--vscode - dropdown - background);
    color: var ;
    (--vscode - dropdown - foreground);
    bor;
    der: 1;
    px;
    solid;
    var ;
    (--vscode - dropdown - border);
    padding: 3;
    px;
    outline: none;
}
src;
hexDiffPanel.ts;
357;
#search - widget;
button;
{
    background: v;
    ar(--vscode - button - secondaryBackground);
    color: var ;
    (--vscode - button - secondaryFo);
    reground;
    ;
    border: none;
    padding: 4;
    px;
    8;
    px;
    cursor: pointer;
}
src;
hexDiffPanel.ts;
358;
#search - widget;
button: hover;
{
    backgro;
    und: var ;
    (--vscode - button - secondaryHoverBackground);
}
    > src;
hexDiffPanel.ts;
359;
search - count;
{
    font - size;
    12;
    px;
    min -
        width;
    50;
    px;
    text - align;
    center;
}
    > src;
hexDiffPanel.ts;
360;
#viewport;
{
    position: absolute;
    top: 84;
    px;
    left: 0;
    right: 0;
    bottom: 30;
    px;
    overflow - y;
    auto;
    overflow - x;
    auto;
    padd;
    ing: 0;
    10;
    px;
    10;
    px;
    10;
    px;
    box - sizing;
    border - box;
    display: flex;
    gap: 10;
    px;
    align -
        items;
    stretch;
    min - width;
    max - content;
}
    > src;
hexDiffPanel.ts;
361;
panel - container;
{
    display: flex;
    min
        - width;
    max - content;
    flex: 1;
    overflow: visible;
    padding - left;
    10;
    px;
}
    > src;
hexDiffPanel.ts;
362;
panel;
{
    flex: 1;
    position: relative;
    min - width;
    max - content;
}
    > src;
hexDiffPanel.ts;
363;
center - panel;
{
    flex: 0;
    0;
    60;
    px;
    posit;
    ion: relative;
    display: flex;
    flex - direction;
    column;
    align - items;
    center;
    bord;
    er - left;
    1;
    px;
    solid;
    var ;
    (--vscode - editorGroup - border);
    border - right;
    1;
    px;
    solid;
    va;
    r(--vscode - editorGroup - border);
    z - index;
    10;
    overflow: visible;
    margin - left;
    10;
    px;
    margin - right;
    10;
    px;
}
    > src;
hexDiffPanel.ts;
364;
#spacer1, #spacer - center, #spacer2;
{
    width: 1;
    px;
    visibility: hidden;
}
    > src;
hexDiffPanel.ts;
365;
#content - wrapper1, #content - wrapper - c;
enter, #content - wrapper2;
{
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
}
    > src;
hexDiffPanel.ts;
366;
row;
{
    display: flex;
    height: 24;
    px;
    a;
    lign - items;
    center;
    box - sizing;
    border - box;
}
    > src;
hexDiffPanel.ts;
367;
action - row;
{
    height: 24;
    px;
    width: 10;
    0 % ;
    box - sizing;
    border - box;
    display: flex;
    align - items;
    center;
    justify - content;
    center;
    gap: 4;
    px;
    padding: 0;
    2;
    px;
}
    > src;
hexDiffPanel.ts;
368;
action - btn;
{
    background: transparent;
    color: var ;
    (--vscode - button - secondaryForeground);
    border: 1;
    px;
    solid;
    transparen;
    t;
    cursor: pointer;
    padding: 0;
    4;
    px;
    font - size;
    12;
    px;
    border - radius;
    2;
    px;
    height: 18;
    px;
    line - height;
    16;
    px;
    min - width;
    18;
    px;
    text - align;
    center;
    font - weight;
    bo;
    ld;
}
src;
hexDiffPanel.ts;
369;
action - btn;
hover;
{
    background: var ;
    (- -vscode - button - secondaryHoverBackground);
    border - color;
    var ;
    (--vscode - focusBorde);
    r;
    ;
}
    > src;
hexDiffPanel.ts;
370;
action - count;
{
    font - size;
    11;
    px;
    colo;
    r: var ;
    (--vscode - descriptionForeground);
    user - select;
    none;
    width: 12;
    px;
    text - al;
    ign: center;
}
src;
hexDiffPanel.ts;
371;
offset;
{
    color: var ;
    (--vscode - editorL);
    ineNumber - foreground;
    ;
    margin - right;
    15;
    px;
    user - select;
    none;
    width: 8;
    ch;
}
    > src;
hexDiffPanel.ts;
372;
hex;
{
    margin - right;
    15;
    px;
    display: f;
    lex;
    gap: 5;
    px;
}
src;
hexDiffPanel.ts;
373;
ascii;
{
    color: var ;
    (--vscode - editorCo);
    deLens - foreground;
    ;
    white - space;
    pre;
}
    > src;
hexDiffPanel.ts;
374;
cell;
{
    width: 24;
    px;
    height: 24;
    px;
    li;
    ne - height;
    24;
    px;
    text - align;
    center;
    border - radius;
    2;
    px;
    text - transform;
    lowerc;
    ase;
    border: 1;
    px;
    solid;
    transparent;
    box - sizing;
    border - box;
}
src;
hexDiffPanel.ts;
375;
$;
{
    diffStyles;
}
    > src;
hexDiffPanel.ts;
376;
#status - bar;
{
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30;
    px;
    padding: 0;
    15;
    px;
    background: var ;
    (--vscode
        - statusBar - background);
    color: var ;
    (--vscode - statusBar - foreground);
    font - size;
    1;
    2;
    px;
    display: flex;
    align - items;
    center;
    justify - content;
    flex - end;
    z - index;
    10;
    0;
}
    > src;
hexDiffPanel.ts;
377;
#floating - nav;
{
    position: fixed;
    bottom: 50;
    px;
    right: 40;
    px;
    z - index;
    1000;
    background: var ;
    (--vscode - editorWidget - background);
    border: 1;
    px;
    solid;
    var ;
    (--vscode - editorWidget - border);
    padding: 8;
    px;
    16;
    px;
    border - radius;
    20;
    px;
    box - shadow;
    0;
    4;
    px;
    12;
    px;
    v;
    ar(--vscode - widget - shadow);
    display: flex;
    align - items;
    center;
    gap: 12;
    px;
    opacity: 0.5;
    transition: opacity;
    0.2;
    s;
    ease, box - shadow;
    0;
    .2;
    s;
    ease;
    backdrop - filter;
    blur(4, px);
}
#floating - nav;
hover;
{
    opacity: 1;
    box - shadow;
    0;
    6;
    px;
    16;
    px;
    var ;
    (--v);
    scode - widget - shadow;
    ;
}
src;
hexDiffPanel.ts;
378;
nav - btn;
{
    background: var ;
    (--vscode - b);
    utton - background;
    ;
    color: var ;
    (--vscode - button - foreground);
    border: none;
    border
        - radius;
    2;
    px;
    padding: 4;
    px;
    8;
    px;
    cursor: pointer;
}
src;
hexDiffPanel.ts;
379;
nav - btn;
hover: not(disabled);
{
    backg;
    round: var ;
    (--vscode - button - hoverBackground);
}
src;
hexDiffPanel.ts;
380;
nav - btn;
disabled;
{
    opacity: 0.5;
    cur;
    sor: not - allowed;
}
src;
hexDiffPanel.ts;
388;
id;
"btn-prev";
class {
}
"nav-btn";
disabled >  & #;
8593;
/button>;
src;
hexDiffPanel.ts;
389;
id;
"btn-next";
class {
}
"nav-btn";
disabled >  & #;
8595;
/button>;
src;
hexDiffPanel.ts;
390;
/div>
    > src;
hexDiffPanel.ts;
391;
id;
"sticky-header";
style = "position: ;
absolute;
top: 0;
left: 0;
right: 0;
height: 84;
px;
display: flex;
align - items;
stretch;
gap: 20;
px;
padding: 10;
px;
10;
px;
0;
10;
px;
background: var ;
(--vscode - editor -
    background);
z - index;
50;
box - sizing;
border - box;
overflow: hidden;
min - width;
max - content;
">
    > src;
hexDiffPanel.ts;
392;
style;
"flex: 1; display: flex; f;
lex - direction;
column;
min - width;
400;
px;
padding - left;
10;
px;
">;
src;
hexDiffPanel.ts;
393;
id;
"title1";
style = "font-weig;
ht: bold;
margin - bottom;
10;
px;
white - space;
nowrap;
overflow: hidden;
text - over;
flow: ellipsis;
">File 1</div>;
src;
hexDiffPanel.ts;
394;
id;
"header1" > /div>;
src;
hexDiffPanel.ts;
395;
/div>
    > src;
hexDiffPanel.ts;
396;
style;
"flex: 0 0 60px;" > /div>
    > src;
hexDiffPanel.ts;
397;
style;
"flex: 1; display: flex; f;
lex - direction;
column;
min - width;
400;
px;
padding - left;
10;
px;
">;
src;
hexDiffPanel.ts;
398;
id;
"title2";
style = "font-weig;
ht: bold;
margin - bottom;
10;
px;
white - space;
nowrap;
overflow: hidden;
text - over;
flow: ellipsis;
">File 2</div>;
src;
hexDiffPanel.ts;
399;
id;
"header2" > /div>;
src;
hexDiffPanel.ts;
400;
/div>;
src;
hexDiffPanel.ts;
408;
/div>;
src;
hexDiffPanel.ts;
409;
/div>;
src;
hexDiffPanel.ts;
410;
/div>
    > src;
hexDiffPanel.ts;
411;
class {
};
"panel center-panel";
id = "c;
enter - panel;
">
    > src;
hexDiffPanel.ts;
412;
id;
"spacer-center" > /div>
    > src;
hexDiffPanel.ts;
413;
id;
"content-wrapper-center" >
    > src;
hexDiffPanel.ts;
414;
id;
"content-center" > /di;
v >
    src;
hexDiffPanel.ts;
415;
/div>;
src;
hexDiffPanel.ts;
416;
/div>;
src;
hexDiffPanel.ts;
417;
class {
};
"panel-container" >
    src;
hexDiffPanel.ts;
457;
if (e.ctrlKey && e.key === 'f') {
    src;
    hexDiffPanel.ts;
    458;
    e.preventDefault();
    src;
    hexDiffPanel.ts;
    459;
    const widget = document.getEl;
    ementById('search-widget');
        > src;
    hexDiffPanel.ts;
    460;
    widget.style.display = widget
        .style.display === 'none' ? 'flex' : 'none';
        > src;
    hexDiffPanel.ts;
    461;
    if (widget.style.display ===
        'flex') {
        src;
        hexDiffPanel.ts;
        462;
        document.getElementById(', search - input, ').focus();, src, hexDiffPanel.ts, 463, document.getElementById(', search - input, ').select();, src, hexDiffPanel.ts, 464));
    }
    src;
    hexDiffPanel.ts;
    580;
    src;
    hexDiffPanel.ts;
    581;
    document.getElementById('spac, er1, ').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT + 80) 
        + 'px');
    src;
    hexDiffPanel.ts;
    582;
    document.getElementById('spac, er2, ').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT + 80) 
        + 'px');
        > src;
    hexDiffPanel.ts;
    583;
    document.getElementById('spac, er - center, ').style.height = (Math.ceil(totalBytes / BYTES_PER_ROW) * ROW_HEIGHT 
        + 80) + 'px';
    src;
    hexDiffPanel.ts;
    584;
    currentTotalDiffs = msg.total;
    Diffs;
    src;
    hexDiffPanel.ts;
    585;
    diffRows = msg.diffRows;
    src;
    hexDiffPanel.ts;
    586;
    diffBlocks = msg.diffBlocks |
        | [];
    src;
    hexDiffPanel.ts;
    595;
}
else {
    src;
    hexDiffPanel.ts;
    596;
    stats.innerText = ;
    `\${cu
rrentTotalDiffs} byte differences in total\`;
  src\hexDiffPanel.ts:597:                        }
> src\hexDiffPanel.ts:598:                        document.getElementById('floa
ting-nav').style.display = 'flex';
  src\hexDiffPanel.ts:599:                        updateNavButtons();
  src\hexDiffPanel.ts:600:                        
  src\hexDiffPanel.ts:601:                        document.getElementById('head
er1').innerHTML = '';
  src\hexDiffPanel.ts:611:                        
  src\hexDiffPanel.ts:612:                        // USING ESCAPED \$\{...\} so
 TS doesn't evaluate it
  src\hexDiffPanel.ts:613:                        document.getElementById('cont
ent-wrapper1').style.transform = \`translateY(\$\{loadedStartRow * ROW_HEIGHT\}
px)\`;
> src\hexDiffPanel.ts:614:                        document.getElementById('cont
ent-wrapper-center').style.transform = \`translateY(\$\{loadedStartRow * ROW_HE
IGHT\}px)\`;
  src\hexDiffPanel.ts:615:                        document.getElementById('cont
ent-wrapper2').style.transform = \`translateY(\$\{loadedStartRow * ROW_HEIGHT\}
px)\`;
  src\hexDiffPanel.ts:616:                        
  src\hexDiffPanel.ts:617:                        render(msg.startOffset);
  src\hexDiffPanel.ts:842:                function render(baseOffset) {
  src\hexDiffPanel.ts:843:                    const c1 = document.getElementByI
d('content1');
  src\hexDiffPanel.ts:844:                    const c2 = document.getElementByI
d('content2');
> src\hexDiffPanel.ts:845:                    const c_center = document.getElem
entById('content-center');
  src\hexDiffPanel.ts:846:                    c1.innerHTML = '';
  src\hexDiffPanel.ts:847:                    c2.innerHTML = '';
> src\hexDiffPanel.ts:848:                    c_center.innerHTML = '';
  src\hexDiffPanel.ts:849:                    
  src\hexDiffPanel.ts:850:                    let rowIndex = loadedStartRow;
  src\hexDiffPanel.ts:851:                    const len = Math.max(chunk1.lengt
h, chunk2.length);
  src\hexDiffPanel.ts:854:                        const row2 = createRow(chunk2
, chunk1, i, baseOffset);
  src\hexDiffPanel.ts:855:                        const actionRow = createActio
nRow(i, baseOffset);
  src\hexDiffPanel.ts:856:                        
> src\hexDiffPanel.ts:857:                        // Action row needs special c
enter styling
  src\hexDiffPanel.ts:858:                        actionRow.style.borderLeft = 
'1px solid var(--vscode-editorGroup-border)';
  src\hexDiffPanel.ts:859:                        actionRow.style.borderRight =
 '1px solid var(--vscode-editorGroup-border)';
  src\hexDiffPanel.ts:860:                        actionRow.style.marginLeft = 
'10px';
  src\hexDiffPanel.ts:862:                        
  src\hexDiffPanel.ts:863:                        c1.appendChild(row1);
  src\hexDiffPanel.ts:864:                        c2.appendChild(row2);
> src\hexDiffPanel.ts:865:                        c_center.appendChild(actionRo
w);
  src\hexDiffPanel.ts:866:                        
  src\hexDiffPanel.ts:867:                        rowIndex++;
  src\hexDiffPanel.ts:868:                    };
}
//# sourceMappingURL=recovered.js.map