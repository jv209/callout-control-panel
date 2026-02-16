# Attribution

This plugin incorporates code from three open-source Obsidian plugins. Each is licensed under the MIT License. Their contributions and full license texts are listed below.

---

## Editing Toolbar — by Cuman (cumany)

- **Repository:** https://github.com/cumany/obsidian-editing-toolbar
- **License:** MIT

### What was used

- Callout insertion modal (`InsertCalloutModal` class)
- Built-in callout type definitions (14 types with icons, colors, and aliases)
- Modal CSS styles (`.insert-callout-modal`, `.callout-type-container`, `.callout-icon-container`)
- Snippet CSS parser for discovering custom callout types

### License

Copyright (c) Cuman (cumany)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Callout Manager — by eth-p

- **Repository:** https://github.com/eth-p/obsidian-callout-manager
- **Version extracted from:** 1.1.0
- **License:** MIT

### What was used

- CSS callout ID parser (regex-based extraction from stylesheets)
- Stylesheet watcher (live monitoring of built-in, theme, and snippet CSS sources)
- Callout collection (multi-source callout registry with change tracking)
- Callout resolver (Shadow DOM CSS variable resolution for icon and color)
- Callout preview component (isolated Shadow DOM rendering)
- Obsidian internal API helpers (replacements for `obsidian-extra` and `obsidian-undocumented`)
- Color parsing and conversion utilities
- Callout detection settings (schema, CSS generation, and UI builder)

### License

Copyright (c) eth-p

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Admonitions — by Jeremy Valentine

- **Repository:** https://github.com/valentine195/obsidian-admonition
- **Version extracted from:** 10.3.2
- **License:** MIT

### What was used

- Callout CSS rule management (stylesheet creation, rule insertion and removal)
- Callout markdown post-processor (custom titles, copy button, collapsible animation, drop shadow)
- Icon manager (Font Awesome, Obsidian native, downloadable packs, image icons)
- Icon suggestion modal (fuzzy search icon picker)
- Settings UI (create/edit modal, type listing, import/export)
- Confirmation and export selection modals
- Input validation for callout type definitions
- Color conversion utilities (hex, RGB, HSL, HSB)
- Default callout type definitions and SVG icon constants
- Localization system (translation function and English locale)

### License

Copyright (c) 2021 Jeremy Valentine

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
