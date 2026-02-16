# Audit: Extracting CSS Callout Detection from obsidian-callout-manager

## Executive Summary

The CSS callout detection system in `obsidian-callout-manager` **can be extracted**, but it is not a single self-contained module. It is spread across 4 core files with 2 external library dependencies (`obsidian-extra`, `obsidian-undocumented`) that provide critical Obsidian internals access. The extraction is feasible but requires understanding the layered architecture and accepting or replacing those external dependencies.

---

## Architecture Overview

The callout detection system operates in three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: CalloutCollection (callout-collection.ts)         │
│  Aggregates callouts from all sources, tracks origin,       │
│  caches resolved properties, emits diffs on changes         │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: StylesheetWatcher (css-watcher.ts)                │
│  Monitors Obsidian themes, snippets, and built-in styles    │
│  for changes; emits add/change/remove events                │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: CSS Parser (css-parser.ts)                        │
│  Pure regex extraction of callout IDs from CSS text         │
├─────────────────────────────────────────────────────────────┤
│  Supplementary: CalloutResolver (callout-resolver.ts)       │
│  Shadow DOM + getComputedStyle to resolve --callout-icon    │
│  and --callout-color CSS variables for each callout ID      │
└─────────────────────────────────────────────────────────────┘
```

The main plugin (`src/main.ts`) orchestrates these layers in its `onload()` method.

---

## File-by-File Analysis

### 1. `src/css-parser.ts` — Pure CSS Callout ID Extractor

**Lines of code:** ~47
**Dependencies:** `CalloutID` (type alias for `string` from `api/callout.ts`)
**External deps:** None
**Extractability: TRIVIAL**

This is a single pure function `getCalloutsFromCSS(css: string): CalloutID[]` that uses regex to find `[data-callout=...]` and `[data-callout^=...]` attribute selectors in raw CSS text and extracts the callout IDs. It handles single-quoted, double-quoted, and unquoted values.

**How it works:**
- Regex `/\[data-callout([^\]]*)\]/gmi` finds all `[data-callout...]` attribute selectors
- For each match, checks if selector uses `=` (exact match) or `^=` (starts-with)
- Extracts the quoted or unquoted string value as a callout ID
- Ignores partial match selectors (`*=`, `~=`, `|=`, `$=`)

**Test coverage:** Comprehensive unit tests in `src/css-parser.test.ts` (44 lines, 8 test cases)

**Verdict:** Drop-in extractable. Replace `CalloutID` with `string` and it's completely standalone.

---

### 2. `src/css-watcher.ts` — Stylesheet Change Monitor

**Lines of code:** ~359
**Dependencies:**
- `obsidian` — `Events`, `App as ObsidianApp`
- `obsidian-extra` — `fetchObsidianStyleSheet`, `getCurrentThemeID`, `getSnippetStyleElements`, `getThemeManifest`, `getThemeStyleElement` (and the `ObsidianStyleSheet` type)
- `obsidian-undocumented` — `App`, `Latest`, `SnippetID`, `ThemeID`

**Extractability: MODERATE — requires replacing `obsidian-extra` functions**

This class monitors three sources of CSS and emits events when they change:

| Source | Detection Method | obsidian-extra Function Used |
|--------|-----------------|------------------------------|
| **Obsidian built-in** (`app.css`) | One-time async fetch | `fetchObsidianStyleSheet(app)` |
| **Theme** | Style element text comparison | `getCurrentThemeID(app)`, `getThemeManifest(app, id)`, `getThemeStyleElement(app)` |
| **Snippets** | Style element text comparison per-snippet | `getSnippetStyleElements(app)` |

**Event system:** Custom `on`/`off`/`emit` pattern (not using Obsidian's `Events` class for its own events). Emits:
- `add` — new snippet or theme detected
- `change` — stylesheet contents changed
- `remove` — snippet disabled or theme removed
- `checkStarted` / `checkComplete` — lifecycle events

**How it watches for changes:**
- Subscribes to `app.workspace.on('css-change')` to trigger checks
- Compares cached CSS text against current DOM style element contents
- For themes: also compares theme ID and manifest version

**Key types exported:**
```typescript
interface SnippetStylesheet { type: 'snippet'; snippet: SnippetID; styles: string; }
interface ThemeStylesheet   { type: 'theme';   theme: ThemeID;     styles: string; }
interface ObsidianStylesheet { type: 'obsidian'; styles: string; }
```

**What `obsidian-extra` provides here (and what you'd need to replace):**

1. **`fetchObsidianStyleSheet(app)`** — Fetches the built-in Obsidian `app.css` content. Uses three strategies internally: DOM traversal, Electron APIs, or HTTP fetch. Returns `{ cssText: string, method: 'dom'|'electron'|'fetch' }`.

2. **`getCurrentThemeID(app)`** — Returns the currently active theme's ID (accesses `app.customCss.theme` undocumented property).

3. **`getThemeManifest(app, themeId)`** — Returns the manifest for a theme (accesses `app.customCss.themes[id]`).

4. **`getThemeStyleElement(app)`** — Returns the `<style>` DOM element containing the active theme's CSS (accesses `app.customCss.styleEl` or similar).

5. **`getSnippetStyleElements(app)`** — Returns a `Map<SnippetID, HTMLStyleElement>` of all enabled snippets (accesses `app.customCss.csscache` or similar undocumented properties).

---

### 3. `src/callout-resolver.ts` — CSS Variable Resolver

**Lines of code:** ~94
**Dependencies:**
- `obsidian-extra` — `getCurrentColorScheme`
- `src/ui/component/callout-preview.ts` — `IsolatedCalloutPreviewComponent` (Shadow DOM component)

**Extractability: MODERATE-HIGH — coupled to the Shadow DOM preview component**

Uses a clever technique: creates a hidden div in `document.body`, attaches a Shadow DOM with a cloned copy of all current page stylesheets, then uses `window.getComputedStyle()` to read the resolved CSS variables `--callout-icon` and `--callout-color` for any given callout ID.

**Key methods:**
- `getCalloutProperties(id)` → `{ icon: string, color: string }` — resolves computed values
- `getCalloutStyles(id, callback)` — generic computed style access
- `reloadStyles()` — updates Shadow DOM when CSS changes
- `unload()` — cleanup

**Why Shadow DOM:** Obsidian callouts get their icon and color from CSS custom properties set via `[data-callout="..."]` selectors. The only reliable way to resolve these without parsing CSS yourself is to let the browser's CSS engine do it by creating a matching DOM element and reading `getComputedStyle`.

---

### 4. `src/callout-collection.ts` — Multi-Source Callout Registry

**Lines of code:** ~552
**Dependencies:**
- `obsidian-undocumented` — `SnippetID`, `ThemeID` (type aliases for `string`)
- `api/callout.ts` — `Callout`, `CalloutID`, `CalloutSource` types

**Extractability: EASY — only depends on simple types**

Manages callouts from four source buckets:
- `CalloutCollectionObsidian` — Obsidian's built-in callouts
- `CalloutCollectionTheme` — Current theme's callouts
- `CalloutCollectionSnippets` — Per-snippet callouts (keyed by snippet ID)
- `CalloutCollectionCustom` — User-created callouts

Features:
- Lazy resolution via a resolver callback
- Change tracking with invalidation counts
- Diff-based updates (tracks added/removed/changed callouts per source)
- Source attribution (each callout tracks which sources define it)

---

### 5. `api/callout.ts` — Type Definitions

**Lines of code:** ~71
**Dependencies:** None
**Extractability: TRIVIAL**

Pure TypeScript types:
```typescript
type CalloutID = string;
type Callout = CalloutProperties & { sources: CalloutSource[] };
interface CalloutProperties { id: CalloutID; color: string; icon: string; }
type CalloutSource = CalloutSourceObsidian | CalloutSourceSnippet | CalloutSourceTheme | CalloutSourceCustom;
```

---

### 6. `src/ui/component/callout-preview.ts` — Shadow DOM Component (Supplementary)

**Lines of code:** ~442
**Dependencies:** `obsidian` (`Component`, `getIcon`), `api/callout.ts`, `src/util/color.ts`

**Extractability: MODERATE — needed only if you want the `CalloutResolver`**

The `IsolatedCalloutPreviewComponent` creates a Shadow DOM that replicates Obsidian's DOM hierarchy (workspace > tabs > leaf > view-content > markdown-reading-view) and copies all current page stylesheets into it. This is the foundation for the `CalloutResolver`.

If you don't need runtime CSS variable resolution (icon/color), you don't need this file.

---

## Dependency Map

```
css-parser.ts ──────────────────── CalloutID (string alias)
     │                                  │
     │ called by                        │
     ▼                                  ▼
