# Custom Callouts

The Custom Callouts tab lets you create, edit, and delete your own callout types. Custom types appear in all insertion modals and generate CSS rules automatically.

## Adding a new type

1. Press the **+** button
2. Fill in the callout editor modal:
   - **Type ID** — the identifier used in markdown (e.g., `recipe`). No spaces allowed. Must be a valid CSS selector.
   - **Icon** — type to search for icons, or use one of the buttons:
     - **No icon** — hides the icon entirely (uses `--callout-icon: transparent` in CSS). Useful for structural callouts like dashboards.
     - **Upload image** — use a custom image as the icon (resized to 24px)
   - **Color** — pick a color with the color picker. Toggle color injection on/off per-type.
3. Press the checkmark to save

## Editing a type

Click the pencil icon next to any custom type in the list. The editor opens with the current values pre-filled. You can change any field, including the type ID (the old CSS rule is removed and a new one is created).

## Deleting a type

Click the trash icon next to the type. A confirmation dialog appears. Deleting a type removes its CSS rule from both the in-memory stylesheet and the snippet file.

## How CSS generation works

When you save a custom callout, the plugin:

1. Creates an in-memory `<style>` element for instant rendering
2. Writes a snippet file to `.obsidian/snippets/callout-control-panel.css` for persistence

Both are kept in sync. The snippet file means your callouts continue to work even if the plugin is disabled or removed. You can also edit the snippet file manually — the plugin won't overwrite your changes unless you edit the type through the settings UI.

## The type list

Custom types are displayed in a table:

| Column | Description |
|--------|-------------|
| Icon | Preview of the icon with the type's color |
| Callout | The type ID |
| Icon Name | The icon identifier (or "no-icon" for transparent icons) |
| Color | The RGB color value |
| Actions | Edit and delete buttons |

## Open snippets folder

On desktop, a folder icon button opens the `.obsidian/snippets/` directory in your file manager. This button is hidden on mobile since the file system is not directly accessible.
