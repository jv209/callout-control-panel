# Custom Type Creation Workflow

This workflow covers creating and managing your own callout types — from one-off types to a full library.

## Creating a new type

1. Open **Settings > Callout Control Panel > Custom Callouts**
2. Press the **+** button
3. Fill in the editor:
   - **Type ID** — the identifier used in markdown (e.g., `recipe`, `bug`, `meeting-notes`). No spaces.
   - **Icon** — search for any Lucide, Font Awesome, or downloaded icon pack icon. Or press **No icon** for structural callouts.
   - **Color** — pick a color. Toggle color injection on or off per-type.
4. Press the checkmark to save

The type is available immediately in the insertion modal and quick pick.

## What happens behind the scenes

When you save a custom type, the plugin:

1. Creates an in-memory style for instant rendering
2. Writes a CSS rule to `.obsidian/snippets/callout-control-panel.css`

The snippet file means your callouts persist even if the plugin is disabled or removed. Other users can copy that snippet file to their vault and see the same callouts — they don't need the plugin installed.

## Editing and deleting

- Click the **pencil icon** next to any type to edit it. You can change any field, including the type ID.
- Click the **trash icon** to delete. A confirmation dialog appears first.

## Sharing types between vaults

Use the Import / Export tab:

1. **Export** your types as a JSON file from vault A
2. Copy the file to vault B
3. **Import** it in vault B's plugin settings

Icon packs must be installed in both vaults for non-Lucide icons to render. See [Import and Export](Import-and-Export) for details.

## Building a callout library

If you plan to create many types, here are some tips:

- **Use consistent naming** — pick a convention (e.g., all lowercase, hyphens for spaces) and stick with it
- **Group related types by color** — use similar colors for related categories (e.g., all project management callouts in blues, all status callouts in greens)
- **Export regularly** — back up your definitions as JSON so you can restore them if anything goes wrong
- **Use structural callouts for layouts** — types with no icon work well as containers for dashboards and multi-column designs (see [Structural Callouts](Structural-Callouts))

## Combining with other workflows

Custom types integrate with everything else in the plugin:

- They appear in the **full modal** and **quick pick**
- They can be assigned to **favorite slots** for one-key insertion
- They are detected by the **CSS parser** if you edit the snippet file manually
- They can have **title overrides** applied in reading view

See [Custom Callouts](Custom-Callouts) for the full settings reference.
