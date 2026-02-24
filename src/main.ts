import { Plugin, Notice, Platform, getIcon, setIcon } from "obsidian";
import {
	type CalloutTypeInfo,
	type CustomCallout,
	type PluginSettings,
	BUILTIN_CALLOUT_TYPES,
	DEFAULT_SETTINGS,
} from "./types";
import { EnhancedCalloutSettingTab, customCalloutToTypeInfo } from "./settingsTab";
import { InsertCalloutModal } from "./insertCalloutModal";
import { QuickPickCalloutModal } from "./quickPickCalloutModal";
import {
	type SnippetWarning,
	parseSnippetCalloutTypes,
	extractCalloutProperties,
} from "./snippetParser";
import { IconManager } from "./icons/manager";
import { CalloutManager } from "./callout/manager";
import {
	StylesheetWatcher,
	CalloutCollection,
	CalloutResolver,
	getCalloutsFromCSS,
} from "./callout-detection";
import type { Callout } from "./callout-detection/types";

export default class EnhancedCalloutManager extends Plugin {
	settings: PluginSettings;
	snippetTypes: CalloutTypeInfo[] = [];
	snippetWarnings: SnippetWarning[] = [];
	iconManager: IconManager;
	calloutManager: CalloutManager;
	stylesheetWatcher: StylesheetWatcher;
	calloutCollection: CalloutCollection;
	calloutResolver: CalloutResolver;

	/** Called whenever snippetTypes is rebuilt. Used by the settings tab to auto-refresh. */
	onTypesChanged?: () => void;

	/** CSS text from watcher events, keyed by source (e.g. "snippet:my-file"). */
	private cssTextCache = new Map<string, string>();

