# Callout Control Panel

An Obsidian plugin that unifies callout insertion, detection, and management into a single tool.

## What it does

Callout Control Panel gives you one hotkey to insert any callout — built-in, theme-defined, snippet-defined, or custom types you've created yourself — through a single modal dialog.

### Features

**Insert callouts fast**
- Open a modal via hotkey, command palette, or ribbon icon
- Select from all available callout types in one dropdown
- Set a title, collapse state, and content
- Callout markdown is inserted at your cursor with smart formatting
- Keyboard shortcut (Ctrl/Cmd+Enter) to insert without clicking

**Detect callout types automatically**
- Scans your CSS snippet files for custom callout definitions
- Detects callouts from your active theme
- Recognizes all 14 built-in Obsidian callout types and their aliases
- Live monitoring — changes to snippets and themes are picked up automatically

**Create and manage custom callout types**
- Define new callout types with a name, icon, and color
- Choose icons from Obsidian's built-in set, Font Awesome, or downloadable packs (Octicons, RPG Awesome)
- Upload custom images as icons
- Use "no-icon" for structural callouts like dashboards
- Edit or delete existing custom types
- Import and export type definitions as JSON
- Export types as a CSS snippet file

## Workflows

The plugin supports several workflows depending on how you use callouts. Pick the one that fits you best.

### Desktop: hotkey workflow

Best for keyboard-driven users who insert callouts frequently.

1. Open **Settings > Hotkeys** and assign a key to **Insert Callout** (full modal) or **Insert Callout (quick pick)**
2. Press the hotkey while editing — the modal opens instantly
3. Pick a type, set options, press Enter

For your most-used callouts, assign **Favorite Callout 1–5** to individual hotkeys. Each favorite inserts a specific type in one keystroke.

### Mobile: toolbar workflow

The easiest setup for phones and tablets.

1. Open **Settings > Mobile**
2. Under **Configure mobile toolbar**, add **Insert Callout (quick pick)**
3. Tap the toolbar icon to open the quick-pick list
4. Select a type — the callout is inserted at your cursor

You can also add individual favorites to the toolbar for one-tap access to your most-used types.

### Desktop or mobile: ribbon workflow

1. Enable the ribbon icon (it appears automatically when the plugin is active)
2. Tap/click the icon to open the quick-pick list
3. Select a callout type

### Custom type creation workflow

For users who want to design their own callout types:

1. Open **Settings > Callout Control Panel > Custom Callouts**
2. Press **+** to add a new type
3. Set the type ID (used in markdown), icon, and color
4. The type appears immediately in all insertion modals
5. The plugin generates a CSS snippet file in `.obsidian/snippets/` so your callouts persist even if the plugin is removed

## Installation

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder called `callout-control-panel` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into that folder
4. Reload Obsidian
5. Enable the plugin in **Settings > Community plugins**

<!-- ### From the community plugin directory

1. Open **Settings > Community plugins**
2. Select **Browse** and search for "Callout Control Panel"
3. Select **Install**, then **Enable** -->

## Usage

### Inserting a callout

1. Place your cursor in the editor (or select text to pre-fill the content)
2. Open the command palette (Ctrl/Cmd+P) and run **Insert Callout**, or use your assigned hotkey
3. Select a callout type, optionally set a title and collapse state
4. Press **Insert** (or Ctrl/Cmd+Enter)

The plugin inserts standard Obsidian callout syntax:

```markdown
> [!note] My title
> Content goes here
```

### Creating a custom callout type

1. Open **Settings > Callout Control Panel > Custom Callouts**
2. Press **+** to add a new type
3. Enter a type name, choose an icon and color
4. Press the checkmark to save

The custom type will immediately appear in the insertion modal and generate the appropriate CSS rule.

## Defining callouts in CSS snippets

If you have CSS snippets that define callout types, the plugin will detect them automatically. The expected format is:

```css
.callout[data-callout="your-type-name"] {
    --callout-color: 68, 138, 255;
    --callout-icon: lucide-star;
}
```

Both `--callout-color` (as an RGB tuple) and `--callout-icon` (as a Lucide icon name) are optional. If omitted, defaults will be used — and the plugin will show a warning so you know something is missing.

### Structural callouts (no-icon / dashboards)

You can create callouts without icons for use as structural containers — for example, dashboard layouts with nested callouts. In the custom callout editor, press **No icon** to set `--callout-icon: transparent` in the generated CSS.

In your own CSS snippets, use `transparent` as the icon value:

```css
.callout[data-callout="dashboard"] {
    --callout-color: 32, 94, 166;
    --callout-icon: transparent;
}
```

To fully hide the icon area, add these rules alongside your callout definition:

```css
.callout[data-callout="dashboard"] .callout-title-icon {
    display: none !important;
    width: 0 !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
}

.callout[data-callout="dashboard"] .callout-title,
.callout[data-callout="dashboard"] .callout-title-inner,
.callout[data-callout="dashboard"] .callout-content {
    margin-left: 0 !important;
    padding-left: 0 !important;
}
```

The plugin will detect these callouts and display them as "no-icon" in the settings panel.

## Troubleshooting

### My callout doesn't appear in the plugin at all

The plugin only scans **enabled** CSS snippets. Make sure your snippet is toggled on in **Settings > Appearance > CSS snippets**. If the snippet is enabled but the callout still doesn't appear, the CSS block may be malformed — the plugin will show a warning with the file name and number of unparseable entries. Check that your definition follows this structure:

```css
.callout[data-callout="your-type"] {
    --callout-color: 68, 138, 255;
    --callout-icon: lucide-star;
}
```

Common causes: missing quotes around the type name, a missing closing brace, or extra selectors that break the pattern.

### My callout shows a generic box icon

The plugin couldn't find a `--callout-icon` declaration in your CSS block, or the declared icon name doesn't exist. A warning triangle will appear next to the callout in the settings panel, and the tooltip will tell you whether the icon is missing or invalid. Check for typos in both the property name (`--callout-icons` instead of `--callout-icon`) and the icon name itself (`lucide-chef-hatt` instead of `lucide-chef-hat`). The icon name column will show the invalid name with a strikethrough so you can spot it quickly.

### My callout uses the accent color instead of my custom color

The plugin couldn't parse a `--callout-color` value from your CSS block. A warning triangle will appear next to the callout in the settings panel. The color must be an RGB tuple of three numbers — for example, `--callout-color: 68, 138, 255;`. Hex values (`#44a8ff`), `rgb()` wrappers, and CSS color names (`red`) are not supported by Obsidian's callout color system.

## Network connections

This plugin makes outbound network requests in one scenario only:

**Downloading optional icon packs** (Icon Packs tab in settings)

When you choose to download an additional icon pack (e.g. Octicons, RPG Awesome), the plugin fetches a JSON file from `raw.githubusercontent.com`. No request is made until you explicitly click the download button. Icon pack data is saved to your vault and used locally afterward — no further network access occurs.

Font Awesome icons are bundled with the plugin and require no network access.

No analytics, telemetry, or other data is ever collected or transmitted.

## Attribution

This plugin incorporates code from three open-source Obsidian plugins, all licensed under MIT:

- **[Editing Toolbar](https://github.com/cumany/obsidian-editing-toolbar)** by Cuman — callout insertion modal
- **[Callout Manager](https://github.com/eth-p/obsidian-callout-manager)** by eth-p — CSS callout detection pipeline
- **[Admonitions](https://github.com/valentine195/obsidian-admonition)** by Jeremy Valentine — callout management and icon system

See [ATTRIBUTION.md](ATTRIBUTION.md) for full license notices.

## License

MIT. See [LICENSE](LICENSE) for details.
