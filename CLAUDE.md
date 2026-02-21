# CLAUDE.md

## Workflow requirements

After every completed task, provide the following four items:

1. **Pull request title** — short, under 70 characters
2. **Pull request description** — summary bullets and test plan
3. **Version/release title** — suitable for a GitHub release
4. **Version/release description** — what changed, aimed at end users

## Version tracking

**Check this section before suggesting a version number.** The next version must be higher than the latest listed here. Minor corrections and small changes increment the patch version (e.g., v0.4.1, v0.4.2, ... v0.4.12). Patch numbers can go into double digits.

| Version | Release title | Date |
|---------|--------------|------|
| v0.0.4 | License and attribution | — |
| v0.0.6 | Clean slate for development | — |
| v0.0.7 | Clean build pipeline confirmed | — |
| v0.1.0-alpha.1 | Unified Type System | — |
| v0.1.0-alpha.2 | Insertion Modal | — |
| v0.1.0-alpha.3 | Modal Styling | — |
| v0.1.0 | Working BRAT-installable release | — |
| v0.1.1 | Plugin activation and roadmap update | — |
| v0.2.0 | Quick-pick insertion and settings command | — |
| v0.3.0 | Phase 1 complete | — |
| v0.4.0 | Snippet type metadata display | — |
| v0.4.1 | Tooltip and indentation corrections | — |
| v0.4.2 | Collapsible detected types | — |
| v0.4.3 | Missing icon warnings and troubleshooting | 2026-02-17 |
| v0.4.4 | Invalid icon name detection | 2026-02-17 |
| v0.4.5 | Human-readable build output | 2026-02-18 |
| v0.4.6 | Phase 3 roadmap and design decisions | 2026-02-18 |
| v0.4.7 | Icon Manager port from Plugin C | 2026-02-18 |
| v0.5.0 | Version tracking catch-up | 2026-02-18 |
| v0.5.1 | Icon Suggestion Modal port | 2026-02-18 |
| v0.5.2 | Callout Manager port | 2026-02-18 |
| v0.5.3 | Color and validation utilities | 2026-02-18 |
| v0.5.4 | Confirmation and export modals | 2026-02-18 |
| v0.5.5 | Localization system | 2026-02-18 |
| v0.5.7 | Unified settings tab and custom type insertion | 2026-02-19 |
| v0.5.8 | Favorite commands and circular detection guard | 2026-02-19 |
| v0.5.9 | Settings crash fix and collapsible custom types | 2026-02-19 |
| v0.5.10 | Tabbed settings and UI polish | 2026-02-19 |
| v0.5.11 | All-tab layout and icon pack crash fix | 2026-02-19 |
| v0.5.12 | Document plugin features | 2026-02-20 |
| v0.6.0 | Robust CSS parser and test framework | 2026-02-20 |
| v0.6.1 | Live stylesheet watcher | 2026-02-20 |
| v0.6.2 | Multi-source callout collection | 2026-02-20 |
| v0.6.3 | Hybrid callout resolver | 2026-02-20 |
| v0.6.4 | Detection source toggles | 2026-02-21 |
| v0.6.5 | Settings crash fix and detection fallback | 2026-02-21 |
| v0.6.6 | Detection reliability and settings polish | 2026-02-21 |

**Next version: v0.6.7**

## Post-Phase 3 compliance review

Audit against official Obsidian developer guidelines (docs.obsidian.md/Plugins/Releasing/Plugin+guidelines, Submission+requirements, Developer+policies). Address these before community submission:

1. **`outerHTML` read** (medium) — `callout/manager.ts:100` uses `.outerHTML` as a getter to serialize SVG into CSS. Reviewers flag any use of `innerHTML`/`outerHTML`/`insertAdjacentHTML`. Inherited from obsidian-admonition; defensible but will draw a comment.
2. **Inline `style.setProperty`** (low) — 3 files set `--callout-color` via inline style. This is how Obsidian's own callout coloring works, so it's idiomatically correct, but guideline 25 says prefer CSS classes/variables.
3. **Title case in modals** (low) — `export.ts:31` uses "Export Callout Types"; should be "Export callout types" per sentence case guideline. Check all modal titles.
4. **`manifest.json` version mismatch** (high) — manifest says v0.4.4, but latest tracked version is v0.5.7. Must be synced before release.
5. **Network access disclosure** (medium) — `IconManager` downloads icon packs from `raw.githubusercontent.com` via `requestUrl()`. Developer policy requires README to disclose all network connections with justification.
