# Default Settings

The Default Settings tab controls how callouts are inserted and how the plugin behaves by default.

## Settings

### Default callout type

The callout type that is pre-selected when the insertion modal opens. Defaults to `note`. You can set this to any available type — built-in, snippet-detected, or custom.

### Remember last used type

When enabled, the plugin remembers the last callout type you inserted and uses it as the default next time you open the modal. Overrides the "Default callout type" setting.

### Auto-focus content

When enabled, the cursor is placed in the content textarea when the insertion modal opens, so you can start typing immediately. When disabled, focus stays on the type dropdown.

### Inject callout colors

Controls whether the plugin includes `--callout-color` in the CSS rules it generates for custom callout types. When enabled (default), each custom type gets its color baked into the CSS. When disabled, you must set colors manually in your own CSS.

This is a global default. You can override it per-type in the custom callout editor.

### Copy button

Adds a small copy-to-clipboard button to the bottom-right corner of every callout in reading view. The button appears on hover and copies the callout's content text (not the markdown source).

### Default collapse state (modal)

Sets the default fold state when inserting a callout via the full insertion modal:

- **Default (no fold)** — standard callout, always visible
- **Open (+)** — collapsible, starts expanded
- **Closed (-)** — collapsible, starts collapsed

### Default collapse state (quick pick)

Same as above, but applies when inserting via the quick pick modal or a favorite callout command.
