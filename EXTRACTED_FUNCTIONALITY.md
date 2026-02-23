# Callout Control Panel — Extracted Functionality Overview

## Purpose

This document catalogs every functional capability available across the three extracted plugin codebases (Plugin A, Plugin B, Plugin C). Its goal is to provide a complete picture of what has been extracted, what each piece does, how they relate to each other, and what decisions remain before integration into a single unified Obsidian plugin.

---

## Project Goal

Consolidate callout-related functionality from three mature Obsidian plugins into **one unified plugin** that provides:

- A single hotkey to open a callout insertion modal
- Automatic detection of all callout types (built-in, theme, snippet, custom)
- Full management of custom callout types (create, edit, delete, import, export)
- CSS snippet generation for custom callouts

### Source Plugins

| Label | Source Plugin | Author | License | Version |
|-------|-------------|--------|---------|---------|
| Plugin A | Editing Toolbar | Cuman (cumany) | MIT | — |
| Plugin B | Callout Manager | eth-p | MIT | 1.1.0 |
| Plugin C | Admonitions | Jeremy Valentine | MIT | 10.3.2 |

---

## Plugin A — Callout Insertion Modal

**Source:** `plugin A/new-plugin/`
**Extraction plan:** `plugin A/new-plugin/EXTRACTION_PLAN.md`
**Estimated code:** ~400–500 lines across 5 files

### Functional Capabilities

#### 1. Insert Callout Modal (`insertCalloutModal.ts`)

A modal dialog for inserting Obsidian-native callout syntax into the editor.

**Features:**
- **Type selection dropdown** — Lists all available callout types (built-in + custom snippet types) with section separators
- **Live icon preview** — Renders the selected callout type's Lucide icon with the correct CSS variable color
- **Title input** — Optional custom title for the callout
- **Collapse state selector** — Dropdown with options: None, Open (`+`), Closed (`-`)
- **Content textarea** — Multi-line content field; auto-populated with any text currently selected in the editor
- **Keyboard shortcut** — Ctrl/Cmd+Enter to insert without clicking the button
- **Smart cursor placement** — Inserts newlines before the callout if the cursor is on a non-empty line; positions cursor after the callout block

**Generated markdown format:**
```markdown
> [!type]+/- Title
> Content line 1
> Content line 2
```

#### 2. Snippet CSS Parser (`snippetParser.ts`)

Reads user CSS snippet files to discover custom callout definitions.

**Features:**
- Scans `.obsidian/snippets/*.css` for callout selectors
- Regex extraction of `.callout[data-callout="typename"]` blocks
- Parses `--callout-color` (RGB tuple) and `--callout-icon` (icon name)
- Fallback defaults: `lucide-box` for missing icons, `var(--callout-default)` for missing colors
- Deduplicates by type name
- Graceful degradation on read errors or missing snippets directory

#### 3. Settings Tab (`settingsTab.ts`)

**Features:**
- Toggle to enable/disable snippet scanning (shows count of detected types)
- Default callout type setting (falls back to "note")
- "Remember last used type" toggle
- "Auto-focus content field" toggle
- Display of detected custom types as a list

#### 4. Built-In Callout Types (14 types in `types.ts`)

Complete definitions for all Obsidian-native callout types with icons, CSS color variables, and aliases:

| Type | Icon | Aliases |
|------|------|---------|
| note | lucide-pencil | — |
| abstract | lucide-clipboard-list | summary, tldr |
| info | lucide-info | — |
| todo | lucide-check-circle-2 | — |
| important | lucide-flame | — |
| tip | lucide-flame | hint |
| success | lucide-check | check, done |
| question | lucide-help-circle | help, faq |
| warning | lucide-alert-triangle | caution, attention |
| failure | lucide-x | fail, missing |
| danger | lucide-zap | error |
| bug | lucide-bug | — |
| example | lucide-list | — |
| quote | lucide-quote | cite |

#### 5. Plugin Entry Point (`main.ts`)

- Registers single `insert-callout` command
- Loads settings on startup
- Parses snippet types on layout ready
- Provides `refreshSnippetTypes()` for re-scanning after settings changes

---

## Plugin B — CSS Callout Detection Pipeline

**Source:** `plugin B/new-plugin-B/`
**Extraction doc:** `plugin B/new-plugin-B/EXTRACTION.md`
**Audit:** `plugin B/new-plugin-B/AUDIT.md`
**Estimated code:** ~1,100 lines (core) or ~1,600 lines (with resolver)

### Architecture

Three-layer detection system with supplementary resolver:

