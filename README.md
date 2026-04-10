# HexDiff

View and compare binary files effortlessly right inside Visual Studio Code. **HexDiff** is a powerful extension that provides an interactive, highly performant hex editor and side-by-side binary comparison tool.

## Key Features

* **Hex Editor:** Open any binary file to view and edit it in hexadecimal format.
* **Side-by-Side Binary Comparison:** Compare two binary files and visualize differences down to the byte level, color-coded for changed (red) and added (green).
* **Large File Support (Virtual Scrolling):** Capable of loading and comparing absolutely massive binary files without memory bloat, thanks to a custom infinite-chunking DOM implementation that only renders what you see.
* **Git Integration:** Seamlessly compare your local uncommitted binary file changes directly against the Git HEAD commit.

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

## Release Notes

### 0.0.1
* Initial release of HexDiff core components.
* Introduced custom Virtual Scrolling for infinite binary loading.
* Included floating difference navigation UI (`O(log N)` rapid binary search jumping).
* Added support for multiple side-by-side comparison tabs.
* Added Decoded Text ASCII difference highlighting.
* Implemented fixed sticky headers for large-scale viewing.
* Integrated Git history repository comparisons.

Known Issues:
To track existing issues or report a new one, please visit the GitHub Issues page at https://github.com/viriliter/vscode-hexdiff/issues