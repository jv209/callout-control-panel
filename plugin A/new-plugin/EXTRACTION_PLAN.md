# Callout Modal Extraction Plan

## Overview

Extract callout management into a single standalone plugin combining:

| Source | Component | Purpose |
|--------|-----------|---------|
| **editing-toolbar** (this repo) | Callout Modal UI | Type selection, title/content/collapse inputs, markdown insertion |
| **Plugin B** (TBD) | Snippet CSS Parser | Read `.obsidian/snippets/*.css` to discover custom callout types |
| **Plugin C** (TBD) | Hotkey/Command binding | Single-hotkey trigger for the modal |

Final product: one plugin, one hotkey, one modal — callout insertion with native snippet support.

---

## Part 1: What's Being Extracted from editing-toolbar

### Files

| Source File | Extraction Scope |
|-------------|-----------------|
| `src/modals/insertCalloutModal.ts` | **Entire file** — the modal class, interfaces, built-in types, insertion logic |
| `src/plugin/main.ts` | Lines 81-90 (`AdmonitionDefinition` interface), lines 112-113 (property), lines 301-303 + 399-429 (type fetching) |
| `styles.css` | Lines 1256-1281 (`.insert-callout-modal`, `.callout-type-container`, `.callout-icon-container`) |

### Interfaces to Extract

```typescript
// From insertCalloutModal.ts
interface BuiltInCalloutType {
    type: string;
    aliases: string[];
    icon: string;        // Lucide icon name (e.g., "lucide-pencil")
    label: string;
    color: string;       // CSS variable (e.g., "var(--callout-default)")
}

interface AdmonitionIconDefinition {
    name: string;
    type: string;        // 'default' | 'custom'
    svg?: string;
}

interface CombinedCalloutTypeInfo {
    type: string;
    label: string;
    icon: string | AdmonitionIconDefinition;
    color: string;
    isAdmonition: boolean;
    sourcePlugin?: string;
}

// From main.ts — REMOVE if dropping Admonition support
export interface AdmonitionDefinition {
    type: string;
    title?: string;
    icon: string;
    color: string;       // "R,G,B" format
    command: boolean;
    injectColor?: boolean;
    noTitle: boolean;
    copy?: boolean;
}
```

### Built-In Callout Types (14 total)

```
note       | lucide-pencil          | --callout-default
abstract   | lucide-clipboard-list  | --callout-summary   | aliases: summary, tldr
info       | lucide-info            | --callout-info
todo       | lucide-check-circle-2  | --callout-todo
important  | lucide-flame           | --callout-important
tip        | lucide-flame           | --callout-tip       | aliases: hint
success    | lucide-check           | --callout-success   | aliases: check, done
question   | lucide-help-circle     | --callout-question  | aliases: help, faq
warning    | lucide-alert-triangle  | --callout-warning   | aliases: caution, attention
failure    | lucide-x               | --callout-fail      | aliases: fail, missing
danger     | lucide-zap             | --callout-error     | aliases: error
bug        | lucide-bug             | --callout-bug
example    | lucide-list            | --callout-example
quote      | lucide-quote           | --callout-quote     | aliases: cite
```

### CSS to Extract

```css
.insert-callout-modal textarea {
  width: 100%;
  resize: vertical;
}
.callout-type-container {
  display: flex;
  align-items: center;
  gap: 8px;
}
.callout-type-container .setting-item {
  width: 100%;
}
.callout-icon-container {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
}
.callout-icon-container svg {
  width: 16px;
  height: 16px;
  color: rgb(var(--callout-color));
}
```

---

## Part 2: Obsidian API Dependencies

Everything the modal uses from the Obsidian API:

| Import | Usage |
|--------|-------|
| `Modal` | Base class for the modal |
| `App` | Passed to Modal constructor |
| `Setting` | All form controls (dropdown, text, textarea, buttons) |
| `setIcon` | Renders Lucide icons into containers |
| `DropdownComponent` | Type annotation for the callout type dropdown |
| `Platform` | Detects macOS for keyboard shortcut hint |
| `Editor` | `getSelection()`, `replaceSelection()`, `getCursor()`, `getLine()`, `setCursor()` |
| `MarkdownView` | Getting the active editor |
| `Plugin` | Base class for the plugin itself |
| `addCommand()` | Registering the hotkey command |
| `workspace.getActiveViewOfType()` | Getting the active editor view |
| `workspace.onLayoutReady()` | Waiting for layout before reading types |

**No third-party dependencies required.** The modal uses zero npm packages — only the Obsidian API.

---

## Part 3: What Changes for the Standalone Plugin

### Remove

- `editingToolbarPlugin` import → replace with your own plugin class
- `t()` translation helper → use plain strings (add i18n later if needed)
- `this.plugin.commandsManager.getActiveEditor()` → use `this.app.workspace.getActiveViewOfType(MarkdownView)?.editor`
- Admonition integration (entire `tryGetAdmonitionTypes` pipeline) → replace with snippet parser

### Replace

The Admonition data pipeline:
```
main.ts → tryGetAdmonitionTypes() → plugin.admonitionDefinitions → modal.prepareCalloutOptions()
```

Becomes a snippet data pipeline:
```
main.ts → parseSnippetCalloutTypes() → plugin.snippetCalloutTypes → modal.prepareCalloutOptions()
```

### Simplify

The `CombinedCalloutTypeInfo` interface can drop:
- `isAdmonition` flag → replace with `isCustom` or `source: "builtin" | "snippet"`
- `sourcePlugin` → not needed
- `AdmonitionIconDefinition` → snippet icons are always strings