	async onload() {
		await this.loadSettings();

		this.iconManager = new IconManager({
			app: this.app,
			pluginId: this.manifest.id,
			settings: this.settings,
			saveSettings: () => this.saveSettings(),
		});

		this.calloutManager = new CalloutManager({
			app: this.app,
			iconManager: this.iconManager,
			settings: this.settings,
		});
		this.addChild(this.calloutManager);

		// Multi-source callout registry — tracks where each callout ID
		// comes from (built-in, theme, snippet, custom) and lazily
		// resolves properties (icon, color) on demand.
		this.calloutCollection = new CalloutCollection(
			(id) => this.resolveCalloutById(id),
		);

		// Seed with static built-in types
		this.calloutCollection.builtin.set(
			BUILTIN_CALLOUT_TYPES.map((t) => t.type),
		);

		// Seed with user-defined custom types
		const customIds = Object.keys(this.settings.customCallouts);
		if (customIds.length > 0) {
			this.calloutCollection.custom.add(...customIds);
		}

		this.addCommand({
			id: "insert-callout",
			name: "Insert callout",
			icon: "lucide-quote",
			editorCallback: () => {
				const defaultType = this.settings.rememberLastType
					? this.settings.lastUsedType
					: this.settings.defaultCalloutType;

				const customTypes = this.getCustomTypes();

				const modal = new InsertCalloutModal(this.app, {
					defaultType,
					autoFocusContent: this.settings.autoFocusContent,
					defaultCollapse: this.settings.defaultCollapseModal,
					snippetTypes: this.snippetTypes,
					customTypes,
					iconManager: this.iconManager,
				});

				const origClose = modal.close.bind(modal);
				modal.close = () => {
					if (this.settings.rememberLastType && modal.type) {
						this.settings.lastUsedType = modal.type;
						void this.saveSettings();
					}
					origClose();
				};

				modal.open();
			},
		});

		this.addCommand({
			id: "insert-callout-quick",
			name: "Insert callout (quick pick)",
			icon: "lucide-message-square-quote",
			editorCallback: () => this.openQuickPick(),
		});

		this.addCommand({
			id: "open-settings",
			name: "Open settings",
			icon: "lucide-cog",
			callback: () => {
				// app.setting is an undocumented Obsidian internal
				const setting = (
					this.app as unknown as {
						setting: {
							open(): void;
							openTabById(id: string): void;
						};
					}
				).setting;
				setting.open();
				setting.openTabById(this.manifest.id);
			},
		});

		// Favorite callout commands — 5 stable slots that users can
		// bind to hotkeys.  Each reads its assigned type at invocation
		// time, so rebinding in settings takes effect immediately.
		const favoriteIcons = [
			"lucide-dice-1", "lucide-dice-2", "lucide-dice-3",
			"lucide-dice-4", "lucide-dice-5",
		];
		for (let i = 0; i < 5; i++) {
			this.addCommand({
				id: `insert-favorite-${i + 1}`,
				name: `Insert favorite callout ${i + 1}`,
				icon: favoriteIcons[i],
				editorCallback: () => {
					const type = this.settings.favoriteCallouts[i];
					if (!type) return; // slot unassigned — no-op
					QuickPickCalloutModal.insertQuickCallout(this.app, type, this.settings.defaultCollapseQuickPick);
					if (this.settings.rememberLastType) {
						this.settings.lastUsedType = type;
						void this.saveSettings();
					}
				},
			});
		}

		this.addSettingTab(new EnhancedCalloutSettingTab(this.app, this));

		// Ribbon icon — opens the quick pick modal for fast callout insertion.
		// Hidden on mobile where the ribbon doesn't exist; users invoke the
		// same logic via the command palette or mobile toolbar instead.
		if (!Platform.isMobile) {
			this.addRibbonIcon("message-square-quote", "Insert callout (quick pick)", () => {
				this.openQuickPick();
			});
		}

		// ── Post-processor: callout enhancements ────────────────────
		this.registerMarkdownPostProcessor((el) => {
			const callouts = el.querySelectorAll<HTMLElement>(".callout");
			if (callouts.length === 0) return;

			for (const callout of Array.from(callouts)) {
				// 5.2 — Copy-to-clipboard button (bottom-right of callout)
				// The button is appended to .callout (not .callout-content) so that
				// Obsidian's own `position: relative` on .callout acts as the
				// containing block. This avoids theme conflicts that arise when we
				// add position:relative to .callout-content ourselves.
				if (this.settings.showCopyButton) {
					if (!callout.querySelector(".ccp-copy-button")) {
						const contentEl = callout.querySelector<HTMLElement>(".callout-content");
						const btn = callout.createDiv({ cls: "ccp-copy-button" });
						setIcon(btn, "copy");
						btn.setAttribute("aria-label", "Copy callout text");
						btn.addEventListener("click", (e) => {
							e.stopPropagation();
							const text = contentEl?.innerText ?? "";
							navigator.clipboard.writeText(text).then(
								() => new Notice("Copied to clipboard."),
								() => new Notice("Could not copy to clipboard."),
							);
						});
					}
				}

				// 5.4 — Custom title injection
				const overrides = this.settings.titleOverrides;
				if (overrides && Object.keys(overrides).length > 0) {
					const type = callout.getAttribute("data-callout")?.toLowerCase();
					if (type && overrides[type]) {
						const titleInner = callout.querySelector<HTMLElement>(".callout-title-inner");
						if (titleInner) {
							// Only override default titles (auto-generated from the type name),
							// not titles the user explicitly wrote in markdown.
							const current = (titleInner.textContent ?? "").trim().toLowerCase().replace(/[\s\-_]/g, "");
							const typeNorm = type.replace(/[\s\-_]/g, "");
							if (current === typeNorm) {
								titleInner.textContent = overrides[type];
							}
						}
					}
				}
			}
		});

		// Load icon packs, inject custom callout CSS, run initial scan,
		// and start live CSS monitoring once the workspace is ready.
		this.app.workspace.onLayoutReady(async () => {
			await this.iconManager.load();
			await this.calloutManager.loadCallouts(this.settings.customCallouts);

			// Disk-based scan as initial population (before watcher is ready)
			await this.refreshSnippetTypes();

			// Start live stylesheet monitoring — watcher events feed the
			// callout collection, which tracks source attribution. On
			// checkComplete, snippet types are rebuilt from the collection.
			this.stylesheetWatcher = new StylesheetWatcher(this.app);

			this.stylesheetWatcher.on('add', (ss) => {
				const det = this.settings.calloutDetection ?? { obsidian: true, theme: true, snippet: true };
				if (ss.type === 'snippet' && det.snippet) {
					const ids = getCalloutsFromCSS(ss.styles);
					this.cssTextCache.set(`snippet:${ss.snippet}`, ss.styles);
					this.calloutCollection.snippets.set(ss.snippet, ids);
				} else if (ss.type === 'theme' && det.theme) {
					const ids = getCalloutsFromCSS(ss.styles);
					this.cssTextCache.set('theme', ss.styles);
					this.calloutCollection.theme.set(ss.theme, ids);
				}
			});

			this.stylesheetWatcher.on('change', (ss) => {
				const det = this.settings.calloutDetection ?? { obsidian: true, theme: true, snippet: true };
				if (ss.type === 'snippet' && det.snippet) {
					const ids = getCalloutsFromCSS(ss.styles);
					this.cssTextCache.set(`snippet:${ss.snippet}`, ss.styles);
					this.calloutCollection.snippets.set(ss.snippet, ids);
				} else if (ss.type === 'theme' && det.theme) {
					const ids = getCalloutsFromCSS(ss.styles);
					this.cssTextCache.set('theme', ss.styles);
					this.calloutCollection.theme.set(ss.theme, ids);
				} else if (ss.type === 'obsidian' && det.obsidian) {
					// Obsidian built-in stylesheet — update builtin IDs
					const ids = getCalloutsFromCSS(ss.styles);
					this.cssTextCache.set('obsidian', ss.styles);
					this.calloutCollection.builtin.set(ids);
				}
			});

			this.stylesheetWatcher.on('remove', (ss) => {
				if (ss.type === 'snippet') {
					this.cssTextCache.delete(`snippet:${ss.snippet}`);
					this.calloutCollection.snippets.delete(ss.snippet);
				} else {
					this.cssTextCache.delete('theme');
					this.calloutCollection.theme.delete();
				}
			});

			this.stylesheetWatcher.on('checkComplete', (anyChanges) => {
				if (anyChanges) {
					// Reload Shadow DOM styles so resolver sees current CSS
					this.calloutResolver?.reloadStyles();
					// Always rebuild — the collection is seeded from disk
					// if csscache is unavailable, so this is always safe.
					this.rebuildDetectedTypes();
				}
			});

			// Shadow DOM resolver — verification fallback for cases where
			// regex can't extract properties (CSS variable indirection,
			// cascade/specificity conflicts). Created before watch() so
			// it's available when the initial checkComplete fires.
			this.calloutResolver = new CalloutResolver(this.app);
			this.register(() => this.calloutResolver.unload());

			this.register(this.stylesheetWatcher.watch());
		});
	}

