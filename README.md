# Enhanced Callout Manager

An Obsidian plugin that unifies callout insertion, detection, and management into a single tool.

> **Status:** In development. See the [Todo List](Todo%20List.md) for the current plan and progress.

## What it does

Enhanced Callout Manager gives you one hotkey to insert any callout — built-in, theme-defined, snippet-defined, or custom types you've created yourself — through a single modal dialog.

### Features

**Insert callouts fast**
- Open a modal via hotkey or command palette
- Select from all available callout types in one dropdown
- Set a title, collapse state, and content
- Callout markdown is inserted at your cursor with smart formatting
- Keyboard shortcut (Ctrl/Cmd+Enter) to insert without clicking

**Detect callout types automatically**
- Scans your CSS snippet files for custom callout definitions
- Recognizes all 14 built-in Obsidian callout types and their aliases

**Create and manage custom callout types**
- Define new callout types with a name, icon, and color
- Choose icons from Obsidian's built-in set, Font Awesome, or downloadable packs (Octicons, RPG Awesome)
- Upload custom images as icons
- Edit or delete existing custom types
- Import and export type definitions as JSON
- Export types as a CSS snippet file

<!-- TODO: Add screenshots once the UI is implemented -->

## Installation

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder called `enhanced-callout-manager` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into that folder
4. Reload Obsidian
5. Enable the plugin in **Settings > Community plugins**

<!-- ### From the community plugin directory

1. Open **Settings > Community plugins**
2. Select **Browse** and search for "Enhanced Callout Manager"
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

### Assigning a hotkey

1. Open **Settings > Hotkeys**
2. Search for "Insert Callout"
3. Click the hotkey field and press your preferred key combination

### Creating a custom callout type

1. Open **Settings > Enhanced Callout Manager**
2. Under **Custom types**, select **Add new**
3. Enter a type name, choose an icon and color
4. Select **Save**

The custom type will immediately appear in the insertion modal and generate the appropriate CSS rule.

## Settings

| Setting | Description | Default |
|---------|------------|---------|
| Default callout type | The type pre-selected when the modal opens | `note` |
| Remember last used type | Use the last-inserted type as the default next time | Off |
| Auto-focus content field | Automatically focus the content textarea when the modal opens | On |
| Scan CSS snippets | Detect custom callout types from your `.obsidian/snippets/` CSS files | On |
| Inject color | Include `--callout-color` in generated CSS rules for custom types | On |

## Defining callouts in CSS snippets

If you have CSS snippets that define callout types, the plugin will detect them automatically. The expected format is:

```css
.callout[data-callout="your-type-name"] {
    --callout-color: 68, 138, 255;
    --callout-icon: lucide-star;
}
```

Both `--callout-color` (as an RGB tuple) and `--callout-icon` (as a Lucide icon name) are optional. If omitted, defaults will be used — and the plugin will show a warning so you know something is missing.

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

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Development build (watch mode)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Manual testing

Copy `main.js`, `manifest.json`, and `styles.css` to your vault:

```
<Vault>/.obsidian/plugins/enhanced-callout-manager/
```

Reload Obsidian and enable the plugin in **Settings > Community plugins**.

## License

MIT. See [LICENSE](LICENSE) for details.