main.ts ───► css-watcher.ts ───── obsidian-extra (5 functions)
     │              │                   │
     │              │              obsidian-undocumented (4 types)
     │              │
     │              ▼
     │       callout-collection.ts ── CalloutSource types
     │              │
     │              │ resolver callback
     │              ▼
     └──────► callout-resolver.ts ── obsidian-extra (1 function)
                    │
                    ▼
              callout-preview.ts ── obsidian (Component, getIcon)
                                    color.ts (RGB type)
```

---

## External Dependency Analysis

### `obsidian-extra` (v0.1.5) — by eth-p

**Functions used by the extractable components:**

| Function | Used In | Purpose | Can Replace? |
|----------|---------|---------|-------------|
| `fetchObsidianStyleSheet(app)` | css-watcher.ts | Get Obsidian's built-in CSS text | Yes — access `document.styleSheets` or fetch `app.css` |
| `getCurrentThemeID(app)` | css-watcher.ts, callout-settings.ts | Get active theme ID | Yes — read `(app as any).customCss.theme` |
| `getThemeManifest(app, id)` | css-watcher.ts | Get theme metadata | Yes — read `(app as any).customCss.themes[id]` |
| `getThemeStyleElement(app)` | css-watcher.ts | Get theme `<style>` element | Yes — read `(app as any).customCss.styleEl` |
| `getSnippetStyleElements(app)` | css-watcher.ts | Get snippet `<style>` elements | Yes — read `(app as any).customCss.csscache` |
| `getCurrentColorScheme(app)` | callout-resolver.ts | Get 'dark' or 'light' | Yes — check `document.body.classList` for `theme-dark`/`theme-light` |
| `createCustomStyleSheet(app, plugin)` | main.ts | Create managed `<style>` element | Yes — `document.head.createEl('style')` with plugin lifecycle |

### `obsidian-undocumented` (v0.1.3) — by eth-p

**Types used:**

| Type | Purpose | Replacement |
|------|---------|-------------|
| `App` | Extended App type with undocumented props | Use `App` from `obsidian` + type assertions |
| `Latest` | Version tag for App generic | Not needed if using type assertions |
| `SnippetID` | Branded string type | Replace with `string` |
| `ThemeID` | Branded string type | Replace with `string` |

---

## Extraction Strategies

### Strategy A: Minimal — CSS Parser Only

**Extract:** `css-parser.ts` only
**Get:** Ability to detect callout IDs from any CSS string
**Lose:** Live monitoring, source attribution, property resolution
**Effort:** Copy one file, replace `CalloutID` import with `string`
**External deps:** None

**Best for:** Static analysis of CSS files, or if your plugin already has its own CSS monitoring.

### Strategy B: Detection + Monitoring — CSS Parser + Watcher

**Extract:** `css-parser.ts`, `css-watcher.ts`, `api/callout.ts` (types only)
**Get:** Live detection of callouts from all CSS sources with change events
**Lose:** Property resolution (icon/color), source collection management
**Effort:** Rewrite 5 `obsidian-extra` function calls to use direct undocumented API access
**External deps:** `obsidian` only

**Best for:** Knowing which callouts exist and where they come from, in real-time.

### Strategy C: Full Pipeline — All 4 Core Files

**Extract:** `css-parser.ts`, `css-watcher.ts`, `callout-collection.ts`, `callout-resolver.ts`, `callout-preview.ts`, `api/callout.ts`, `src/util/color.ts`
**Get:** Complete callout detection, monitoring, source tracking, and property resolution
**Lose:** Nothing — full feature parity with Callout Manager's detection engine
**Effort:** Rewrite 6 `obsidian-extra` function calls, port `IsolatedCalloutPreviewComponent`
**External deps:** `obsidian` only

**Best for:** Building a full-featured callout enhancement plugin.

---

## Recommended Approach: Strategy B+

Extract the detection + monitoring layer (Strategy B), plus add lightweight property resolution without the full Shadow DOM component. Here's why:

1. **The CSS parser is trivially extractable** and has zero dependencies.

2. **The CSS watcher** is the high-value component. Its `obsidian-extra` dependencies can be replaced with ~50 lines of direct undocumented API access:

```typescript
// Replace fetchObsidianStyleSheet:
// Access document.querySelectorAll('style') or fetch the app.css URL

