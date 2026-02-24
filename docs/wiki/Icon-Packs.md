# Icon Packs

The Icon Packs tab manages which icon sets are available when creating custom callout types.

## Built-in icons

Obsidian's built-in Lucide icons are always available. You don't need to enable or download anything — type any Lucide icon name (e.g., `lucide-star`, `lucide-heart`) in the icon field when creating a custom callout.

## Font Awesome

Font Awesome Free icons are bundled with the plugin. Toggle **Use Font Awesome icons** to make them available in the icon picker.

When Font Awesome is enabled, you can search for icons like `fas fa-coffee` or `far fa-bell` in the icon field. The icon picker shows Font Awesome results alongside Lucide results.

When disabled, Font Awesome icons are hidden from the picker. Existing custom types that use Font Awesome icons will still render if the icon data is cached.

## Downloadable packs

Additional icon packs can be downloaded from GitHub. These require an internet connection for the initial download only — after that, the icon data is stored locally in your vault.

Available packs:

| Pack | Description |
|------|-------------|
| **Octicons** | GitHub's icon set |
| **RPG Awesome** | Tabletop/RPG themed icons |

### Downloading a pack

1. Enable Font Awesome (required — additional packs extend the FA infrastructure)
2. Select a pack from the dropdown
3. Press the download button
4. Wait for the download to complete

### Managing installed packs

Each installed pack shows two buttons:

- **Redownload** — re-fetches the icon data from GitHub (useful if the pack was updated)
- **Remove** — deletes the local icon data. If any custom types use icons from this pack, a confirmation dialog appears first.

## Network access

Icon pack downloads fetch a JSON file from `raw.githubusercontent.com`. No request is made until you explicitly click the download button. No telemetry or analytics are collected.
