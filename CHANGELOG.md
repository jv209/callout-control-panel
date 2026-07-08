# Changelog

## 1.6.10

### Fixed

- **Settings-page color swatches rendered black on Obsidian 1.13+.** The v1.6.4 fix updated every place that *sets* `--callout-color` to emit a full CSS color (`rgb(...)`) on Obsidian 1.13+, but the plugin's own stylesheet still *consumed* it as `rgb(var(--callout-color))`. On 1.13+ that expanded to `rgb(rgb(r, g, b))` — invalid CSS — so the swatch icons on the Detection and Custom Callouts settings tabs (and the insert / quick-pick modal previews) fell back to black. The editor was unaffected because Obsidian core reads `--callout-color` directly. Fix: the swatch CSS now reads `var(--callout-color)` directly, and the four swatch sites emit an always-valid CSS color via a new `formatSwatchColor()` helper (wraps a bare `r, g, b` triplet in `rgb(...)` on every Obsidian version; passes `var(...)`, `rgb(...)`, and hex through unchanged). The real live-preview callout in the edit modal keeps the version-gated `formatCalloutColor()`.
