# Favorite Callouts Workflow

If you use the same handful of callout types repeatedly, the favorites system lets you skip the type picker entirely. You get up to 5 slots, each mapped to a dedicated command that you can bind to a hotkey (desktop) or a toolbar button (mobile).

## Setting up favorites

1. Open **Settings > Callout Control Panel > Most Used Callouts**
2. For each slot (Favorite 1–5), select a callout type from the dropdown
3. Leave unused slots set to "— (none)"

The dropdown shows all available types grouped by source: Custom, Snippet, and Default.

## Desktop: hotkeys for favorites

1. Open **Settings > Hotkeys**
2. Search for "Insert favorite callout"
3. Assign a key combination to each slot you've configured

Now pressing that key inserts the assigned callout type in one keystroke — no modal, no picker.

## Mobile: toolbar buttons for favorites

1. Open **Settings > Mobile > Configure mobile toolbar**
2. Add one or more "Insert favorite callout" commands
3. Each one becomes a toolbar icon that inserts its assigned type with a single tap

## Changing favorites over time

Your callout needs may change as your vault grows. Favorites are designed for this:

- Changing the type assigned to a slot takes effect immediately — no restart needed
- The hotkey or toolbar button stays the same; only the callout type it inserts changes
- You can rotate your favorites as often as you like

For example, during a project sprint you might set Favorite 1 to `task` and Favorite 2 to `warning`. When the project wraps up, swap them to `note` and `tip` for your regular writing.

## How favorites insert

- Favorites insert a bare callout block (like the quick pick), using the **Default collapse state (quick pick)** setting
- The "Remember last used type" setting also applies — inserting a favorite updates the remembered type
- Empty slots do nothing when triggered

## Suggested setups

These are just ideas to get you started:

**General writing**
| Slot | Type |
|------|------|
| 1 | note |
| 2 | tip |
| 3 | warning |
| 4 | quote |
| 5 | todo |

**Project management**
| Slot | Type |
|------|------|
| 1 | todo |
| 2 | warning |
| 3 | success |
| 4 | question |
| 5 | bug |

**Dashboard builder**
| Slot | Type |
|------|------|
| 1 | dashboard |
| 2 | sub1 |
| 3 | sub2 |
| 4 | note |
| 5 | tip |

See [Most Used Callouts](Most-Used-Callouts) for the full settings reference.
