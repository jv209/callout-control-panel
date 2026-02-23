# README Notes — Pre-Release Checklist

> These notes are for the author. Address them before writing the final public README.

---

## Possible name change

The plugin is currently called **Callout Control Panel**. Before submitting to the community, confirm whether this name:
- Is descriptive enough for discovery in the community plugin browser
- Conflicts with any existing plugins
- Should be shortened (e.g. "Callout Studio", "Callout Suite") given the full scope of features

Whatever name is chosen, update `manifest.json` (`name`), `package.json` (`name`), and the README header consistently. The plugin ID (`callout-control-panel`) is separate and harder to change post-release, so only rename the display name.

---

## README must include — workflows this plugin is optimized for

Do not write a feature list README. Write a workflows README. The plugin was built around three real use-cases:

### Workflow 1: Fast callout insertion via hotkey
The primary reason someone installs this plugin. Assign a hotkey to "Insert callout" or "Insert callout (quick pick)" and never leave the keyboard. The full modal handles title + content; the quick-pick skips straight to type selection and inserts a blank callout block. Also cover the 5 favorite slots — power users bind their top 5 types to single keystrokes.

### Workflow 2: Working with custom callout types across a vault
The plugin generates a persistent CSS snippet so custom types survive plugin uninstall and work in publish/export contexts. The settings tab lets the user create, edit, and delete types with a live preview. Color and icon choices are immediately visible. The CSS snippet can be exported and shared.

### Workflow 3: Discovering what callout types a theme/snippet provides
The CSS Type Detection tab scans enabled snippets and the active theme, extracts callout type definitions, and presents them in a table with icon name, color, and any warnings (missing icon, missing color, invalid icon name). Users discover types they didn't know existed and can immediately use them via the insertion modal.

---

## Other helpful notes from development

- **Font Awesome packs**: The plugin can download icon packs (RPG Awesome, Octicons) from GitHub. The README must disclose this network access per Obsidian developer policy. Mention it requires an internet connection and only fires on explicit user action (the Download button).

- **Detection toggles**: Obsidian / Theme / Snippet toggles are independent. Users on heavily-themed vaults may want theme detection off if it shows too many types. Snippet detection covers only *enabled* snippets in `.obsidian/snippets/`.

- **Mobile**: `isDesktopOnly` is `false`. The insertion commands and quick-pick work on mobile. Icon pack downloads also work via `requestUrl`. The settings tab is usable but dense on narrow screens — note this in the README.

- **BRAT installation**: The plugin is distributed via BRAT before community submission. Include a one-line BRAT install note in the README pointing to this repo.

- **Manifest version mismatch** (compliance item): `manifest.json` still says v0.4.4. Sync it to the current release version before the community PR. See CLAUDE.md compliance review.

- **Callout color format**: Colors are stored as raw `"r, g, b"` RGB tuples, not hex. This is intentional — it matches Obsidian's own `--callout-color` convention, which allows the value to be used inside `rgb()` or `rgba()` with an opacity parameter.

---

## Sections the README needs (outline)

1. What it does (3-sentence summary)
2. Installation (BRAT + manual)
3. Workflows (see above — the three main ones)
4. Settings reference (each tab, brief)
5. Detection notes (what gets scanned, when to refresh)
6. Icon packs (what's available, network disclosure)
7. Custom type CSS format (for advanced users who write CSS manually)
8. Known limitations / compatibility notes
9. Credits and attribution (Plugin A/B/C sources)
