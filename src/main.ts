import { Plugin, getIcon } from "obsidian";
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
			editorCallback: () => {
				const defaultType = this.settings.rememberLastType
					? this.settings.lastUsedType
					: this.settings.defaultCalloutType;

				const customTypes = this.getCustomTypes();

				const modal = new InsertCalloutModal(this.app, {
					defaultType,
					autoFocusContent: this.settings.autoFocusContent,
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
			editorCallback: () => {
				const customTypes = this.getCustomTypes();
				const modal = new QuickPickCalloutModal(
					this.app,
					customTypes,
					this.snippetTypes,
					(type) => {
						QuickPickCalloutModal.insertQuickCallout(this.app, type);
						if (this.settings.rememberLastType) {
							this.settings.lastUsedType = type;
							void this.saveSettings();
						}
					},
					this.iconManager,
				);
				modal.open();
			},
		});

		this.addCommand({
			id: "open-settings",
			name: "Open settings",
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
		for (let i = 0; i < 5; i++) {
			this.addCommand({
				id: `insert-favorite-${i + 1}`,
				name: `Insert favorite callout ${i + 1}`,
				editorCallback: () => {
					const type = this.settings.favoriteCallouts[i];
					if (!type) return; // slot unassigned — no-op
					QuickPickCalloutModal.insertQuickCallout(this.app, type);
					if (this.settings.rememberLastType) {
						this.settings.lastUsedType = type;
						void this.saveSettings();
					}
				},
			});
		}

		this.addSettingTab(new EnhancedCalloutSettingTab(this.app, this));

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
				const ids = getCalloutsFromCSS(ss.styles);
				if (ss.type === 'snippet') {
					this.cssTextCache.set(`snippet:${ss.snippet}`, ss.styles);
					this.calloutCollection.snippets.set(ss.snippet, ids);
				} else {
					this.cssTextCache.set('theme', ss.styles);
					this.calloutCollection.theme.set(ss.theme, ids);
				}
			});

			this.stylesheetWatcher.on('change', (ss) => {
				const ids = getCalloutsFromCSS(ss.styles);
				if (ss.type === 'snippet') {
					this.cssTextCache.set(`snippet:${ss.snippet}`, ss.styles);
					this.calloutCollection.snippets.set(ss.snippet, ids);
				} else if (ss.type === 'theme') {
					this.cssTextCache.set('theme', ss.styles);
					this.calloutCollection.theme.set(ss.theme, ids);
				} else {
					// Obsidian built-in stylesheet — update builtin IDs
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
				if (anyChanges && this.settings.scanSnippets) {
					this.rebuildDetectedTypes();
				}
			});

			this.register(this.stylesheetWatcher.watch());
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Re-scan CSS snippets for custom callout types.
	 *
	 * If the watcher is running, triggers a full recheck (which will
	 * update the collection and rebuild detected types via events).
	 * Otherwise falls back to disk-based scanning.
	 */
	async refreshSnippetTypes(): Promise<void> {
		if (!this.settings.scanSnippets) {
			this.snippetTypes = [];
			this.snippetWarnings = [];
			this.calloutCollection?.snippets.clear();
			return;
		}

		if (this.stylesheetWatcher) {
			// Watcher is active — force a full recheck.
			// The checkComplete handler will call rebuildDetectedTypes().
			await this.stylesheetWatcher.checkForChanges(true);
		} else {
			// Fallback: disk-based scan (before watcher is initialized)
			const result = await parseSnippetCalloutTypes(this.app);
			for (const st of result.types) {
				if (!st.iconDefault && !getIcon(st.icon)) {
					st.iconInvalid = true;
				}
			}
			this.snippetTypes = result.types;
			this.snippetWarnings = result.warnings;
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

		// Snippet-sourced callouts
		for (const snippetId of this.calloutCollection.snippets.keys()) {
			// Skip our own generated file to avoid circular detection
			if (snippetId === "enhanced-callout-manager") continue;

			const ids = this.calloutCollection.snippets.get(snippetId) ?? [];
			const css = this.cssTextCache.get(`snippet:${snippetId}`) ?? "";

			// Malformed warning: compare loose mentions vs parsed IDs
			const looseCount = (css.match(/\[data-callout/g) ?? []).length;
			if (looseCount > ids.length) {
				warnings.push({
					file: `${snippetId}.css`,
					malformedCount: looseCount - ids.length,
				});
			}

			for (const id of ids) {
				if (seen.has(id) || builtinNames.has(id)) continue;
				seen.add(id);

				const props = extractCalloutProperties(css, id);
				const label = id
					.replace(/[-_]/g, " ")
					.replace(/\b\w/g, (c) => c.toUpperCase());

				types.push({
					type: id,
					label,
					icon: props.icon,
					color: props.color,
					source: "snippet",
					iconDefault: props.iconDefault,
				});
			}
		}

		// Theme-sourced callouts
		const themeCss = this.cssTextCache.get("theme") ?? "";
		if (themeCss) {
			const themeIds = this.calloutCollection.theme.get();
			for (const id of themeIds) {
				if (seen.has(id) || builtinNames.has(id)) continue;
				seen.add(id);

				const props = extractCalloutProperties(themeCss, id);
				const label = id
					.replace(/[-_]/g, " ")
					.replace(/\b\w/g, (c) => c.toUpperCase());

				types.push({
					type: id,
					label,
					icon: props.icon,
					color: props.color,
					source: "theme",
					iconDefault: props.iconDefault,
				});
			}
		}

		// Validate icon names against Obsidian's icon set
		for (const st of types) {
			if (!st.iconDefault && !getIcon(st.icon)) {
				st.iconInvalid = true;
			}
		}

		this.snippetTypes = types;
		this.snippetWarnings = warnings;
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

		// Snippet/theme types — extract from cached CSS
		for (const css of this.cssTextCache.values()) {
			const props = extractCalloutProperties(css, id);
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

	/** Convert persisted custom callouts to CalloutTypeInfo for use in modals. */
	private getCustomTypes(): CalloutTypeInfo[] {
		return Object.values(this.settings.customCallouts).map((cc) =>
			customCalloutToTypeInfo(cc, this.settings.injectColor),
		);
	}
}