// Replace getCurrentThemeID:
function getCurrentThemeID(app: App): string | null {
    return (app as any).customCss?.theme ?? null;
}

// Replace getThemeStyleElement:
function getThemeStyleElement(app: App): HTMLStyleElement | null {
    return (app as any).customCss?.styleEl ?? null;
}

// Replace getSnippetStyleElements:
function getSnippetStyleElements(app: App): Map<string, HTMLStyleElement> {
    return (app as any).customCss?.csscache ?? new Map();
}

// Replace getThemeManifest:
function getThemeManifest(app: App, id: string): { name: string; version: string } | null {
    return (app as any).customCss?.themes?.[id] ?? null;
}
```

3. **The CalloutCollection** is cleanly extractable (only depends on string type aliases).

4. **The CalloutResolver** is the most coupled component (Shadow DOM, full style cloning). Consider a simpler alternative for property resolution if you only need icon/color.

---

## Risks and Considerations

### Undocumented API Stability
All access to snippet/theme stylesheets relies on Obsidian's undocumented `app.customCss` internal API. This is why `obsidian-extra` and `obsidian-undocumented` exist — they wrap these accesses. If Obsidian changes its internals, these break. The Callout Manager plugin has the same risk.

### The `fetchObsidianStyleSheet` Complexity
This function tries three different strategies to get Obsidian's built-in CSS:
1. **DOM traversal** — iterate `document.styleSheets` and read `cssRules`
2. **Electron** — use `require('electron')` to read the CSS file directly
3. **HTTP fetch** — fetch the `app.css` URL from the Obsidian app

This is the hardest function to replace cleanly. However, for most use cases (detecting *user* callouts from themes and snippets), you may not need the built-in Obsidian stylesheet at all — the built-in callouts are well-known and can be hardcoded.

### Shadow DOM Resolver Overhead
The `CalloutResolver` creates a full Shadow DOM replica of the Obsidian workspace. This is elegant but heavy. A simpler approach for just reading CSS variables would be to parse the CSS text directly for `--callout-icon` and `--callout-color` values, though this loses cascade/specificity resolution.

---

## Files to Extract (Strategy B+ Recommended)

| File | Action | Notes |
|------|--------|-------|
| `src/css-parser.ts` | Copy as-is | Replace `CalloutID` import with `string` |
| `src/css-parser.test.ts` | Copy as-is | Update import path |
| `src/css-watcher.ts` | Copy + modify | Replace 5 `obsidian-extra` calls with inline helpers |
| `src/callout-collection.ts` | Copy + modify | Replace `SnippetID`/`ThemeID` with `string` |
| `api/callout.ts` | Copy as-is | Pure types, no modifications needed |
| `src/util/color.ts` | Copy as-is | Standalone utility, no external deps |
| `src/callout-resolver.ts` | Optional | Only if you need runtime CSS variable resolution |
| `src/ui/component/callout-preview.ts` | Optional | Only needed if extracting callout-resolver.ts |

**Total extractable code:** ~1,100 lines (core) or ~1,600 lines (with resolver)
**Estimated new helper code needed:** ~50-80 lines (to replace `obsidian-extra` calls)
