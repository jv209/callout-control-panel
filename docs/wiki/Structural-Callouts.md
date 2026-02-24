# Structural Callouts (No-Icon / Dashboards)

Structural callouts are callout types designed as layout containers rather than informational blocks. They typically have no icon and are used to build dashboards, multi-column layouts, and nested content structures.

## Creating a structural callout

1. Open **Settings > Callout Control Panel > Custom Callouts**
2. Press **+** to add a new type
3. Enter a type ID (e.g., `dashboard`, `sub1`, `container`)
4. Press **No icon** — this sets the icon to transparent
5. Choose a color (or disable color injection if you want to set it via CSS)
6. Save

The plugin generates:

```css
.callout[data-callout="dashboard"] {
    --callout-color: 32, 94, 166;
    --callout-icon: transparent;
}
```

## Fully hiding the icon area

The `transparent` value prevents the icon from rendering, but the icon container element still takes up space. To remove it entirely, add these CSS rules to a custom snippet:

```css
/* Hide the icon element */
.callout[data-callout="dashboard"] .callout-title-icon {
    display: none !important;
    width: 0 !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* Remove left padding from title and content */
.callout[data-callout="dashboard"] .callout-title,
.callout[data-callout="dashboard"] .callout-title-inner,
.callout[data-callout="dashboard"] .callout-content {
    margin-left: 0 !important;
    padding-left: 0 !important;
}
```

## Example: homepage dashboard

A common use case is building a homepage dashboard with nested callouts:

```markdown
> [!dashboard] My Dashboard
> > [!sub1] Quick Links
> > - [[Daily Note]]
> > - [[Projects]]
>
> > [!sub2] Recent Notes
> > - Note from today
> > - Note from yesterday
```

Each level (`dashboard`, `sub1`, `sub2`) is a structural callout with no icon and a distinct color for visual hierarchy.

## Detection

When the plugin detects `--callout-icon: transparent` in a CSS snippet, it displays the callout as "no-icon" in the settings panel. This is a display label only — the CSS value remains `transparent`.

## Tips

- Use different colors for each nesting level to create visual hierarchy
- Reduce the title padding (`--callout-title-padding: 0.25em`) for tighter layouts
- Set `max-width: 99%` on sub-sections to prevent overflow in nested layouts
- Structural callouts work well with the collapsible fold states (`+` and `-`) for progressive disclosure