	async loadSettings() {
		// loaded may contain old scanSnippets key from pre-v0.6.4 settings,
		// or null/corrupted values from a different plugin version.
		const loaded = (await this.loadData()) as Record<string, unknown> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});

		// Guard array and object fields against null/undefined from
		// corrupted data.json or different plugin versions.
		if (!Array.isArray(this.settings.icons)) this.settings.icons = [];
		if (!Array.isArray(this.settings.favoriteCallouts)) this.settings.favoriteCallouts = [];
		// Ensure favoriteCallouts always has exactly 5 slots so dropdown indices are stable.
		while (this.settings.favoriteCallouts.length < 5) {
			this.settings.favoriteCallouts.push("");
		}
		if (
			this.settings.customCallouts == null ||
			typeof this.settings.customCallouts !== "object" ||
			Array.isArray(this.settings.customCallouts)
		) {
			this.settings.customCallouts = {};
		}
		if (
			this.settings.titleOverrides == null ||
			typeof this.settings.titleOverrides !== "object" ||
			Array.isArray(this.settings.titleOverrides)
		) {
			this.settings.titleOverrides = {};
		}

		// Deep-merge calloutDetection so a partial or missing object
		// doesn't lose any of the three toggle keys.
		this.settings.calloutDetection = Object.assign(
			{},
			DEFAULT_SETTINGS.calloutDetection,
			(this.settings.calloutDetection != null &&
			typeof this.settings.calloutDetection === "object")
				? this.settings.calloutDetection
				: {},
		);

		// Migrate: if the user had explicitly disabled the old scanSnippets
		// toggle, honour that by disabling the new snippet toggle.
		if (loaded?.scanSnippets === false) {
			this.settings.calloutDetection.snippet = false;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Re-scan CSS snippets for custom callout types.
	 *
	 * If the watcher is running, seeds the collection from disk when
	 * csscache is unavailable, then triggers a watcher recheck which
	 * calls rebuildDetectedTypes() via the checkComplete event.
	 * Before the watcher starts, seeds the collection from disk directly.
	 */
	async refreshSnippetTypes(): Promise<void> {
		const det = this.settings.calloutDetection ?? { obsidian: true, theme: true, snippet: true };

		// Clear snippet data if snippet detection is off
		if (!det.snippet) {
			this.calloutCollection?.snippets.clear();
			for (const key of Array.from(this.cssTextCache.keys())) {
				if (key.startsWith("snippet:")) this.cssTextCache.delete(key);
			}
		}

		// Clear theme data if theme detection is off
		if (!det.theme) {
			this.cssTextCache.delete("theme");
			this.calloutCollection?.theme.delete();
		}

		if (this.stylesheetWatcher) {
			// Always re-seed from disk — the DOM-based watcher may not
			// see newly enabled/disabled snippets if csscache hasn't
			// updated yet.
			if (det.snippet) {
				await this.seedCollectionFromDisk();
			}
			// Force a full recheck, then always rebuild so disk-seeded
			// data is reflected even if the watcher detects no DOM changes.
			await this.stylesheetWatcher.checkForChanges(true);
			this.rebuildDetectedTypes();
		} else if (det.snippet) {
			// Watcher not yet started — seed collection from disk and rebuild.
			await this.seedCollectionFromDisk();
			this.rebuildDetectedTypes();
		} else {
			this.snippetTypes = [];
			this.snippetWarnings = [];
		}
	}

	/**
	 * Seed the callout collection and cssTextCache from a disk-based
	 * snippet scan. Clears stale snippet data first so that snippets
	 * disabled in Obsidian's Appearance settings are removed.
	 */
	private async seedCollectionFromDisk(): Promise<void> {
		const result = await parseSnippetCalloutTypes(this.app);

		// Clear all existing snippet data — only currently-enabled
		// snippets should remain after a refresh.
		this.calloutCollection.snippets.clear();
		for (const key of Array.from(this.cssTextCache.keys())) {
			if (key.startsWith("snippet:")) this.cssTextCache.delete(key);
		}

		for (const [snippetName, { ids, css }] of result.snippetMap) {
			this.cssTextCache.set(`snippet:${snippetName}`, css);
			this.calloutCollection.snippets.set(snippetName, ids);
		}
	}

	// ── Collection integration ────────────────────────────────────────────────

	/**
	 * Rebuild snippetTypes from the callout collection's snippet/theme
	 * sub-collections and cached CSS text. Called by the watcher's
	 * checkComplete handler.
	 */
	private rebuildDetectedTypes(): void {
		const builtinNames = new Set<string>();
		for (const bt of BUILTIN_CALLOUT_TYPES) {
			builtinNames.add(bt.type);
			for (const alias of bt.aliases ?? []) builtinNames.add(alias);
		}

		const types: CalloutTypeInfo[] = [];
		const warnings: SnippetWarning[] = [];
		const seen = new Set<string>();

		const det = this.settings.calloutDetection ?? { obsidian: true, theme: true, snippet: true };

		// Snippet-sourced callouts
		if (!det.snippet) {
			// Detection toggled off — wipe any stale snippet data
			this.calloutCollection.snippets.clear();
		}
		for (const snippetId of this.calloutCollection.snippets.keys()) {
			// Skip our own generated file to avoid circular detection
			if (snippetId === "callout-control-panel") continue;

			const ids = this.calloutCollection.snippets.get(snippetId) ?? [];
			const css = this.cssTextCache.get(`snippet:${snippetId}`) ?? "";

			// Malformed warning: compare loose mentions vs raw parser output.
			// Use getCalloutsFromCSS (raw, with duplicates) instead of the
			// collection's ids (which are stored in a Set and deduplicated).
			const rawParsedCount = getCalloutsFromCSS(css).length;
			const looseCount = (css.match(/\[data-callout[\^]?=/g) ?? []).length;
			if (looseCount > rawParsedCount) {
				warnings.push({
					file: `${snippetId}.css`,
					malformedCount: looseCount - rawParsedCount,
				});
			}

			for (const id of ids) {
				if (seen.has(id) || builtinNames.has(id)) continue;
				seen.add(id);

				const props = this.resolveDetectedProps(css, id);

				types.push({
					type: id,
					label: idToLabel(id),
					icon: props.icon,
					color: props.color,
					source: "snippet",
					iconDefault: props.iconDefault,
				});
			}
		}

		// Theme-sourced callouts
		const themeCss = det.theme ? (this.cssTextCache.get("theme") ?? "") : "";
		if (themeCss) {
			const themeIds = this.calloutCollection.theme.get();
			for (const id of themeIds) {
				if (seen.has(id) || builtinNames.has(id)) continue;
				seen.add(id);

				const props = this.resolveDetectedProps(themeCss, id);

				types.push({
					type: id,
					label: idToLabel(id),
					icon: props.icon,
					color: props.color,
					source: "theme",
					iconDefault: props.iconDefault,
				});
			}
		}

		// Validate icon names against Obsidian's icon set
		for (const st of types) {
			if (!st.iconDefault && st.icon !== "no-icon" && st.icon !== "transparent" && !getIcon(st.icon)) {
				st.iconInvalid = true;
			}
		}

		this.snippetTypes = types;
		this.snippetWarnings = warnings;

		// Notify the settings tab to re-render so the detected types
		// list updates after an async watcher event.
		this.onTypesChanged?.();
	}

	/**
	 * Extract properties for a detected callout using regex as the fast
	 * path. If the result looks uncertain (unresolved CSS variable, no
	 * properties found at all), falls back to the Shadow DOM resolver.
	 */
	private resolveDetectedProps(
		css: string,
		id: string,
	): { color: string; icon: string; iconDefault: boolean } {
		const props = extractCalloutProperties(css, id);

		// Fast path — regex found concrete values
		if (!CalloutResolver.needsVerification(props.color, props.iconDefault)) {
			return props;
		}

		// Fallback — use Shadow DOM resolver if available
		if (this.calloutResolver) {
			const resolved = this.calloutResolver.getCalloutProperties(id);
			if (resolved.color || resolved.icon) {
				return {
					color: resolved.color || props.color,
					icon: resolved.icon || props.icon,
					iconDefault: !resolved.icon && props.iconDefault,
				};
			}
		}

		return props;
	}

	/**
	 * Resolve a callout ID to its display properties.
	 * Used by the CalloutCollection's lazy resolver.
	 */
	private resolveCalloutById(id: string): Omit<Callout, 'sources'> {
		// Built-in types — static lookup
		const builtin = BUILTIN_CALLOUT_TYPES.find((t) => t.type === id);
		if (builtin) return { id, color: builtin.color, icon: builtin.icon };

		// Custom types — from settings
		const custom = this.settings.customCallouts[id];
		if (custom) {
			return { id, color: custom.color, icon: custom.icon.name ?? "lucide-box" };
		}

		// Snippet/theme types — extract from cached CSS, with resolver fallback
		for (const css of this.cssTextCache.values()) {
			const props = this.resolveDetectedProps(css, id);
			if (props.color !== "var(--callout-default)" || !props.iconDefault) {
				return { id, color: props.color, icon: props.icon };
			}
		}

		return { id, color: "var(--callout-default)", icon: "lucide-box" };
	}

	// ── Custom callout CRUD ───────────────────────────────────────────────────

	async addCustomCallout(callout: CustomCallout): Promise<void> {
		this.settings.customCallouts[callout.type] = callout;
		await this.calloutManager.addCallout(callout);
		this.calloutCollection.custom.add(callout.type);
		await this.saveSettings();
	}

	async removeCustomCallout(callout: CustomCallout): Promise<void> {
		delete this.settings.customCallouts[callout.type];
		await this.calloutManager.removeCallout(callout);
		this.calloutCollection.custom.delete(callout.type);
		await this.saveSettings();
	}

	async editCustomCallout(
		oldType: string,
		callout: CustomCallout,
	): Promise<void> {
		if (oldType !== callout.type) {
			const old = this.settings.customCallouts[oldType];
			if (old) await this.calloutManager.removeCallout(old);
			delete this.settings.customCallouts[oldType];
			this.calloutCollection.custom.delete(oldType);
		}
		this.settings.customCallouts[callout.type] = callout;
		await this.calloutManager.addCallout(callout);
		this.calloutCollection.custom.add(callout.type);
		await this.saveSettings();
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	/** Open the quick-pick modal. Shared by the command and the ribbon icon. */
	private openQuickPick(): void {
		const customTypes = this.getCustomTypes();
		const modal = new QuickPickCalloutModal(
			this.app,
			customTypes,
			this.snippetTypes,
			(type) => {
				QuickPickCalloutModal.insertQuickCallout(this.app, type, this.settings.defaultCollapseQuickPick);
				if (this.settings.rememberLastType) {
					this.settings.lastUsedType = type;
					void this.saveSettings();
				}
			},
			this.iconManager,
		);
		modal.open();
	}

	/** Convert persisted custom callouts to CalloutTypeInfo for use in modals. */
	private getCustomTypes(): CalloutTypeInfo[] {
		return Object.values(this.settings.customCallouts).map((cc) =>
			customCalloutToTypeInfo(cc, this.settings.injectColor),
		);
	}
}

/** Title-case a callout ID for display (e.g. "my-recipe" → "My Recipe"). */
function idToLabel(id: string): string {
	return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
