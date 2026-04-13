# Change Log

All notable changes to the "hexdiff" extension will be documented in this file.

### Version 0.0.1
* Initial release of HexDiff core components.
* Introduced custom Virtual Scrolling for infinite binary loading.
* Included floating difference navigation UI (`O(log N)` rapid binary search jumping).
* Added support for multiple side-by-side comparison tabs.
* Added Decoded Text ASCII difference highlighting.
* Implemented fixed sticky headers for large-scale viewing.
* Integrated Git history repository comparisons.

### Version 0.0.2
* In difference mode, the differences can be applied to the left or right file, allowing users to easily merge changes.
* Added support for comparing files from Git repositories, enabling users to compare different versions of files directly from their Git history.
* Added a command to create new binary files, allowing users to start with an empty file and edit it in the hex editor.
* Added support for searching within the hex editor, allowing users to find specific byte patterns or ASCII text within the binary data.
* Some bug fixes and visual improvements.


### Version 0.0.3
* ```package.json``` is updated so that the extension supports any file type.
