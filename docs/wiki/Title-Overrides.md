# Title Overrides

The Title Overrides tab lets you replace the default display title for specific callout types in reading view.

## What it does

By default, Obsidian displays the callout type name as the title (e.g., a `> [!note]` callout shows "Note" as the title). Title overrides replace this default title with text you choose.

Overrides only apply to callouts that use the **default title** — if you write an explicit title in markdown (e.g., `> [!note] My custom title`), the override is not applied.

## Adding an override

1. Select a callout type from the dropdown
2. Type the custom title in the text field
3. Press **+** to save

Types that already have an override are excluded from the dropdown.

## Editing an override

Each override in the list has an inline text input. Change the text and press Enter or click away — the new title saves automatically. Clear the text to remove the override.

## Removing an override

Click the trash icon next to the override. The callout reverts to its default title.

## Examples

| Type | Default title | Override |
|------|--------------|----------|
| `note` | Note | Memo |
| `warning` | Warning | Heads up |
| `todo` | Todo | Action item |
| `dashboard` | Dashboard | *(empty — shows nothing)* |

## Technical details

- Overrides work in reading view only (the markdown source is not modified)
- Title matching is case-insensitive and ignores hyphens, underscores, and spaces
- Overrides are stored in `data.json` as a `titleOverrides` object mapping type IDs to title strings
