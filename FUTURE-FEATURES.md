# Future Features — To Be Considered

Items that have been scoped out but are not on the current roadmap. Revisit after Phase 6 (community release).

---

## High priority

### Callout nesting support

**Problem:** Obsidian does not natively support nested callouts (a callout inside a callout). This is a frequent pain point. Workarounds exist (escaped `>` markers) but require manual formatting.

**Potential approach:**
- Detect nested callout patterns in the insertion modal (e.g. "insert inside current callout")
- Generate the correct `>` indentation automatically
- May require post-processor support to parse and render nested structure correctly
- Investigate whether this is a renderer limitation or a markdown spec issue

---

## Medium priority

### Callout statistics

**Problem:** Users have no visibility into how they use callouts across their vault.

**Potential approach:**
- Scan all markdown files for callout usage at load time (or on-demand)
- Track counts by type, file, and date
- Display as a simple bar chart or table in a dedicated settings tab or modal
- Could surface "most used" data to auto-populate the Favorites tab

**Notes:** More aesthetic than practical. Good candidate for a dedicated tab once the core feature set is stable.

---

## Lower priority

### Theme callout gallery

**Problem:** Theme-defined callouts are hard to discover — you have to look at the theme's CSS or documentation.

**Potential approach:**
- When a theme is active and detection is on, present detected theme callouts with a live preview grid
- Show color, icon, and name for each detected type
- Let users pin theme types to their favorites directly from the gallery

---

## Research required

### Callout-to-admonition migration

**Background:** The Admonitions plugin (by Jeremy Valentine) predates Obsidian's native callout system. Admonition blocks use a different syntax (```` ```ad-type ```` fenced blocks) rather than the `> [!type]` blockquote syntax. Many older vaults use Admonition syntax.

**What would be needed:**
- Parse existing Admonition blocks in vault files
- Convert to equivalent native callout syntax
- Handle type mappings (Admonition types do not 1:1 match Obsidian callout types)
- Provide a dry-run preview before making changes
- This is a destructive vault operation — needs confirmation, backup prompts, undo support

**Research first:** Understand the full Admonition syntax spec and whether Jeremy Valentine's plugin exports a migration path already.

---

## Deferred without a clear path

- Per-callout font/size overrides (conflicts with theme authority)
- Callout templates (predefined title + content combos) — overlaps with Templater
- Callout drag-and-drop reordering in reading view — likely not feasible without editor extensions
