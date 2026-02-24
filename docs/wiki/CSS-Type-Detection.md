# CSS Type Detection

The CSS Type Detection tab controls which sources the plugin scans for callout type definitions.

## Detection sources

### Obsidian

Detects callouts defined in Obsidian's built-in stylesheet (`app.css`). This covers the 14 standard callout types (note, warning, tip, etc.) and any that Obsidian adds in future updates.

### Theme

Detects callouts defined by your active theme's CSS. Many themes add custom callout types — this toggle lets the plugin discover them automatically.

### Snippet

Detects callouts defined in your enabled CSS snippet files (`.obsidian/snippets/`). Only snippets that are toggled on in **Settings > Appearance > CSS snippets** are scanned. The plugin's own generated snippet (`callout-control-panel.css`) is excluded to avoid circular detection.

## Detected types list

When snippet or theme detection is on, the tab shows a count of detected types. Expand the "Show callouts" section to see a table with:

| Column | Description |
|--------|-------------|
| Icon | The resolved icon, colored with the callout's color |
| Callout | The type name as it appears in markdown |
| Icon Name | The `--callout-icon` value from CSS (or "—" if missing) |
| Color | The `--callout-color` RGB value (or "—" if missing) |
| Status | Warning icon if the color, icon, or icon name is invalid |

### Warning indicators

- **Missing color** — no `--callout-color` found; the callout uses the accent color
- **Missing icon** — no `--callout-icon` found; a default box icon is used
- **Invalid icon** — the declared icon name doesn't match any installed icon (shown with strikethrough)

### Malformed entries

If a snippet file contains CSS that looks like a callout definition but can't be parsed, a warning block appears at the bottom listing the affected files and entry counts.

## How detection works

The plugin uses two layers of detection:

1. **Regex parser** — fast, handles most standard callout definitions
2. **Shadow DOM resolver** — fallback for edge cases like CSS variable indirection or cascade conflicts

Detection runs automatically when snippets or themes change. You can also force a refresh with the refresh button next to the detected types count.

## Expected CSS format

```css
.callout[data-callout="your-type"] {
    --callout-color: 68, 138, 255;
    --callout-icon: lucide-star;
}
```

The color must be an RGB tuple (three comma-separated numbers). The icon should be a Lucide icon name. Use `transparent` for the icon to hide it entirely.
