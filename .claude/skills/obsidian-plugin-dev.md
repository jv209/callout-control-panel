# Obsidian Plugin Development — Claude Code Skill File

Lessons learned from building Enhanced Callout Manager. Use this file to bootstrap faster on future Obsidian plugin projects.

---

## Project structure conventions

```
src/
  main.ts                  # Plugin class (extends Plugin), onload/onunload
  types.ts                 # All shared TypeScript types and DEFAULT_SETTINGS
  settingsTab.ts           # PluginSettingTab subclass (slim orchestrator)
  styles.css               # All plugin CSS (root level, not src/)
  manifest.json            # Plugin metadata (id, name, version, minAppVersion)

  settings/
    types.ts               # SettingsTabPluginRef, SettingsTabContext interfaces
    tabs/                  # One file per settings tab section
      insertion.ts
      detection.ts
      ...

  modal/
    calloutEdit.ts         # Custom Modal subclasses
    export.ts
    confirm.ts

  icons/
    manager.ts             # Icon loading, resolution, rendering
    packs.ts               # Downloadable pack registry

  callout/
    manager.ts             # CSS generation + snippet file management

  callout-detection/       # CSS parsing pipeline (can be ported from callout-manager)
    css-watcher.ts
    obsidian-helpers.ts
    ...

  lang/
    locale/en.ts           # Localisation strings (future-proof early)

  util/
    color.ts               # hexToRgb, rgbToHex, hslToRgb
    validator.ts           # Input validation helpers
```

---

## Obsidian API patterns

### Plugin class skeleton

```ts
export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MySettingTab(this.app, this));
    this.addCommand({ id: "...", name: "...", callback: () => {} });
    this.registerMarkdownPostProcessor((el) => { ... });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

### Settings tab skeleton

```ts
export class MySettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: MyPlugin) {
    super(app, plugin);
  }

  display() {
    this.containerEl.empty();
    // build UI
  }
}
```

### Modal patterns

```ts
// Title case: use sentence case per Obsidian guidelines
this.titleEl.setText("Edit callout type");   // correct
this.titleEl.setText("Edit Callout Type");   // wrong — reviewers will flag

// Always guard close handler
modal.onClose = () => {
  if (!modal.saved) return;
  // do the thing
};
modal.open();
```

### Setting component patterns

```ts
new Setting(containerEl)
  .setName("Setting name")
  .setDesc("Description text.")
  .addToggle((t) => {
    t.setValue(this.plugin.settings.myToggle)
     .onChange(async (v) => {
       this.plugin.settings.myToggle = v;
       await this.plugin.saveSettings();
     });
  });

// Grouped dropdown (Custom / Snippet / Default pattern)
new Setting(containerEl)
  .addDropdown((d) => {
    const group = d.selectEl.createEl("optgroup", { attr: { label: "Custom" } });
    group.createEl("option", { value: "foo", text: "Foo" });
    d.setValue(currentValue);
    d.onChange((v) => { ... });
  });
```

### Post-processor pattern

```ts
this.registerMarkdownPostProcessor((el) => {
  const callouts = el.querySelectorAll<HTMLElement>(".callout");
  for (const callout of Array.from(callouts)) {
    // Operate on callout, callout-title, callout-content
    // IMPORTANT: .callout already has position:relative in Obsidian's CSS
    // Append absolutely-positioned UI to .callout, not .callout-content
    // to avoid theme conflicts.
  }
});
```

### Icon rendering

```ts
import { setIcon } from "obsidian";

// Lucide icons (always available):
setIcon(element, "lucide-star");

// Font Awesome / custom pack icons go through IconManager:
const node = iconManager.getIconNode(iconDef);
if (node) element.appendChild(node);
else setIcon(element, "lucide-alert-circle"); // fallback
```

---

## Undocumented API usage — what's safe and how to guard it

These APIs are used by many community plugins. Wrap all undocumented access in try-catch.

```ts
// app.customCss — snippet file management
const customCss = (app as unknown as {
  customCss: {
    getSnippetPath(name: string): string;
    setCssEnabledStatus(name: string, enabled: boolean): void;
    readSnippets(): void;
  };
}).customCss;

// Always guard:
try {
  customCss.setCssEnabledStatus(SNIPPET_NAME, true);
  customCss.readSnippets();
} catch (e) {
  console.error("Plugin: failed to write snippet", e);
}

