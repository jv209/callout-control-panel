# Callout Management Extraction — Audit Report

## Source Plugin

- **Name:** Obsidian Admonitions (`obsidian-admonition`)
- **Version:** 10.3.2
- **Author:** Jeremy Valentine
- **License:** MIT (Copyright (c) 2021 Jeremy Valentine)
- **Repository:** https://github.com/valentine195/obsidian-admonition

Per the MIT license, the original copyright notice and permission notice must be
included in all copies or substantial portions of the Software. See
`ATTRIBUTION.md` in this folder.

---

## What Was Extracted

The callout **creation, editing, deletion, and CSS snippet management**
functionality. This is everything needed to build a settings page that lets users
define custom callout types (with type, title, icon, color) and have those
definitions reflected as CSS `--callout-icon` / `--callout-color` rules — either
via an in-memory `<style>` element or a vault CSS snippet file.

### Extracted Files

```
new-plugin-c/
├── AUDIT.md              — This document
├── ATTRIBUTION.md        — License/attribution notice (required by MIT)
├── src/
│   ├── @types/
│   │   └── index.d.ts    — Admonition, AdmonitionSettings, icon type defs
│   ├── callout/
│   │   └── manager.ts    — CSS rule generation, snippet I/O, callout post-processor
│   ├── icons/
│   │   ├── manager.ts    — Icon loading, resolution, SVG rendering
│   │   └── packs.ts      — Downloadable icon pack type + map
│   ├── modal/
│   │   ├── confirm.ts    — Generic confirmation modal
│   │   ├── export.ts     — Export selection modal
│   │   └── index.ts      — Icon fuzzy-search suggestion modal
│   ├── util/
│   │   ├── color.ts      — hexToRgb, rgbToHex, hslToRgb, hsbToRgb
│   │   ├── constants.ts  — Default callout map (ADMONITION_MAP) + SVG icons
│   │   └── validator.ts  — Type/icon/import validation
│   ├── lang/
│   │   ├── helpers.ts    — t() translation function
│   │   └── locale/
│   │       └── en.ts     — English strings
│   └── settings.ts       — Settings tab, SettingsModal (create/edit form),
│                           type listing with edit/delete, import/export
```

### What Was NOT Extracted

These components are tightly coupled to the Admonitions rendering pipeline and
are not needed for callout management:

| Component | File | Reason not extracted |
|---|---|---|
| Codeblock post-processor | `main.ts:311-416` | Rendering only — builds HTML for `ad-*` codeblocks |
| `getAdmonitionElement()` | `main.ts:426-496` | Builds preview HTML — replaced by stub in settings |
| `renderAdmonitionContent()` | `main.ts:498-572` | Markdown rendering pipeline |
| Editor suggestions | `suggest/suggest.ts` | Editor autocomplete — independent feature |
| Command registration | `main.ts:634-762` | Per-type editor commands — independent feature |
| Syntax highlighting | `main.ts:838-872` | CodeMirror mode registration |
| Codeblock conversion | `settings.ts:583-820` | Legacy migration tools |
| `InsertAdmonitionModal` | `modal/index.ts:76-231` | Editor insert dialog — independent feature |
| Localization files | `lang/locale/*.ts` (non-en) | 20+ language files — add as needed |
| SCSS assets | `assets/*.scss` | Styling for rendered admonitions |
| Publish support | `publish/` | Obsidian Publish JS generation |

---

## Dependencies Between Extracted Components

```
settings.ts
  ├── @types/index.d.ts          (Admonition interface)
  ├── util/validator.ts           (input validation)
  ├── util/color.ts               (hex/rgb conversion)
  ├── util/constants.ts           (SVG icon constants for buttons)
  ├── modal/index.ts              (IconSuggestionModal)
  ├── modal/confirm.ts            (confirmWithModal)
  ├── modal/export.ts             (Export modal)
  ├── lang/helpers.ts             (t() i18n function)
  ├── icons/manager.ts            (icon resolution + rendering)
  └── callout/manager.ts          (CSS generation + snippet I/O)

callout/manager.ts
  ├── @types/index.d.ts
  └── icons/manager.ts            (getIconNode for SVG serialization)

icons/manager.ts
  ├── @types/index.d.ts
  ├── icons/packs.ts
  └── External: @fortawesome/*, obsidian (getIconIds, setIcon)

util/validator.ts
  ├── @types/index.d.ts
  ├── lang/helpers.ts
  └── icons/manager.ts            (getIconType, getIconNode for validation)

util/color.ts
  └── (no dependencies — pure functions)

util/constants.ts
  └── @types/index.d.ts
```

### External npm Dependencies Required

- `obsidian` — Obsidian plugin API (Plugin, Modal, Setting, etc.)
- `@fortawesome/fontawesome-svg-core` — icon lookup + rendering
- `@fortawesome/free-solid-svg-icons` — solid icon set
- `@fortawesome/free-regular-svg-icons` — regular icon set
- `@fortawesome/free-brands-svg-icons` — brand icon set
- `@javalent/utilities` — `FuzzyInputSuggest` (used by IconSuggestionModal)

---

## Key Integration Points for a New Plugin

### 1. Plugin class must provide

Your main plugin class needs to expose these for the extracted settings to work:

```typescript
interface PluginInterface {
    app: App;
    data: AdmonitionSettings;          // persisted settings
    admonitions: Record<string, Admonition>;  // merged built-in + user types
    iconManager: IconManager;
    calloutManager: CalloutManager;
    saveSettings(): Promise<void>;
    addAdmonition(a: Admonition): Promise<void>;
    removeAdmonition(a: Admonition): Promise<void>;
}
```

### 2. CSS Snippet Strategy

Two modes are supported (controlled by `settings.useSnippet`):

**Mode A — In-memory `<style>` element (default):**
- `CalloutManager` creates `<style id="ADMONITIONS_CUSTOM_STYLE_SHEET">`
- Rules inserted/deleted via `CSSStyleSheet` API
- Reconstructed on every plugin load from `userAdmonitions`

**Mode B — Vault snippet file (`useSnippet: true`):**
- Writes to `.obsidian/snippets/<snippetPath>.css`
- Fully overwrites the file on every change
- Auto-enables via `app.customCss.setCssEnabledStatus()`

To support editing a section within a user-created snippet, add marker-based
replacement in `CalloutManager.updateSnippet()`:

```typescript
const START_MARKER = '/* CALLOUT-MANAGER START */';
const END_MARKER   = '/* CALLOUT-MANAGER END */';
```

### 3. Known Issues in Source

- **Double CSS call:** `settings.ts:170` calls `calloutManager.addAdmonition()`
  after `plugin.addAdmonition()` which already calls it internally (`main.ts:630`).
  The extracted version should call it only once.

- **Edit flow doesn't call saveSettings():** `settings.ts:958-1011` modifies
  `userAdmonitions` and calls `registerType()` but never calls
  `plugin.saveSettings()`. The original relied on `display()` triggering saves
  indirectly. The extracted version should save explicitly.

---

## CSS Rule Format

Each custom callout generates one CSS rule:

```css
/* Obsidian-native icon */
.callout[data-callout="mytype"] {
    --callout-color: 68, 138, 255;
    --callout-icon: lucide-star;
}

/* FontAwesome/external icon (SVG embedded) */
.callout[data-callout="mytype"] {
    --callout-color: 68, 138, 255;
    --callout-icon: "<svg ...escaped...>";
}
```

The `--callout-color` is only injected when `injectColor` is true (per-type or
global setting).
