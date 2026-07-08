# Changelog

## 1.6.11

### Fixed

- **Plugin failed to load / would not toggle on after an update (popout windows).** `CalloutManager` created its stylesheet with `new CSSStyleSheet()` (bound to the window it was constructed in) and then adopted that instance into `activeDocument.adoptedStyleSheets`. When a popout or second window was focused during load/reload, `activeDocument` was a different document, so the adopt threw `NotAllowedError: Sharing constructed stylesheets in multiple documents is not allowed`, aborting `onload`. The plugin now injects a plain `<style>` element (no cross-document constraint) into the document head, cleaned up on unload. Persistent, all-window styling continues to come from the vault snippet. (`src/callout/manager.ts`)
- **Detected callouts using `rgb(...)` or hex colors showed an empty `rgb()` swatch in the settings Detection tab.** The snippet color parser only understood the bare `r, g, b` triplet; for any other valid CSS color the regex backtracked and captured the single space after the colon, which trimmed to an empty string and rendered as `rgb()`. Colors are now normalized from bare triplet, `rgb()`/`rgba()`, and hex (`#rrggbb` / `#rgb`) to the internal triplet, with unknown formats passed through verbatim. (`src/snippetParser.ts`)

## 1.6.10

### Fixed

- **Settings-page color swatches rendered black on Obsidian 1.13+.** The v1.6.4 fix updated every place that *sets* `--callout-color` to emit a full CSS color (`rgb(...)`) on Obsidian 1.13+, but the plugin's own stylesheet still *consumed* it as `rgb(var(--callout-color))`. On 1.13+ that expanded to `rgb(rgb(r, g, b))` — invalid CSS — so the swatch icons on the Detection and Custom Callouts settings tabs (and the insert / quick-pick modal previews) fell back to black. The editor was unaffected because Obsidian core reads `--callout-color` directly. Fix: the swatch CSS now reads `var(--callout-color)` directly, and the four swatch sites emit an always-valid CSS color via a new `formatSwatchColor()` helper (wraps a bare `r, g, b` triplet in `rgb(...)` on every Obsidian version; passes `var(...)`, `rgb(...)`, and hex through unchanged). The real live-preview callout in the edit modal keeps the version-gated `formatCalloutColor()`.
