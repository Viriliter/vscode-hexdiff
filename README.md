# HexDiff

View and compare binary files effortlessly right inside Visual Studio Code. **HexDiff** is a powerful extension that provides an interactive, highly performant hex editor and side-by-side binary comparison tool.

## Key Features

* **Hex Editor:** Open any binary file to view and edit it in hexadecimal format.

<div align="center">
  <img src="images/ss3.jpg" width="80%" alt="Hex Editor View"/>
  <br/>
  <em>Figure: Hex Editor View</em>
</div>

* **Side-by-Side Binary Comparison:** Compare two binary files and visualize differences down to the byte level, color-coded for changed (red) and added (green).

<div align="center">
  <img src="images/ss1.jpg" width="80%" alt="HexDiff side-by-side comparison"/>
  <br/>
  <em>Figure: HexDiff side-by-side comparison with differences highlighted</em>
</div>

* **Large File Support (Virtual Scrolling):** Capable of loading and comparing absolutely massive binary files without memory bloat, thanks to a custom infinite-chunking DOM implementation that only renders what you see.

* **Git Integration:** Seamlessly compare your local uncommitted binary file changes directly against the Git HEAD commit.

<div align="center">
  <img src="images/ss2.jpg" width="80%" alt="Git Integration"/>
  <br/>
  <em>Figure: HexDiff Git integration showing uncommitted changes</em>
</div>

## Commands

HexDiff contributes the following commands to the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and Explorer context menus:

* **`Compare Files (HexDiff)`**: Select two files in your explorer, right-click, and run this command to launch the side-by-side hex diff panel.
* **`Compare with Git (HexDiff)`**: Right-click any Git-tracked binary file in your workspace and compare your local changes against its original version.

## Usage

1. Open the VS Code Explorer view.
2. Select two binary files by holding `Ctrl` (or `Cmd` on Mac) while clicking.
3. Right-click and select **"Compare Files (HexDiff)"** from the dropdown context menu.
4. The HexDiff Webview will open, highlighting byte differences clearly.
5. Hover over the dynamic widget located in the bottom-right corner to jump directly to the previous/next byte difference instantly!

## Requirements

- To use **Compare with Git (HexDiff)**, you must have `git` installed in your system PATH, and the selected file must inherently belong to a Git repository.

## The Compilation and Packaging

- Clone the project and navigate to it:
```bash
git clone https://github.com/Viriliter/vscode-hexdiff.git; cd vscode-hexdiff
```

- Install project dependencies and VS Code Extension CLI (required for packaging):
```bash
npm install
npm install -g @vscode/vsce
```

- Compile the project:
```bash
npm run compile
```

- Create the package:
```bash
npx @vscode/vsce package
```

After succesfull packaging, a file with an extension ```*.vsix``` is created under the project path. Use ```Install from VSIX...``` option from VS Code and select the generated package to install the extension. Alternatively, run following command to install the generated package into your local VS Code instance:
```bash
code --install-extension *.vsix
```

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes and version history.

## Known Issues:
To track existing issues or report a new one, please visit the GitHub Issues page at https://github.com/Viriliter/vscode-hexdiff/issues