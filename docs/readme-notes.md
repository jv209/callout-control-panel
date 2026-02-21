# README Notes — Pre-Release Reference

> Internal notes for the author. Address before writing the final public README and before community submission.

---

## Possible name change

The plugin currently uses the ID `enhanced-callout-manager` and display name **Enhanced Callout Manager**.
Before the community PR, decide whether to keep this or rename the display name to something shorter/more discoverable (e.g. "Callout Studio", "Callout Suite", "Callout Toolkit").

**Important:** The plugin *ID* in `manifest.json` is hard to change post-release (users would lose their settings). Only the display `name` field is safe to rename. If you rename:
- `manifest.json` → `name`
- `package.json` → `name` (optional, cosmetic)
- README header and any references in documentation

The ID `enhanced-callout-manager` stays as-is regardless.

---

## README must cover — workflows this plugin is optimized for

Write a *workflows* README, not a feature-list README. Three primary workflows drove every design decision:

### Workflow 1: Fast callout insertion via hotkey
- "Insert callout" — opens full modal (type, title, collapse, content)
- "Insert callout (quick pick)" — skips modal, picks type and immediately inserts blank block
- 5 favorite slots — user assigns their top types and binds them to single keystrokes
- All three work independently; no configuration required to start using them

### Workflow 2: Managing custom callout types
- Create types with a custom name, icon (Lucide / Font Awesome / image), and color
- Live preview in the edit modal
- CSS is written both in-memory (instant rendering) and to `.obsidian/snippets/enhanced-callout-manager.css` (persists after plugin uninstall, readable by Obsidian Publish)
- Types can be exported as JSON or CSS and shared with others
- JSON import lets you load a set of community-shared types

### Workflow 3: Discovering what callout types a theme or snippet defines
- CSS Type Detection tab scans enabled snippets and the active theme
- Shows a table: type name, icon, color, and any warnings (missing icon, missing color, invalid icon name)
- Three independent toggles: Obsidian built-in / Theme / Snippet sources
- Detected types flow into the insertion modal automatically — no setup needed
- Refresh button and auto-refresh after CSS changes

---

## Key technical facts to mention in the README

- **Color format**: Colors are stored as `"r, g, b"` RGB tuples (e.g. `"68, 138, 255"`), not hex. This matches Obsidian's `--callout-color` CSS variable convention and allows `rgba()` usage.
- **Font Awesome**: FA Free icons are bundled; downloadable packs (RPG Awesome, Octicons) fetch from GitHub. **Must disclose network access** per Obsidian developer policy — note that downloads only happen on explicit user action (the Download button in Icon Packs tab).
- **Mobile**: `isDesktopOnly: false`. Insertion commands, quick-pick, and custom type management all work on mobile. Settings tab is functional but dense on narrow screens.
- **Detection fallback**: The watcher reads from `app.customCss.csscache` (undocumented Obsidian internal). If that's unavailable (some Obsidian builds), the plugin falls back to disk-scanning `.obsidian/snippets/` directly. Detection works in both cases.
- **Snippet file safety**: The plugin skips its own generated snippet (`enhanced-callout-manager.css`) during detection to prevent circular detection of custom types.
- **BRAT installation**: Until the community PR is accepted, users install via BRAT. Include a one-liner pointing to this repo.

---

## Compliance items to address before community PR (from CLAUDE.md)

1. **(high)** `manifest.json` version mismatch — update to current release version
2. **(medium)** `outerHTML` usage in `callout/manager.ts:100` — inherited from obsidian-admonition; prepare a comment explaining it
3. **(medium)** Network access disclosure in README — required for the icon pack downloader
4. **(low)** Modal title case — check all modal titles use sentence case per Obsidian guidelines
5. **(low)** `style.setProperty` for `--callout-color` — idiomatic but may get a reviewer comment

---

## README outline (suggested structure)

1. What it does (3-sentence hook)
2. Installation (BRAT + eventual community plugin)
3. Workflow 1: Insertion (hotkey, modal, quick-pick, favorites)
4. Workflow 2: Custom types (create, edit, export, import)
5. Workflow 3: Detection (what gets scanned, toggles, warnings)
6. Icon packs (FA, downloadable packs, network disclosure)
7. Settings reference (one paragraph per tab)
8. Known limitations / compatibility
9. Credits (Plugin A / B / C attribution, links to originals)
