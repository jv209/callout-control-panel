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
| v0.6.7 | Settings UI polish and snippet lifecycle | 2026-02-21 |
| v0.6.8 | Detection fix and settings refinements | 2026-02-22 |
| v0.6.9 | Stale snippet data on refresh | 2026-02-22 |
| v0.7.0 | Post-processing enhancements | 2026-02-22 |
| v0.7.1 | Custom title injection | 2026-02-22 |
| v0.7.2 | Settings overhaul and collapse defaults | 2026-02-23 |
| v0.7.3 | Remove smooth transitions | 2026-02-23 |
| v0.7.4 | Compliance fixes and modular settings | 2026-02-23 |
| v0.7.5 | Plugin rename and version sync | 2026-02-23 |
| v0.7.6 | Mobile polish and no-icon support | 2026-02-24 |
| v0.7.7 | Mobile tab fix and ribbon guard | 2026-02-24 |
| v0.7.8 | Transparent icon detection fix | 2026-02-24 |
| v0.7.9 | Lint compliance (36 → 0 errors) | 2026-02-24 |
| v1.2.5 | Workflow docs and version sync | 2026-02-26 |
| v1.2.6 | Mobile keyboard avoidance for modals | 2026-02-26 |
| v1.2.7 | Robust mobile keyboard avoidance | 2026-02-26 |

**Next version: v1.2.8**

## Post-Phase 3 compliance review

Audit against official Obsidian developer guidelines (docs.obsidian.md/Plugins/Releasing/Plugin+guidelines, Submission+requirements, Developer+policies). Address these before community submission:

1. ~~**`outerHTML` read**~~ **FIXED v0.7.4** — replaced with `new XMLSerializer().serializeToString(node)` with explanatory comment.
2. **Inline `style.setProperty`** (low) — 3 files set `--callout-color` via inline style. This is how Obsidian's own callout coloring works, so it's idiomatically correct, but guideline 25 says prefer CSS classes/variables.
3. ~~**Title case in modals**~~ **FIXED v0.7.4** — `export.ts` now says "Export callout types". All other `titleEl.setText` calls already used sentence case.
4. ~~**`manifest.json` version mismatch**~~ **FIXED v0.7.5** — manifest.json, package.json, and versions.json all synced to v0.7.5.
5. ~~**Network access disclosure**~~ **FIXED v0.7.4** — README now has a "Network connections" section disclosing `raw.githubusercontent.com` access, trigger conditions, and data handling.

## Monetization decision

**Verdict: Release free via the community plugin directory. Use voluntary sponsorship, not feature gating.**

Obsidian's community plugin policy requires all listed plugins to be free and open-source. A "Basic vs Pro" split would require distributing outside the community store (e.g. Gumroad, custom BRAT), which cuts off the primary discovery channel and undermines the reputation built by a first plugin.

The three core workflows (insert, detect, manage) should always be free. Revenue options that are compatible with community listing:

- **GitHub Sponsors** — added to README and repository profile
- **Ko-fi / Buy Me a Coffee** — mentioned in README and release notes
- **Open Collective** — if the project grows to warrant a team

Do not gate features. Build reputation first, monetize second.

## Marketing plan (pre and post community release)

### Before submitting to the community directory

- [ ] Record a short demo video (2–3 min): show insert modal, quick pick, custom type creation, title overrides
- [ ] Write a release announcement post for r/ObsidianMD
- [ ] Write a post for the Obsidian community forum (forum.obsidian.md) in the "Share & Showcase" category
- [ ] Prepare a short written tutorial: "How to manage callouts in Obsidian with Callout Control Panel" — suitable for a blog post or the forum

### At release

- [ ] Publish the GitHub repository publicly
- [ ] Submit to the Obsidian community plugin directory (PR to obsidianmd/obsidian-releases)
- [ ] Post the forum announcement
- [ ] Post to r/ObsidianMD
- [ ] Tweet / post on social media with a link to the forum post and demo video
- [ ] Add GitHub Sponsors / Ko-fi link to README

### After acceptance

- [ ] Post in the Obsidian Discord #share-showcase channel
- [ ] Reach out to 1–2 Obsidian-focused YouTube creators (e.g. Nicole van der Hoeven, Linking Your Thinking) about coverage
- [ ] Write the full written tutorial and publish it (personal blog, Medium, or Substack)
- [ ] Record the video tutorial once the UI is stable — link from README and forum post
- [ ] Monitor the GitHub issues and the forum thread; respond to all bug reports within 48h to build credibility
