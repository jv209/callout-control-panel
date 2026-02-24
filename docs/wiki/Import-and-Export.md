# Import and Export

The Import / Export tab lets you back up, share, and restore your custom callout type definitions.

## Export as CSS snippet

*Desktop only.* Downloads a `.css` file containing the CSS rules for all your custom callout types. This is the same content as the auto-generated `callout-control-panel.css` snippet file, but as a standalone download you can share or use in other vaults.

## Export as JSON

Saves your custom callout definitions as a JSON file. Two options:

- **Download all** — exports every custom type
- **Select & download** — opens a modal where you can check which types to include

The JSON format stores the full type definition including type ID, icon definition (name, type, pack), color, and color injection setting.

### JSON format example

```json
[
  {
    "type": "recipe",
    "icon": { "name": "lucide-chef-hat", "type": "obsidian" },
    "color": "68, 138, 255",
    "injectColor": true
  }
]
```

## Import from JSON

Loads callout type definitions from one or more JSON files.

1. Press **Choose files**
2. Select one or more `.json` files
3. The plugin validates each entry and imports valid types

### Validation during import

- **Type ID** — must be non-empty, no spaces, valid CSS selector, not already in use
- **Icon** — if specified, checked against installed icon packs. A warning is shown if the icon isn't found (the type is still imported)
- **Color** — must be a valid RGB tuple (`R, G, B`). If missing or invalid, a random color is assigned

### Sharing types between vaults

1. Export your types as JSON from vault A
2. Copy the file to vault B
3. Import it in vault B's plugin settings

The icon packs must be installed in both vaults for non-Lucide icons to render correctly. If an icon pack is missing, the import succeeds but the icon won't display until the pack is installed.
