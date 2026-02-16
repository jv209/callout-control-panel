# Attribution

Portions of this code are derived from the **Obsidian Admonitions** plugin.

- **Original Author:** Jeremy Valentine
- **Repository:** https://github.com/valentine195/obsidian-admonition
- **Version extracted from:** 10.3.2
- **License:** MIT

## MIT License (Original)

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

## What Was Used

The following components were extracted and adapted:

- **Callout type data model** (`@types/index.d.ts`) — Admonition interface
- **CSS rule generation** (`callout/manager.ts`) — snippet I/O and rule building
- **Settings UI** (`settings.ts`) — create/edit modal, type listing, import/export
- **Icon management** (`icons/manager.ts`) — FontAwesome/Obsidian/downloadable icon resolution
- **Validation** (`util/validator.ts`) — type and icon input validation
- **Color utilities** (`util/color.ts`) — extracted from `settings.ts` and `util/util.ts`
- **Confirmation modal** (`modal/confirm.ts`)
- **Export modal** (`modal/export.ts`)
- **Icon suggestion modal** (`modal/index.ts`)
- **Default callout definitions** (`util/constants.ts`)
- **i18n helper** (`lang/helpers.ts`) — translation function
