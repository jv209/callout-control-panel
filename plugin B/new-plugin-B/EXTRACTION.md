# Callout Detection Module — Extraction Documentation

## Attribution

This code was extracted from the **[Callout Manager](https://github.com/eth-p/obsidian-callout-manager)** plugin for Obsidian.md.

- **Original Author:** eth-p ([https://github.com/eth-p](https://github.com/eth-p))
- **Original License:** MIT
- **Original Version:** 1.1.0
- **Source Repository:** `obsidian-callout-manager`
- **Extraction Date:** 2026-02-16

All extracted files carry an attribution header referencing the original source file and author.

---

## What Was Extracted

The complete CSS callout detection pipeline — the subsystem that discovers, monitors, resolves, and catalogues callout definitions from all of Obsidian's CSS sources.

### Files Extracted

```
new-plugin-B/
├── src/
│   ├── callout-detection/           # Core detection module
│   │   ├── index.ts                 # Barrel export for the module
│   │   ├── types.ts                 # Callout type definitions
│   │   ├── css-parser.ts            # Regex CSS callout ID extractor
│   │   ├── css-parser.test.ts       # Tests for the parser
│   │   ├── css-watcher.ts           # Live stylesheet change monitor
│   │   ├── callout-collection.ts    # Multi-source callout registry
│   │   ├── callout-resolver.ts      # Shadow DOM CSS variable resolver
│   │   ├── obsidian-helpers.ts      # Inline replacements for obsidian-extra
│   │   ├── default-colors.json      # Built-in callout color names
│   │   ├── ui/
│   │   │   └── callout-preview.ts   # Shadow DOM callout preview component
│   │   └── util/
│   │       └── color.ts             # Color parsing and conversion
│   └── settings/
│       └── callout-detection-settings.ts  # Settings schema + UI builder
├── EXTRACTION.md                    # This document
└── AUDIT.md                         # Full codebase audit
```

### Source Mapping

| Extracted File | Original File | Modifications |
|---|---|---|
| `types.ts` | `api/callout.ts` | None — pure types |
| `css-parser.ts` | `src/css-parser.ts` | Replaced `CalloutID` import path |
| `css-parser.test.ts` | `src/css-parser.test.ts` | Updated import path |
| `css-watcher.ts` | `src/css-watcher.ts` | Replaced `obsidian-extra` + `obsidian-undocumented` imports with `obsidian-helpers.ts`; removed `'electron'` fetch strategy from describeObsidianFetchMethod |
| `callout-collection.ts` | `src/callout-collection.ts` | Replaced `SnippetID`/`ThemeID` with `string` |
| `callout-resolver.ts` | `src/callout-resolver.ts` | Replaced `obsidian-extra` import; replaced path alias imports |
| `ui/callout-preview.ts` | `src/ui/component/callout-preview.ts` | Replaced path alias imports; removed `declare const STYLES` (build-tool specific) |
| `util/color.ts` | `src/util/color.ts` | None — standalone |
| `obsidian-helpers.ts` | **NEW** — replaces `obsidian-extra` (v0.1.5) + `obsidian-undocumented` (v0.1.3) | Inline implementations of 7 functions that access `app.customCss` |
| `default-colors.json` | `src/default_colors.json` | None |
| `settings/callout-detection-settings.ts` | `src/settings.ts` + `src/callout-settings.ts` + `src/panes/manage-plugin-pane.ts` | Combined schema, CSS generation, and UI builder into one file |

---

## How It Was Used in the Original Plugin

### Initialization Flow (`src/main.ts:onload()`)

```
1. Create CalloutResolver            — hidden Shadow DOM for CSS variable resolution
2. Create CalloutCollection           — passes resolver callback to lazily resolve icon/color
3. Load custom callouts from settings — callouts.custom.add(...settings.callouts.custom)
4. Create CustomStyleSheet            — for applying user's appearance overrides
5. Create StylesheetWatcher           — monitors all CSS sources for changes
6. Wire watcher events:
   - on('add')    → updateCalloutSource() — parse CSS, add callouts to collection
   - on('change') → updateCalloutSource() — parse CSS, update callouts in collection
   - on('remove') → removeCalloutSource() — remove source's callouts from collection
   - on('checkComplete') → ensureChangedCalloutsKnown() + emit API events
7. Listen to app.workspace 'css-change' → reloadStyles() + applyStyles()
8. Start watcher on layout ready
```

### Runtime Detection Flow

```
StylesheetWatcher detects CSS change
        │
        ▼
emits 'change' event with { type, styles }
        │
        ▼
main.ts:updateCalloutSource(ss)
   │  calls getCalloutsFromCSS(ss.styles)  ← css-parser.ts
   │  routes to correct bucket:
   │    'obsidian' → callouts.builtin.set(ids)
   │    'theme'    → callouts.theme.set(theme, ids)
   │    'snippet'  → callouts.snippets.set(snippet, ids)
   │
   ▼
CalloutCollection diffs old vs new IDs
   │  marks affected entries as invalidated
   │
   ▼
On access (lazy): CalloutResolver.getCalloutProperties(id)
   │  sets data-callout attribute on Shadow DOM element
   │  reads getComputedStyle → --callout-icon, --callout-color
   │
   ▼
Returns Callout { id, icon, color, sources[] }
```

### Settings Page Integration

The original plugin's settings pane (`manage-plugin-pane.ts`) rendered three toggles under a "Callout Detection" heading:

- **Obsidian** — toggle `calloutDetection.obsidian` → controls built-in callout detection
- **Theme** — toggle `calloutDetection.theme` → controls theme callout detection
- **Snippet** — toggle `calloutDetection.snippet` → controls snippet callout detection

When toggled, each called `plugin.saveSettings()` + `plugin.refreshCalloutSources()` which cleared caches and re-scanned all CSS.

The extracted `buildCalloutDetectionSettings()` function in `settings/callout-detection-settings.ts` reproduces this UI section — call it from your `PluginSettingTab.display()` method.

---

## Dependencies

### Required (Runtime)

| Package | Purpose |
|---|---|
| `obsidian` | Obsidian plugin API (`Plugin`, `Component`, `Setting`, `getIcon`, `App`, `Events`) |

### Removed (Replaced Inline)

| Package | What It Provided | Replacement |
|---|---|---|
| `obsidian-extra` v0.1.5 | Theme/snippet/builtin CSS access, color scheme detection, custom stylesheets | `obsidian-helpers.ts` |
| `obsidian-undocumented` v0.1.3 | `App<Latest>`, `SnippetID`, `ThemeID` types | Direct type assertions + `string` |

### Undocumented Obsidian APIs Used

All access goes through `obsidian-helpers.ts`. The undocumented property accessed is `app.customCss`, which has this shape:

```typescript
interface ObsidianCustomCss {
    theme: string | null;                              // Active theme ID
    themes: Record<string, { name; version }>;         // Theme manifests
    styleEl: HTMLStyleElement | null;                   // Theme <style> element
    csscache: Map<string, HTMLStyleElement>;            // Snippet <style> elements
}
```

**Risk:** These properties are not part of the public Obsidian API and may change without notice. The original plugin used `obsidian-extra` as an abstraction layer for this same access pattern.

---

## How to Integrate Into Your Plugin

### Minimal Integration Example

```typescript
import { Plugin } from 'obsidian';
import {
    StylesheetWatcher,
    CalloutCollection,
    CalloutResolver,
    getCalloutsFromCSS,
    createCustomStyleSheet,
} from './callout-detection';
import {
    defaultSettings,
    migrateSettings,
    calloutSettingsToCSS,
    currentCalloutEnvironment,
    type CalloutDetectionSettings,
} from './settings/callout-detection-settings';

export default class MyPlugin extends Plugin {
    settings!: CalloutDetectionSettings;
    resolver!: CalloutResolver;
    callouts!: CalloutCollection;
    watcher!: StylesheetWatcher;

    async onload() {
        // Load settings.
        this.settings = migrateSettings(defaultSettings(), await this.loadData());

        // Create resolver (Shadow DOM for reading CSS variables).
        this.resolver = new CalloutResolver();
        this.register(() => this.resolver.unload());

        // Create collection (lazily resolves icon/color via resolver).
        this.callouts = new CalloutCollection((id) => {
            const { icon, color } = this.resolver.getCalloutProperties(id);
            return { id, icon, color };
        });

        // Load user's custom callouts.
        this.callouts.custom.add(...this.settings.callouts.custom);

        // Create watcher and wire events.
        this.watcher = new StylesheetWatcher(this.app);
        this.watcher.on('add', (ss) => this.updateSource(ss));
        this.watcher.on('change', (ss) => this.updateSource(ss));
        this.watcher.on('remove', (ss) => this.removeSource(ss));

        this.app.workspace.onLayoutReady(() => {
            this.register(this.watcher.watch());
        });

        // Reload resolver styles when CSS changes.
        this.registerEvent(
            this.app.workspace.on('css-change', () => this.resolver.reloadStyles()),
        );
    }

    private updateSource(ss: { type: string; styles: string; [key: string]: any }) {
        const ids = getCalloutsFromCSS(ss.styles);
        const { calloutDetection } = this.settings;

        switch (ss.type) {
            case 'obsidian':
                if (calloutDetection.obsidian) {
                    ids.push('note'); // "note" is implicit in app.css
                    this.callouts.builtin.set(ids);
                }
                break;
            case 'theme':
                if (calloutDetection.theme) this.callouts.theme.set(ss.theme, ids);
                break;
            case 'snippet':
                if (calloutDetection.snippet) this.callouts.snippets.set(ss.snippet, ids);
                break;
        }
    }

    private removeSource(ss: { type: string; [key: string]: any }) {
        switch (ss.type) {
            case 'obsidian': this.callouts.builtin.set([]); break;
            case 'theme':    this.callouts.theme.delete(); break;
            case 'snippet':  this.callouts.snippets.delete(ss.snippet); break;
        }
    }
}
```

### Settings Tab Integration

```typescript
import { PluginSettingTab, App } from 'obsidian';
import { buildCalloutDetectionSettings } from './settings/callout-detection-settings';

class MySettingTab extends PluginSettingTab {
    display() {
        const { containerEl } = this;
        containerEl.empty();

        buildCalloutDetectionSettings(containerEl, this.plugin.settings, (key, value) => {
            this.plugin.saveSettings();
            this.plugin.refreshCalloutSources(); // your method to clear caches + re-scan
        });
    }
}
```

---

## What Was NOT Extracted

These components from the original plugin were **not** included because they are UI/feature-specific and not part of the detection pipeline:

| Component | Reason |
|---|---|
| `src/apis.ts`, `src/api-v1.ts`, `src/api-common.ts` | Plugin-to-plugin API system (not needed for detection) |
| `src/panes/*` (except settings reference) | Plugin-specific UI panes |
| `src/search/*` | Callout search/filter system (independent feature) |
| `src/ui/pane.ts`, `src/ui/pane-layers.ts`, `src/ui/paned-setting-tab.ts` | Plugin-specific pane framework |
| `src/ui/setting/*` | Color picker and icon selector components |
| `src/ui/component/icon-preview.ts`, `src/ui/component/reset-button.ts` | UI-only components |
| `src/changelog.ts`, `src/sort.ts` | Utility features unrelated to detection |
| `api/index.ts`, `api/functions.ts`, `api/events.ts` | Plugin inter-op API |