// css-change workspace event — fires when snippets/themes change
// Cast through 'quit' (a valid event type) to bypass TS check
app.workspace.on('css-change' as 'quit', () => { ... });
```

---

## SVG serialization — reviewer-safe pattern

Obsidian reviewers flag `.innerHTML`, `.outerHTML`, and `insertAdjacentHTML`. Use `XMLSerializer` instead when you need to serialize DOM nodes to strings.

```ts
// BAD — will get flagged in code review:
const svg = node.outerHTML;

// GOOD — semantically identical, reviewer-safe:
// The node must be in-memory (not attached to the live DOM)
const svg = new XMLSerializer().serializeToString(node);
```

---

## CSS patterns

### Callout color injection

```css
/* Set via inline style in JS — this is Obsidian's own idiom: */
element.style.setProperty("--callout-color", "68, 138, 255");

/* Then reference in CSS: */
.callout-icon {
  color: rgb(var(--callout-color));
}
```

### Tab bar (icon-only inactive, icon+label active/hover)

```css
.ecm-tab-label {
  max-width: 0;
  opacity: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: max-width 0.25s ease, opacity 0.2s ease, margin-left 0.25s ease;
}
.ecm-tab-btn.ecm-tab-active .ecm-tab-label,
.ecm-tab-btn:hover .ecm-tab-label {
  max-width: 200px;
  opacity: 1;
  margin-left: 6px;
}
```

### Avoid adding position:relative to Obsidian elements

Themes may depend on specific `position` values. If you need a positioning context:
- Prefer appending to `.callout` (already `position: relative` in Obsidian's CSS)
- If you must create a wrapper, inject your own `<div>` and style that — don't modify the host element's position

---

## Compliance checklist (before community submission)

- [ ] **Sentence case** all modal titles (`titleEl.setText(...)`)
- [ ] **Sentence case** all button labels in modals
- [ ] **No `innerHTML`/`outerHTML`/`insertAdjacentHTML`** — use `XMLSerializer` or DOM methods
- [ ] **Manifest version** matches latest released version
- [ ] **README** discloses all network connections with URLs and justification
- [ ] **No hardcoded user paths** — use `app.vault.configDir`, `adapter.getBasePath()`
- [ ] **No `console.log` in production paths** — use `console.error`/`console.warn` for real errors only
- [ ] **Cleanup on `onunload`** — deregister listeners, remove injected DOM elements
- [ ] **Mobile compatibility** — guard desktop-only features with `Platform.isMobile`
- [ ] **Network access via `requestUrl`** only (Obsidian's sandboxed fetch)
- [ ] All undocumented API calls wrapped in try-catch with graceful fallback

---

## Common pitfalls

### Edit tool whitespace mismatch
The Claude Code `Edit` tool fails if the `old_string` uses spaces but the file uses tabs (or vice versa). Always read the exact bytes first with `cat -A` before attempting edits. Use a Python `str.replace()` script for large multi-line replacements.

### File-not-read guard
The `Edit` tool requires a `Read` of the file earlier in the same session. When working across multiple files, always `Read` before `Edit`.

### Build verification
Run `npm run build` after every structural change (imports, file splits, type changes). TypeScript errors surface immediately and are much cheaper to fix before a commit.

### Obsidian CSS smooth transitions don't work on collapsed callouts
Obsidian sets `display: none` on `.callout-content` when collapsed. CSS `max-height` / `height` transitions cannot animate to/from `display: none`. If you need collapse animations, you must override with `display: block !important` and use a different approach — or skip the feature entirely.

### Settings tab re-render pattern
Call `this.display()` after any setting that changes visible UI state. Don't try to surgically update DOM nodes — re-render the whole tab. It's fast enough and avoids stale-state bugs.

---

## Project bootstrap checklist for a new plugin

1. Clone `obsidian-sample-plugin` and update `manifest.json`
2. Set up `types.ts` with `PluginSettings` and `DEFAULT_SETTINGS` first
3. Create stub `main.ts` → `loadSettings`, `saveSettings`, `addSettingTab`, one `addCommand`
4. Build and verify the stub installs in Obsidian via BRAT before writing features
5. Implement features one tab/modal at a time, building after each
6. Add `CLAUDE.md` with version tracking table from the start — saves confusion later
7. Keep `settingsTab.ts` as a slim orchestrator from day one; put builders in `settings/tabs/`
