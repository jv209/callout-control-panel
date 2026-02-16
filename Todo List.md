# Enhanced Callout Manager — Todo List

## How to read this document

This is the master plan for building the plugin. It is organized into **phases**, and each phase is broken into **steps**. Steps are meant to be done roughly in order, but some can happen in parallel.

Each step has:
- A checkbox (`[ ]` = not started, `[x]` = done)
- A plain-language explanation of what it does and why
- A "Deliverable" — the tangible result when the step is complete

**Jargon key** (for reference as you go):
- **Entry point** — The first file that runs when the plugin loads (`src/main.ts`)
- **Type / Interface** — A TypeScript definition that describes the shape of data (like a blueprint)
- **Barrel export** — An `index.ts` file that re-exports things from other files so you can import from one place
- **Post-processor** — Code that runs after Obsidian renders markdown, letting you modify the result
- **Shadow DOM** — A browser feature that creates an isolated DOM tree; used here to resolve CSS variables accurately
- **Bundle** — The final single `main.js` file that esbuild compiles all your TypeScript into
- **Undocumented API** — Parts of Obsidian's internals (`app.customCss`) that work but aren't officially supported and could change

---

## Phase 0: Housekeeping — Prepare the repo for real development

These steps transform the sample plugin template into the skeleton of the Enhanced Callout Manager. Nothing functional yet — just renaming, configuring, and cleaning.

### 0.1 Update `manifest.json`
- [x] Change `id` from `sample-plugin` to `enhanced-callout-manager`
- [x] Change `name` to `Enhanced Callout Manager`
- [x] Update `description` to something like: "Insert, detect, and manage custom callout types with a unified modal and full icon support."
- [x] Change `author` and `authorUrl` to your info
- [x] Set `isDesktopOnly` to `false` (for now — will revisit if we use desktop-only APIs)
- [x] Bump `minAppVersion` to a recent Obsidian version (e.g., `1.4.0` or higher, depending on APIs used)

**Deliverable:** `manifest.json` reflects the real plugin identity.