```
Layer 3: CalloutCollection — Aggregates callouts from all sources, caches, emits diffs
Layer 2: StylesheetWatcher — Monitors all CSS sources for changes in real-time
Layer 1: CSS Parser         — Pure regex extraction of callout IDs from CSS text
Supplementary: CalloutResolver — Shadow DOM CSS variable resolution for icon/color
```

### Functional Capabilities

#### 1. CSS Callout ID Parser (`css-parser.ts`)

Pure function that extracts callout IDs from raw CSS text.

**Features:**
- Regex-based detection of `[data-callout="..."]` and `[data-callout^="..."]` attribute selectors
- Handles single-quoted, double-quoted, and unquoted values
- Ignores partial match operators (`*=`, `~=`, `|=`, `$=`)
- Returns deduplicated array of callout ID strings
- Zero dependencies (standalone pure function)
- Comprehensive test suite (14 test cases)

#### 2. Stylesheet Watcher (`css-watcher.ts`)

Live monitor for CSS changes across all Obsidian stylesheet sources.

**Features:**
- **Three source types monitored:**
  - `obsidian` — Built-in app.css (one-time async fetch)
  - `theme` — Active theme's style element (tracks ID + version + content)
  - `snippet` — Per-snippet style elements (Map of snippet ID to content)
- **Event system** with typed events:
  - `add` — New stylesheet detected
  - `change` — Stylesheet content changed
  - `remove` — Stylesheet removed/disabled
  - `checkStarted` / `checkComplete` — Lifecycle hooks
- **Content-hash caching** — Only emits events when content actually changed
- **Automatic triggering** — Hooks into Obsidian's `css-change` workspace event

#### 3. Callout Collection (`callout-collection.ts`)

Multi-source callout registry with lazy resolution and change tracking.

**Features:**
- **Four source buckets:**
  - `builtin` — Obsidian's built-in callouts
  - `theme` — Current theme's callouts
  - `snippets` — Per-snippet callout tracking (keyed by snippet ID)
  - `custom` — User-created callouts
- **Standard collection API:** `get(id)`, `has(id)`, `keys()`, `values()`
- **Lazy resolution** — Icon/color properties resolved on first access via callback
- **Change detection** — `hasChanged()` returns a closure that detects invalidation
- **Diff tracking** — Computes added/removed/unchanged callouts per source update
- **Source attribution** — Each callout tracks all sources that define it

#### 4. Callout Resolver (`callout-resolver.ts`)

Shadow DOM-based CSS variable resolution engine.