---

## Part 4: Snippet CSS Parser (New Component)

This replaces the Admonition integration. Read CSS snippets to discover custom callouts.

### API Calls Needed

```typescript
// List snippet files
const files = await this.app.vault.adapter.list(".obsidian/snippets");

// Read each .css file
for (const file of files.files.filter(f => f.endsWith(".css"))) {
    const css = await this.app.vault.adapter.read(file);
    // Parse for callout definitions
}
```

### CSS Pattern to Match

```css
.callout[data-callout="<TYPE>"] {
    --callout-color: R, G, B;
    --callout-icon: lucide-<name>;
}
```

### Regex Extraction

```typescript
// Match: .callout[data-callout="typename"]
const typeRegex = /\.callout\[data-callout=["']([^"']+)["']\]/g;

// Within each matched block, extract variables
const colorRegex = /--callout-color:\s*([\d\s,]+)/;
const iconRegex = /--callout-icon:\s*([\w-]+)/;
```

### Output Structure

```typescript
interface SnippetCalloutType {
    type: string;        // from data-callout value
    icon: string;        // from --callout-icon (or fallback "lucide-box")
    color: string;       // from --callout-color as "rgb(R,G,B)" (or fallback)
    sourceFile: string;  // which snippet file it came from
}
```

---

## Part 5: Settings Page

### Minimal Settings

```typescript
interface CalloutModalSettings {
    // Snippet integration
    parseSnippets: boolean;        // Enable/disable snippet scanning (default: true)

    // Modal behavior
    defaultCalloutType: string;    // Default type when modal opens (default: "note")
    rememberLastType: boolean;     // Remember last used type across sessions

    // Insertion behavior
    autoFocusContent: boolean;     // Auto-focus content textarea (default: true)
}
```

### Settings Tab

Three sections:
1. **Callout Sources** — Toggle snippet scanning, show detected custom types
2. **Modal Defaults** — Default type, remember-last-type toggle
3. **Behavior** — Auto-focus, any future preferences

---

## Part 6: Action Plan

### Phase 1: Scaffold the Plugin

1. Create new plugin repo with Obsidian plugin template
2. Set up `manifest.json`, `package.json`, `tsconfig.json`
3. Create minimal `main.ts` with `onload()`/`onunload()`

### Phase 2: Extract the Modal

1. Copy `insertCalloutModal.ts` into new plugin
2. Remove all editing-toolbar dependencies:
   - Replace `editingToolbarPlugin` with new plugin class
   - Remove `t()` calls → use plain English strings
   - Replace `this.plugin.commandsManager.getActiveEditor()` with direct Obsidian API
3. Keep all 14 built-in types as-is
4. Keep the icon/color rendering system intact
5. Copy the CSS block (26 lines)

### Phase 3: Build the Snippet Parser

1. Create `snippetParser.ts`
2. Implement `parseSnippetCalloutTypes()`:
   - Read `.obsidian/snippets/` directory
   - Parse each `.css` file with regex
   - Return array of `SnippetCalloutType`
3. Wire into `main.ts` via `onLayoutReady()`
4. Replace the Admonition slot in `prepareCalloutOptions()` with snippet types

### Phase 4: Register the Command

1. Single command: `insert-callout`
2. User assigns hotkey via Obsidian settings
3. Callback: `new InsertCalloutModal(this).open()`

### Phase 5: Settings Page

1. Create `settingsTab.ts` with the minimal settings
2. Wire into `main.ts`

### Phase 6: Test & Ship

1. Test with: no snippets, one snippet, multiple snippets
2. Test with: empty selection, text selected, cursor mid-line
3. Test collapse states: none, open, closed
4. Verify all 14 built-in types render correctly

---

## Part 7: Attribution

### From editing-toolbar Plugin

| What | Author | License | Link |
|------|--------|---------|------|
| `InsertCalloutModal` class | Cuman (cumany) | MIT | https://github.com/cumany/obsidian-editing-toolbar |
| Built-in callout type definitions | Cuman (cumany) | MIT | Same |
| Modal CSS styles | Cuman (cumany) | MIT | Same |
| `AdmonitionDefinition` interface shape | Cuman (cumany) | MIT | Same |

### From Obsidian

| What | Source |
|------|--------|
| 14 built-in callout types | Obsidian native (documented at docs.obsidian.md) |
| CSS variable names (`--callout-*`) | Obsidian native |
| Lucide icon set | Bundled with Obsidian |
| `Modal`, `Setting`, `setIcon` APIs | Obsidian Plugin API |

### Recommended Attribution Format

```
This plugin's callout insertion modal is derived from the
Editing Toolbar plugin by Cuman (https://github.com/cumany/obsidian-editing-toolbar),
licensed under MIT.
```

---

## Part 8: Final File Structure

```
obsidian-callout-modal/
├── manifest.json
├── package.json
├── tsconfig.json
├── styles.css                    # ~26 lines from extraction
├── src/
│   ├── main.ts                   # Plugin entry, command registration, snippet loading
│   ├── insertCalloutModal.ts     # Extracted + cleaned modal
│   ├── snippetParser.ts          # CSS snippet reader (new)
│   ├── types.ts                  # Shared interfaces
│   └── settingsTab.ts            # Settings UI
└── README.md
```

**Estimated total code: ~400-500 lines** (vs ~1600 in the toolbar plugin's main.ts alone).