### 0.2 Update `package.json`
- [x] Change `name` to `enhanced-callout-manager`
- [x] Update `description`
- [x] Change `license` from `0-BSD` to `MIT` (since we're incorporating MIT-licensed code)
- [x] Add the npm dependencies that Plugin C needs:
  ```
  @fortawesome/fontawesome-svg-core
  @fortawesome/free-solid-svg-icons
  @fortawesome/free-regular-svg-icons
  @fortawesome/free-brands-svg-icons
  @javalent/utilities
  ```
- [x] Run `npm install` to generate an updated `package-lock.json`

**Deliverable:** Dependencies are declared and installed.

### 0.3 Update `LICENSE`
- [x] Replace the current 0-BSD license with MIT license text
- [x] Add your name and year as the primary copyright holder
- [x] Reference the `ATTRIBUTION.md` file for third-party code

**Deliverable:** License file matches the MIT license used by all source plugins.

### 0.4 Create `ATTRIBUTION.md`
- [x] Combine the attribution notices from all three source plugins into one file:
  - Editing Toolbar by Cuman (MIT) — callout insertion modal
  - Callout Manager by eth-p (MIT v1.1.0) — CSS detection pipeline
  - Admonitions by Jeremy Valentine (MIT v10.3.2) — callout management
- [x] Include the full MIT license text for each

**Deliverable:** A single attribution file that satisfies all three MIT license requirements.

### 0.5 Replace sample plugin code in `src/`
- [x] Delete `src/main.ts` (the sample plugin entry point) — it will be rewritten
- [x] Delete `src/settings.ts` (the sample settings tab) — it will be rewritten
- [x] Create a minimal new `src/main.ts` that just loads and unloads (empty plugin shell)

**Deliverable:** The `src/` folder is clean and ready for real code.

### 0.6 Update `versions.json`
- [x] Reset to reflect the new plugin's first version (e.g., `"0.1.0": "1.4.0"`)

**Deliverable:** Version tracking starts fresh.

### 0.7 Verify the build works
- [x] Run `npm run build` — it should compile the empty shell to `main.js` with zero errors
- [x] Run `npm run lint` — it should pass with no warnings

**Deliverable:** Clean build pipeline confirmed.

---

## Phase 1: MVP — Callout Insertion with Built-In Types

The goal of Phase 1 is to get a working plugin that does one thing well: **open a modal via hotkey and insert a callout into the editor**. Only Obsidian's 14 built-in callout types are available at this stage. No custom types, no snippet scanning, no icon packs.

### 1.1 Create the unified type system (`src/types.ts`)
- [ ] Define the core types that all modules will share:
  - `CalloutTypeInfo` — the universal type used by the modal dropdown (type name, icon, color, source)
  - `PluginSettings` — the master settings interface for the whole plugin
  - `DEFAULT_SETTINGS` — sensible defaults
- [ ] Include the 14 built-in callout type definitions (from Plugin A's `types.ts`)

**Why:** Everything in the plugin talks about "callout types." Having one shared definition prevents the three extracted codebases from fighting over incompatible type shapes.

**Deliverable:** A single `types.ts` that all future code imports from.

### 1.2 Port the insertion modal (`src/insertCalloutModal.ts`)
- [ ] Copy Plugin A's `insertCalloutModal.ts` into `src/`
- [ ] Remove all editing-toolbar dependencies:
  - Replace `editingToolbarPlugin` references with the new plugin class
  - Remove `t()` translation calls — use plain English strings for now
  - Replace `this.plugin.commandsManager.getActiveEditor()` with Obsidian's standard API
- [ ] Remove the snippet-type dropdown section (Phase 2 feature) — only show built-in types for now
- [ ] Keep: type dropdown, title input, collapse selector, content textarea, icon preview, Ctrl/Cmd+Enter shortcut

**Why:** The modal is the core user-facing feature. Getting it working with just the built-in types proves the plugin is functional.

**Deliverable:** `InsertCalloutModal` class that opens, shows 14 callout types, and inserts valid markdown.

### 1.3 Port the modal CSS (`styles.css`)
- [ ] Replace the placeholder comment in `styles.css` with the extracted modal styles from Plugin A:
  - `.insert-callout-modal textarea`
  - `.callout-type-container`
  - `.callout-icon-container`

**Deliverable:** Modal looks correct when opened.

### 1.4 Wire up `main.ts`
- [ ] Import `InsertCalloutModal` and the settings types
- [ ] In `onload()`:
  - Load settings from disk
  - Register the `insert-callout` command (opens the modal when triggered)
  - Register the settings tab
- [ ] In `onunload()`: nothing needed yet (Obsidian handles cleanup for commands and settings)
- [ ] Implement `loadSettings()` and `saveSettings()` methods

**Why:** This is the glue that makes the modal accessible via Obsidian's command palette and hotkey system.

**Deliverable:** You can install the plugin, assign a hotkey, press it, and insert a callout.

### 1.5 Create a basic settings tab (`src/settingsTab.ts`)
- [ ] Port Plugin A's `settingsTab.ts` but only include:
  - Default callout type setting
  - Remember last used type toggle
  - Auto-focus content field toggle
- [ ] Remove the snippet scanning toggle and detected types display (Phase 2)

**Deliverable:** Settings tab with basic preferences.

### 1.6 Manual testing
- [ ] Build the plugin (`npm run build`)
- [ ] Copy `main.js`, `manifest.json`, `styles.css` to your test vault
- [ ] Verify:
  - [ ] Plugin loads without errors in the console
  - [ ] Command appears in the command palette
  - [ ] Modal opens and shows all 14 built-in types
  - [ ] Icon preview updates when type changes
  - [ ] Callout inserts correctly (empty line, non-empty line, with selection)
  - [ ] Collapse states work (none, open, closed)
  - [ ] Ctrl/Cmd+Enter keyboard shortcut works
  - [ ] Settings save and persist across restarts

**Deliverable:** A working MVP you can use in your vault.

---

## Phase 2: Snippet Detection — Discover Custom Callout Types from CSS

This phase adds the ability to detect callout types that you (or a theme) have defined in CSS snippet files. When you have a snippet like `.callout[data-callout="recipe"]`, the modal will now show "recipe" as an available type.

### 2.1 Port the snippet parser (`src/snippetParser.ts`)
- [ ] Copy Plugin A's `snippetParser.ts` into `src/`
- [ ] Verify it works standalone:
  - Reads `.obsidian/snippets/*.css`
  - Extracts callout type names, icons, and colors via regex
  - Returns an array of `SnippetCalloutType` (or the unified type from 1.1)
- [ ] Handle edge cases: no snippets folder, empty files, read errors

**Deliverable:** A function that returns all custom callout types found in CSS snippets.

### 2.2 Integrate snippet types into the modal
- [ ] Update `InsertCalloutModal.prepareCalloutOptions()` to merge snippet types with built-in types
- [ ] Show snippet types in a separate section of the dropdown (with a visual separator)
- [ ] Show snippet type count in parentheses if any are found

**Deliverable:** Custom callout types from snippets appear in the modal dropdown.

### 2.3 Add snippet scanning settings
- [ ] Add the "Scan CSS snippets" toggle to the settings tab
- [ ] Show the count and names of detected custom types
- [ ] Wire the toggle to trigger a rescan when changed

**Deliverable:** Users can enable/disable snippet scanning and see what was detected.

### 2.4 Trigger rescan at the right times
- [ ] Scan on plugin load (inside `onLayoutReady()`)
- [ ] Rescan when the snippet scanning setting is toggled
- [ ] Store the results on the plugin instance so the modal can access them

**Deliverable:** Snippet types are always up to date when the modal opens.

### 2.5 Test with real snippets
- [ ] Create test snippet files with various patterns:
  - Single callout type
  - Multiple callout types in one file
  - Missing icon (should fallback to `lucide-box`)
  - Missing color (should fallback to default)
  - Malformed CSS (should not crash)
- [ ] Verify all detected types appear in the modal and insert correctly

**Deliverable:** Snippet detection is robust and handles real-world CSS.

---

## Phase 3: Custom Callout Management — Create, Edit, Delete Types

This phase brings in Plugin C's callout management system. Users can define entirely new callout types (with custom name, icon, and color) and have them work in their vault via generated CSS rules.

### 3.1 Port the Icon Manager (`src/icons/`)
- [ ] Copy Plugin C's `icons/manager.ts` and `icons/packs.ts` into `src/icons/`
- [ ] Update imports to match the new project structure
- [ ] Verify Font Awesome icon loading works
- [ ] Verify Obsidian native icon integration works
- [ ] Verify downloadable pack support (Octicons, RPG Awesome)

**Why first:** The Icon Manager is a dependency for nearly everything in Phase 3 — the icon picker, the settings modal, and the CSS generator all need it.

**Deliverable:** `IconManager` class that loads and renders icons from all sources.

### 3.2 Port the Icon Suggestion Modal (`src/modal/iconSuggestionModal.ts`)
- [ ] Copy Plugin C's `modal/index.ts` (the fuzzy search icon picker)
- [ ] Update imports
- [ ] Verify it shows icons from all sources with fuzzy search, previews, and source labels

**Deliverable:** A modal where users can search and select any available icon.

### 3.3 Port the Callout Manager (`src/callout/manager.ts`)
- [ ] Copy Plugin C's `callout/manager.ts`
- [ ] Update imports to use the unified type system
- [ ] Fix the known "double CSS call" bug (documented in Plugin C's audit)
- [ ] Keep both CSS output modes:
  - In-memory `<style>` element (default)
  - Vault snippet file (optional, controlled by settings)

**Why:** This is the engine that turns a callout definition (name + icon + color) into a CSS rule that Obsidian understands.

**Deliverable:** `CalloutManager` class that generates and manages CSS rules for custom callouts.

### 3.4 Port color and validation utilities (`src/util/`)
- [ ] Copy Plugin C's `util/color.ts`, `util/constants.ts`, `util/validator.ts`
- [ ] Update imports
- [ ] Fix the missing `saveSettings()` bug in the edit flow (documented in Plugin C's audit)

**Deliverable:** Color conversion, default callout definitions, and input validation utilities.

### 3.5 Port the confirmation and export modals (`src/modal/`)
- [ ] Copy Plugin C's `modal/confirm.ts` and `modal/export.ts`
- [ ] Update imports

**Deliverable:** Reusable confirmation dialog and export selection modal.

### 3.6 Port the localization system (`src/lang/`)
- [ ] Copy Plugin C's `lang/helpers.ts` and `lang/locale/en.ts`
- [ ] Update imports
- [ ] (English only for now — other languages can be added later)

**Deliverable:** `t()` function that returns English UI strings.

### 3.7 Build the unified settings tab
- [ ] Create a new `src/settingsTab.ts` that combines:
  - **Section 1: Insertion** — Default type, remember last type, auto-focus (from Phase 1)
  - **Section 2: Detection** — Snippet scanning toggle with count (from Phase 2)
  - **Section 3: Custom types** — Add/edit/delete with preview list (from Plugin C's `settings.ts`)
  - **Section 4: Import/Export** — JSON import, JSON export, CSS snippet export (from Plugin C)
  - **Section 5: Icon packs** — Font Awesome toggle, downloadable pack management (from Plugin C)
  - **Section 6: Behavior** — Color injection toggle (from Plugin C)
- [ ] Port Plugin C's `SettingsModal` (the create/edit form with icon picker, color picker, live preview)

**Why:** This is the biggest integration task. The settings tab is where all three plugins' UIs converge into one coherent experience.

**Deliverable:** A settings tab where users can manage all aspects of the plugin.

### 3.8 Wire custom types into the insertion modal
- [ ] Update `InsertCalloutModal.prepareCalloutOptions()` to include three sections:
  1. User-created custom types (from management)
  2. Snippet-detected types (from Phase 2)
  3. Built-in Obsidian types
- [ ] Render custom type icons correctly (Font Awesome SVG, downloaded pack icons, images — not just Lucide)

**Deliverable:** The modal shows all callout types from all sources.

### 3.9 Wire up `main.ts` for Phase 3
- [ ] Initialize `IconManager` in `onload()`
- [ ] Initialize `CalloutManager` in `onload()`
- [ ] Load user-defined callout types from settings and register them with `CalloutManager`
- [ ] Implement `addAdmonition()` and `removeAdmonition()` methods on the plugin class
- [ ] Pass all type sources (built-in, snippet, custom) to the modal when it opens

**Deliverable:** The full Phase 3 system is wired together and functional.

### 3.10 Test the management workflow
- [ ] Create a new custom callout type (with FA icon, custom color)
- [ ] Verify it appears in the modal and inserts correctly
- [ ] Edit the type (change icon, color, name)
- [ ] Delete the type
- [ ] Import types from JSON
- [ ] Export types to JSON
- [ ] Export types as CSS snippet
- [ ] Verify settings persist across restarts
- [ ] Verify CSS rules are correctly generated

**Deliverable:** Complete create/edit/delete/import/export workflow works end to end.

---

## Phase 4: Enhanced Detection — Live CSS Monitoring (Future)

This phase replaces the simple "scan on load" approach with Plugin B's real-time CSS detection pipeline. After this, callout types from themes and snippets are detected automatically as they change — no restart needed.

### 4.1 Port the CSS parser (`src/callout-detection/css-parser.ts`)
- [ ] Copy Plugin B's `css-parser.ts` and `css-parser.test.ts`
- [ ] Replace Plugin A's simpler regex parser with this more robust one

### 4.2 Port the Stylesheet Watcher (`src/callout-detection/css-watcher.ts`)
- [ ] Copy Plugin B's `css-watcher.ts`
- [ ] Copy `obsidian-helpers.ts` (the undocumented API wrappers)
- [ ] Wire into `main.ts` to start watching on layout ready

### 4.3 Port the Callout Collection (`src/callout-detection/callout-collection.ts`)
- [ ] Copy Plugin B's `callout-collection.ts` and `types.ts`
- [ ] Replace the simple snippet type array with the multi-source collection
- [ ] Track callout source attribution (built-in vs. theme vs. snippet vs. custom)

### 4.4 Port the Callout Resolver (optional)
- [ ] Copy Plugin B's `callout-resolver.ts` and `ui/callout-preview.ts`
- [ ] This enables accurate icon/color resolution via Shadow DOM
- [ ] Evaluate whether it's worth the complexity vs. regex parsing

### 4.5 Port detection settings
- [ ] Add Plugin B's three-toggle detection section (Obsidian, Theme, Snippet) to the settings tab
- [ ] Add conditional per-callout styling support (by theme, by color scheme)

### 4.6 Test live detection
- [ ] Install/change a theme → verify new callout types appear automatically
- [ ] Enable/disable a snippet → verify callout types update without restart
- [ ] Verify performance (no lag when CSS changes)

---

## Phase 5: Post-Processing Enhancements (Future)

This phase adds Plugin C's markdown post-processor features that modify how callouts look after they're rendered.

### 5.1 Collapsible callout animation
- [ ] Port the collapse/expand system with smooth CSS transitions
- [ ] Add settings toggles for collapsible behavior

### 5.2 Copy-to-clipboard button
- [ ] Port the copy button that appears on rendered callouts
- [ ] Add settings toggle

### 5.3 Drop shadow and visual options
- [ ] Port the drop shadow CSS class
- [ ] Add settings toggle

### 5.4 Custom title injection
- [ ] Port the title override system for rendered callouts

---

## Phase 6: Polish and Release Prep (Future)

### 6.1 README and documentation
- [ ] Finalize the README with feature descriptions, screenshots, and installation instructions
- [ ] Add usage examples and keyboard shortcut documentation

### 6.2 Community release checklist
- [ ] Review against Obsidian's [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [ ] Review against Obsidian's [Developer Policies](https://docs.obsidian.md/Developer+policies)
- [ ] Ensure no network calls without disclosure (Font Awesome icon pack downloads need a note)
- [ ] Test on mobile (iOS and Android) — mark `isDesktopOnly` if needed
- [ ] Create a GitHub release with `main.js`, `manifest.json`, `styles.css`
- [ ] Submit PR to `obsidianmd/obsidian-releases`

### 6.3 Localization
- [ ] Add additional language files beyond English
- [ ] Wire locale detection to `moment.locale()`

### 6.4 Testing framework
- [ ] Set up automated tests (at minimum for the CSS parser and validation)
- [ ] Add the test runner to the CI workflow

---

## What's Missing — Things Not in the Extracted Code

These are components that need to be **written new** during integration. They don't exist in any of the three plugin extractions because each source plugin handled them differently.

### Must build (Phase 1–3):

| Component | Why it's needed | Phase |
|-----------|----------------|-------|
| **Unified `main.ts`** | The three plugins each have their own entry points. We need one that initializes everything in the right order (settings → icons → callout manager → snippet parser → command registration). | 1 |
| **Unified type system** | Plugin A uses `BuiltInCalloutType`, Plugin B uses `Callout`, Plugin C uses `Admonition`. We need one shared model. | 1 |
| **Unified settings interface** | Each plugin stores different settings in different shapes. We need one `PluginSettings` interface that covers insertion preferences, detection toggles, custom type definitions, icon pack states, and behavior flags. | 1 |
| **Unified settings tab** | Each plugin has its own settings tab. We need one that organizes all settings into logical sections. | 3 |
| **Type adapter layer** | When the modal opens, it needs to merge built-in types, snippet types, and user-created types into one list. The three plugins format these differently, so we need code that normalizes them. | 3 |
| **Circular detection guard** | When Plugin C writes a custom callout CSS rule, Plugin B's watcher might detect it as a "snippet callout." We need logic to prevent this echo. | 4 |

### Nice to have (later):

| Component | Why | Phase |
|-----------|-----|-------|
| **Automated tests** | The extracted code has some tests (Plugin B's CSS parser). A proper test setup would help catch regressions. | 6 |
| **GitHub Actions release workflow** | Automate the release process (build, create release, attach artifacts). The current CI only lints. | 6 |
| **Mobile compatibility audit** | Some undocumented APIs (`app.customCss`) may not exist on mobile. Needs testing. | 6 |

---

## File Map — Where Everything Will Live

This is the target structure once all phases are complete:

```
enhanced-callout-manager/
├── manifest.json                    # Plugin identity and version
├── package.json                     # Dependencies and build scripts
├── tsconfig.json                    # TypeScript configuration
├── esbuild.config.mjs              # Build configuration
├── styles.css                       # Plugin CSS (modal styles + custom callout rules)
├── LICENSE                          # MIT license
├── ATTRIBUTION.md                   # Third-party code attribution
├── README.md                        # User-facing documentation
├── Todo List.md                     # This file
├── EXTRACTED_FUNCTIONALITY.md       # Reference: what was extracted
│
├── src/
│   ├── main.ts                      # Plugin entry point — lifecycle, commands, initialization
│   ├── types.ts                     # Shared type definitions and defaults
│   ├── settingsTab.ts               # Unified settings tab UI
│   ├── insertCalloutModal.ts        # Callout insertion modal (from Plugin A)
│   ├── snippetParser.ts             # CSS snippet scanner (from Plugin A)
│   │
│   ├── callout/
│   │   └── manager.ts              # CSS rule generation + snippet I/O (from Plugin C)
│   │
│   ├── icons/
│   │   ├── manager.ts              # Multi-source icon loading (from Plugin C)
│   │   └── packs.ts                # Downloadable icon pack definitions (from Plugin C)
│   │
│   ├── modal/
│   │   ├── iconSuggestionModal.ts  # Fuzzy icon search (from Plugin C)
│   │   ├── confirm.ts              # Confirmation dialog (from Plugin C)
│   │   └── export.ts               # Export selection dialog (from Plugin C)
│   │
│   ├── util/
│   │   ├── color.ts                # Color conversion utilities (merged from B + C)
│   │   ├── constants.ts            # Default callout definitions + SVG icons (from Plugin C)
│   │   └── validator.ts            # Input validation (from Plugin C)
│   │
│   ├── lang/
│   │   ├── helpers.ts              # Translation function (from Plugin C)
│   │   └── locale/
│   │       └── en.ts               # English strings (from Plugin C)
│   │
│   └── callout-detection/          # (Phase 4 — live CSS monitoring)
│       ├── index.ts                # Barrel export
│       ├── types.ts                # Detection-specific types
│       ├── css-parser.ts           # Robust CSS callout ID extractor
│       ├── css-watcher.ts          # Live stylesheet change monitor
│       ├── callout-collection.ts   # Multi-source registry
│       ├── callout-resolver.ts     # Shadow DOM CSS variable resolver
│       ├── obsidian-helpers.ts     # Undocumented API wrappers
│       └── ui/
│           └── callout-preview.ts  # Shadow DOM preview component
│
├── plugin A/                        # Extraction source — reference only
├── plugin B/                        # Extraction source — reference only
├── plugin C/                        # Extraction source — reference only
│
├── .github/workflows/lint.yml       # CI: build + lint on push
├── .editorconfig                    # Editor formatting rules
├── .gitignore                       # Git ignore rules
├── .npmrc                           # npm configuration
├── eslint.config.mts                # ESLint configuration
├── version-bump.mjs                 # Version bump script
└── versions.json                    # Version → minAppVersion mapping
```