**Features:**
- Creates isolated Shadow DOM that mirrors Obsidian's full workspace DOM hierarchy
- Clones all current page stylesheets into the shadow root
- Resolves computed `--callout-icon` and `--callout-color` CSS variables for any callout ID
- `reloadStyles()` method to update when CSS changes
- Accurate cascade/specificity resolution (browser's CSS engine does the work)

#### 5. Shadow DOM Callout Preview (`ui/callout-preview.ts`)

Two-tier preview component for rendering callouts in isolation.

**Features:**
- **`CalloutPreviewComponent`:** Basic callout element with icon, color, title, content
  - `setCalloutID()`, `setIcon()`, `setColor()` for dynamic updates
  - Handles both Obsidian Lucide icons and custom SVG icons
- **`IsolatedCalloutPreviewComponent`:** Full Shadow DOM isolation
  - Replicates Obsidian workspace DOM tree structure
  - Clones all stylesheets from document head
  - Supports dark/light color scheme switching
  - `updateStyles()` to refresh when themes change
  - CSS reset on layout elements to prevent cascade interference

#### 6. Obsidian Internal API Helpers (`obsidian-helpers.ts`)

Inline replacements for `obsidian-extra` and `obsidian-undocumented` libraries.

**Functions provided:**
- `getCurrentThemeID(app)` — Active theme ID from `app.customCss.theme`
- `getThemeManifest(app, id)` — Theme name/version from `app.customCss.themes`
- `getThemeStyleElement(app)` — Theme `<style>` element from `app.customCss.styleEl`
- `getSnippetStyleElements(app)` — Snippet `<style>` map from `app.customCss.csscache`
- `getCurrentColorScheme(app)` — Detects dark/light from `document.body.classList`
- `fetchObsidianStyleSheet(app)` — Fetches app.css (DOM traversal, then HTTP fetch fallback)
- `createCustomStyleSheet()` — Creates managed `<style>` element with `.css` property

**Risk note:** All access undocumented `app.customCss` internals. May break on Obsidian updates.

#### 7. Color Utilities (`util/color.ts`)

**Functions:**
- `parseColor()` — Auto-detects hex, rgb(), rgba() formats
- `parseColorHex()` — 3/4/6/8 digit hex parsing
- `parseColorRGB()` / `parseColorRGBA()` — With percentage support
- `toHSV()` — RGB/RGBA to HSV/HSVA conversion
- `toHexRGB()` — To hex string

#### 8. Detection Settings (`settings/callout-detection-settings.ts`)

**Features:**
- **Settings schema** with three detection toggles (Obsidian, Theme, Snippet)
- **Per-callout customization** with conditional logic:
  - Conditions: by theme, by color scheme (dark/light), or boolean AND/OR combinations
  - Changes: color override, icon override, custom CSS styles
- **CSS generation** — `calloutSettingsToCSS()` converts settings to `.callout[data-callout="..."]` rules
- **Environment evaluation** — `checkCondition()` evaluates conditions against current theme/color scheme
- **Settings migration** — `migrateSettings()` merges old data with new defaults
- **UI builder** — `buildCalloutDetectionSettings()` renders toggle section for settings tab

---

## Plugin C — Callout Management (Create/Edit/Delete)

**Source:** `plugin C/new-plugin-c/`
**Audit:** `plugin C/new-plugin-c/AUDIT.md`
**Attribution:** `plugin C/new-plugin-c/ATTRIBUTION.md`
**Estimated code:** ~2,000+ lines across 12 files

### Functional Capabilities

#### 1. Callout Manager (`callout/manager.ts`)

CSS rule management and post-processing engine.

**Features:**
- **CSS stylesheet management:**
  - Creates `<style>` element in document head for custom callout rules
  - `addAdmonition()` / `removeAdmonition()` — Insert/delete individual CSS rules
  - Generates `.callout[data-callout="type"] { --callout-icon: ...; --callout-color: ...; }` rules
  - Supports both Lucide icon names and embedded SVG strings for non-Obsidian icons
- **Vault snippet output (optional):**
  - `updateSnippet()` — Writes generated CSS to `.obsidian/snippets/<path>.css`
  - Auto-enables snippet via `app.customCss.setCssEnabledStatus()`
  - `generateCssString()` — Converts all rules to exportable CSS string
- **Markdown post-processor:**
  - Intercepts rendered callouts and applies customizations
  - Custom title injection
  - Copy-to-clipboard button (copies callout content)
  - Drop shadow visual enhancement
- **Collapsibility system:**
  - Makes any callout collapsible with fold icon
  - Smooth CSS transition animation for collapse/expand
  - Height caching via WeakMap for performance
  - `data-callout-fold` attribute tracking (`+` open, `-` closed)

#### 2. Icon Manager (`icons/manager.ts`)

Multi-source icon loading and rendering system.

**Features:**
- **Font Awesome integration:**
  - Loads solid, regular, and brands icon sets from `@fortawesome` packages
  - Maps all FA icons by name for lookup
- **Obsidian native icons:**
  - Integrates with Obsidian's built-in Lucide icon library via `getIconIds()`
- **Downloadable icon packs:**
  - Supports Octicons and RPG Awesome packs
  - Downloads from GitHub, caches as JSON files in plugin folder
  - Install/remove/redownload workflow
- **Image support:**
  - Can render image URLs as callout icons
- **Unified icon API:**
  - `getIconType(str)` — Determines icon source (FA, Obsidian, downloaded pack, image)
  - `getIconNode(icon)` — Renders any icon as a DOM element regardless of source
  - `getIconModuleName(icon)` — Human-readable source name for UI display
  - `iconDefinitions` — Combined array of all icons from all sources

#### 3. Settings UI (`settings.ts`)

Full-featured settings tab and create/edit modal.

**Settings Tab Features:**
- **Import/Export:**
  - Export all types as JSON download
  - Export selected types (via selection modal)
  - Export as CSS snippet file
  - Import from JSON files with validation and error reporting
  - Batch import with per-item validation
- **Custom type management:**
  - Add new callout type (opens create modal)
  - Lists all user-defined types with live preview
  - Per-type edit and delete buttons
  - Toggle command registration per type
- **Behavior settings:**
  - Drop shadow on callouts toggle
  - Collapsible by default toggle
  - Default collapse state (open/closed) dropdown
  - Copy button toggle
  - Color injection toggle
  - Hide empty callouts toggle
- **Icon pack management:**
  - Font Awesome enable/disable
  - Download additional packs (Octicons, RPG Awesome)
  - Redownload/remove downloaded packs

**Create/Edit Modal (SettingsModal):**
- Type name input with real-time validation
- Optional custom default title
- Icon picker with fuzzy search across all icon sources
- Image upload (canvas-resized to 24x24, stored as data URL)
- Color picker (hex input, converts to RGB for storage)
- Per-type options: no-title, copy button, inject color
- Live callout preview that updates as user edits
- Save/cancel with proper state management

#### 4. Icon Suggestion Modal (`modal/index.ts`)

Fuzzy search modal for icon selection.

**Features:**
- Extends `FuzzyInputSuggest` for search-as-you-type
- Shows icon name with fuzzy match highlights
- Shows icon source (Font Awesome, Obsidian, etc.) as secondary text
- Renders live icon preview in suggestion list
- Returns selected icon definition

#### 5. Confirmation Modal (`modal/confirm.ts`)

Generic async confirmation dialog.

**Features:**
- Customizable prompt text and button labels
- Returns `Promise<boolean>` for async flow control
- Defaults: "Yes" / "No"

#### 6. Export Selection Modal (`modal/export.ts`)

Selective export dialog for callout types.

**Features:**
- Checkbox list of all user-defined callout types
- Select All / Deselect All bulk actions
- Export Selected action with modal close

#### 7. Input Validation (`util/validator.ts`)

Static validation methods for callout type definitions.

**Validation rules:**
- **Type name:** Non-empty, no spaces, valid CSS selector, no duplicates
- **Icon:** Non-empty, exists in registered icon packs (images always valid)
- **Color:** RGB pattern validation (random fallback on import)
- **Booleans:** Type checking for command, injectColor, noTitle, copy fields
- Detailed error messages with field-level feedback

#### 8. Color Utilities (`util/color.ts`)

- `hexToRgb(hex)` → `{ r, g, b }` or null
- `rgbToHex("r, g, b")` → `"#rrggbb"`
- `hslToRgb(h, s, l)` → `[r, g, b]`
- `hsbToRgb(h, s, b)` → `[r, g, b]`

#### 9. Default Callout Map (`util/constants.ts`)

- 18+ built-in admonition type definitions with Font Awesome icons
- SVG icon constants for UI buttons (add, remove, warning, spinner)
- Type-to-definition mapping with colors and aliases

#### 10. Localization (`lang/`)

- `t(key)` translation function with locale detection
- English locale with 40+ UI string keys
- Extensible structure for additional languages

---

## Overlap and Deduplication Notes

### Duplicate functionality across plugins

| Capability | Plugin A | Plugin B | Plugin C | Resolution Needed |
|-----------|----------|----------|----------|-------------------|
| CSS callout parsing | Simple regex in `snippetParser.ts` | Robust parser in `css-parser.ts` with tests | — | Use Plugin B's parser (more thorough, tested) |
| Built-in callout list | 14 types in `types.ts` | Detected dynamically from CSS | 18+ types in `constants.ts` (FA icons) | Decide: static list vs. dynamic detection |
| Color utilities | — | Full parse/convert suite | hex/rgb/hsl/hsb conversions | Merge into single utility module |
| Icon rendering | Lucide only (via `setIcon`) | Obsidian icons (via `getIcon`) | FA + Obsidian + downloaded + images | Use Plugin C's IconManager (most complete) |
| CSS rule generation | — | `calloutSettingsToCSS()` (conditional) | `CalloutManager.addAdmonition()` (stylesheet API) | Merge; Plugin C's approach for CRUD, Plugin B's for conditional overrides |
| Settings UI | Simple 4-toggle tab | 3-toggle detection section | Full settings page with modals | Compose into unified settings tab |

### Integration architecture decisions

The following decisions need to be made during integration:

1. **Detection strategy:** Plugin A parses snippets on load (one-shot). Plugin B watches all CSS sources live (real-time). The live approach (B) is more robust but heavier.

2. **Icon system:** Plugin A uses only Obsidian's built-in Lucide icons. Plugin C supports Font Awesome, downloadable packs, and image icons. Scope decision needed.

3. **CSS output:** Plugin C writes CSS via `<style>` element or vault snippet file. Plugin B's detection pipeline monitors these same sources. Circular detection needs to be handled.

4. **Callout type model:** Plugin A uses `BuiltInCalloutType`/`SnippetCalloutType`. Plugin B uses `Callout` with source attribution. Plugin C uses `Admonition`. A unified type model is needed.

5. **Shadow DOM resolver vs. regex parsing:** Plugin B's resolver is accurate but heavy (full DOM clone). Plugin A's regex is lightweight but misses cascade/specificity. Decide based on accuracy requirements.

---

## External Dependencies

| Dependency | Required By | Purpose |
|-----------|------------|---------|
| `obsidian` | All | Obsidian plugin API |
| `@fortawesome/fontawesome-svg-core` | Plugin C | FA icon rendering |
| `@fortawesome/free-solid-svg-icons` | Plugin C | Solid icon set |
| `@fortawesome/free-regular-svg-icons` | Plugin C | Regular icon set |
| `@fortawesome/free-brands-svg-icons` | Plugin C | Brands icon set |
| `@javalent/utilities` | Plugin C | `FuzzyInputSuggest` for icon search modal |

Plugins A and B have no external npm dependencies beyond `obsidian`.

---

## Known Issues Identified in Audits

1. **Plugin C — Double CSS call:** `settings.ts:170` calls `calloutManager.addAdmonition()` after `plugin.addAdmonition()` which already calls it internally. Fix: call only once.

2. **Plugin C — Missing save on edit:** The edit flow modifies `userAdmonitions` and calls `registerType()` but never calls `saveSettings()`. Fix: add explicit save.

3. **Plugin B — Undocumented API risk:** All access to snippet/theme stylesheets relies on `app.customCss`, which is not part of Obsidian's public API. May break without notice on Obsidian updates.

4. **Plugin B — `fetchObsidianStyleSheet` complexity:** Uses multiple fallback strategies (DOM traversal, HTTP fetch). For built-in callouts, a hardcoded list may be simpler and more reliable.

5. **Plugin C — Heavy dependency chain:** Font Awesome packages and `@javalent/utilities` add significant bundle weight. Consider whether full FA support is necessary.

---

## Attribution Requirements

All three source plugins are MIT-licensed. The following attributions are required:

1. **Editing Toolbar** by Cuman — Callout insertion modal, built-in type definitions, modal CSS
2. **Callout Manager** by eth-p — CSS detection pipeline, stylesheet watcher, callout resolver, color utilities
3. **Admonitions** by Jeremy Valentine — Callout management, icon management, settings UI, validation, i18n

A combined `ATTRIBUTION.md` should include copyright notices and MIT license text for all three sources.

---

## Summary of All Available Capabilities

### Callout Insertion
- [x] Modal dialog with type selection, title, collapse state, content
- [x] Keyboard shortcut (Ctrl/Cmd+Enter) for quick insertion
- [x] Smart cursor placement and line-break handling
- [x] Pre-population from editor selection
- [x] Live icon and color preview in modal

### Callout Detection
- [x] Pure regex CSS parser for callout IDs
- [x] Live stylesheet monitoring (built-in, theme, snippets)
- [x] Multi-source callout registry with change tracking
- [x] Shadow DOM CSS variable resolution (icon + color)
- [x] Callout preview component with theme isolation
- [x] Per-source attribution tracking

### Callout Management
- [x] Create custom callout types (type, title, icon, color)
- [x] Edit existing custom callout types
- [x] Delete custom callout types
- [x] Import callout types from JSON
- [x] Export callout types to JSON
- [x] Export callout types as CSS snippet
- [x] Input validation with detailed error feedback

### Icon System
- [x] Obsidian built-in Lucide icons
- [x] Font Awesome (solid, regular, brands)
- [x] Downloadable packs (Octicons, RPG Awesome)
- [x] Image icons (data URL, resized to 24x24)
- [x] Fuzzy search icon picker modal
- [x] Icon source identification

### CSS Output
- [x] In-memory `<style>` element with CSSStyleSheet API
- [x] Vault snippet file output (`.obsidian/snippets/`)
- [x] Auto-enable snippet via Obsidian API
- [x] Per-callout color injection toggle
- [x] Embedded SVG for non-Lucide icons

### Post-Processing
- [x] Custom title injection on rendered callouts
- [x] Collapsible callouts with smooth animation
- [x] Copy-to-clipboard button
- [x] Drop shadow visual option
- [x] Height caching for collapse performance

### Settings
- [x] Snippet scanning toggle with detection count
- [x] Detection source toggles (Obsidian, Theme, Snippet)
- [x] Default callout type configuration
- [x] Remember last used type
- [x] Auto-focus content field
- [x] Collapsible/copy/shadow/color-inject behavior toggles
- [x] Icon pack management (download, remove, toggle)
- [x] Conditional per-callout styling (by theme, color scheme)

### Localization
- [x] Translation function with locale detection
- [x] English strings (40+ keys)
- [x] Extensible locale structure
