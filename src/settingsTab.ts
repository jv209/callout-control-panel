/**
 * Unified settings tab for Callout Control Panel.
 *
 * Tabs (in order):
 *   1. Default Settings    — default type, remember last, auto-focus, color injection, collapse
 *   2. CSS Type Detection  — snippet scanning + detected types table
 *   3. Custom Callouts     — add / edit / delete user-defined callouts
 *   4. Most Used Callouts  — up to 5 pinned type slots
 *   5. Title Overrides     — per-type title replacements
 *   6. Import / Export     — JSON and CSS export, JSON import
 *   7. Icon Packs          — Font Awesome toggle, downloadable pack management
 *
 * Source patterns adapted from obsidian-admonition v10.3.2 (MIT, Jeremy Valentine).
 */

import {
	App,
	PluginSettingTab,
	requireApiVersion,
	setIcon,
	SettingPage,
	type SettingDefinitionItem,
	type SettingDefinitionPage,
} from "obsidian";
import {
	type CalloutTypeInfo,
	type CustomCallout,
	type PluginSettings,
	BUILTIN_CALLOUT_TYPES,
} from "./types";
import type { SnippetWarning } from "./snippetParser";
import type { CalloutManager } from "./callout/manager";
import type { IconManager } from "./icons/manager";
import { buildInsertionTab } from "./settings/tabs/insertion";
import { buildDetectionTab } from "./settings/tabs/detection";
import { buildCustomCalloutsTab } from "./settings/tabs/customCallouts";
import { buildFavoritesTab } from "./settings/tabs/favorites";
import { buildTitleOverridesTab } from "./settings/tabs/titleOverrides";
import { buildImportExportTab } from "./settings/tabs/importExport";
import { buildIconPacksTab } from "./settings/tabs/iconPacks";
import type { SettingsTabContext } from "./settings/types";

// ─── Plugin reference interface ──────────────────────────────────────────────

/** Minimum plugin surface area required by the settings tab. */
export interface SettingsTabPluginRef {
	app: App;
	settings: PluginSettings;
	snippetTypes: CalloutTypeInfo[];
	snippetWarnings: SnippetWarning[];
	iconManager: IconManager;
	calloutManager: CalloutManager;
	onTypesChanged?: () => void;
	refreshSnippetTypes(): Promise<void>;
	saveSettings(): Promise<void>;
	addCustomCallout(callout: CustomCallout): Promise<void>;
	removeCustomCallout(callout: CustomCallout): Promise<void>;
	editCustomCallout(oldType: string, callout: CustomCallout): Promise<void>;
}

/** Options shared by the two declarative collapse-state dropdowns. */
const COLLAPSE_OPTIONS: Record<string, string> = {
	none: "Default (no fold)",
	open: "Open (+)",
	closed: "Closed (-)",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Convert a CustomCallout to a CalloutTypeInfo for use in modal dropdowns
 * and the quick-pick list.
 */
export function customCalloutToTypeInfo(
	cc: CustomCallout,
	globalInjectColor: boolean,
): CalloutTypeInfo {
	const useColor = cc.injectColor ?? globalInjectColor;
	return {
		type: cc.type,
		label: cc.type.charAt(0).toUpperCase() + cc.type.slice(1),
		icon: cc.icon?.name ?? "lucide-alert-circle",
		iconDef: cc.icon,
		color: useColor ? cc.color : "var(--callout-default)",
		source: "custom",
	};
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

export class EnhancedCalloutSettingTab extends PluginSettingTab {
	private activeTabIndex = 0;

	constructor(app: App, private plugin: SettingsTabPluginRef) {
		super(app, plugin as unknown as import("obsidian").Plugin);
	}

	display(): void {
		// Legacy path (Obsidian < 1.13 only). On 1.13+ Obsidian renders the
		// declarative getSettingDefinitions() below and never calls display().
		this.renderContent();
	}

	// ─── Declarative settings (Obsidian 1.13+) ──────────────────────────────
	//
	// PREVIEW (phase 1): the Defaults tab is fully declarative (native rows,
	// indexed by settings search). The remaining six tabs are bridged as
	// imperative sub-pages that reuse the existing tab builders unchanged, so
	// no functionality is lost. Obsidian < 1.13 never calls this method and
	// keeps the classic tab bar via display().

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: "page",
				name: "Defaults",
				desc: "Default type, insertion behavior, and collapse state",
				items: [
					{
						name: "Default callout type",
						desc: "The callout type pre-selected when the modal opens.",
						control: {
							type: "dropdown",
							key: "defaultCalloutType",
							options: this.buildTypeOptions(),
						},
					},
					{
						name: "Remember last used type",
						desc: "When enabled, the modal defaults to the last callout type you inserted.",
						control: { type: "toggle", key: "rememberLastType" },
					},
					{
						name: "Auto-focus content",
						desc: "Automatically focus the content textarea when the modal opens.",
						control: { type: "toggle", key: "autoFocusContent" },
					},
					{
						name: "Inject callout colors",
						desc: "When enabled, the color you pick for a custom callout is applied automatically. When disabled, colors must be set manually via CSS.",
						control: { type: "toggle", key: "injectColor" },
					},
					{
						name: "Copy button",
						desc: "Show a copy-to-clipboard button in each callout's title bar.",
						control: { type: "toggle", key: "showCopyButton" },
					},
					{
						name: "Default collapse state (modal)",
						desc: "The default collapse state when inserting a callout via the full modal.",
						control: {
							type: "dropdown",
							key: "defaultCollapseModal",
							options: COLLAPSE_OPTIONS,
						},
					},
					{
						name: "Default collapse state (quick pick)",
						desc: "The default collapse state when inserting a callout via quick pick or favorites.",
						control: {
							type: "dropdown",
							key: "defaultCollapseQuickPick",
							options: COLLAPSE_OPTIONS,
						},
					},
				],
			},
			this.legacyPage("CSS type detection", "Snippet scanning and detected callout types", buildDetectionTab),
			this.legacyPage("Custom callouts", "Add, edit, and delete your own callout types", buildCustomCalloutsTab),
			this.legacyPage("Most used callouts", "Up to 5 pinned quick-access slots", buildFavoritesTab),
			this.legacyPage("Title overrides", "Per-type title replacements", buildTitleOverridesTab),
			this.legacyPage("Import / export", "Back up or share callout definitions", buildImportExportTab),
			this.legacyPage("Icon packs", "Font Awesome toggle and downloadable packs", buildIconPacksTab),
		];
	}

	/** Read a bound control value from plugin settings (declarative path). */
	getControlValue(key: string): unknown {
		return (this.plugin.settings as unknown as Record<string, unknown>)[key];
	}

	/** Persist a bound control value through the plugin's normal save path. */
	setControlValue(key: string, value: unknown): void | Promise<void> {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		return this.plugin.saveSettings();
	}

	/**
	 * Flat options for the declarative default-type dropdown, in the same
	 * order as the legacy grouped dropdown: custom, then snippet, then
	 * built-in. Cheap by design — getSettingDefinitions() runs on every
	 * update() and must not do I/O.
	 */
	private buildTypeOptions(): Record<string, string> {
		const options: Record<string, string> = {};
		for (const cc of Object.values(this.plugin.settings.customCallouts)) {
			const info = customCalloutToTypeInfo(cc, this.plugin.settings.injectColor);
			options[info.type] = info.label;
		}
		for (const ct of this.plugin.snippetTypes) {
			options[ct.type] ??= ct.label;
		}
		for (const ct of BUILTIN_CALLOUT_TYPES) {
			options[ct.type] ??= ct.label;
		}
		return options;
	}

	/**
	 * Bridge an existing imperative tab builder onto a declarative sub-page.
	 * The SettingPage subclass is created inside the factory so the
	 * `SettingPage` base (1.13+ API) is never touched on older Obsidian,
	 * where getSettingDefinitions() is never called.
	 */
	private legacyPage(
		name: string,
		desc: string,
		build: (el: HTMLElement, ctx: SettingsTabContext) => void,
	): SettingDefinitionPage {
		// eslint-disable-next-line @typescript-eslint/no-this-alias -- the SettingPage subclass needs the tab instance alongside its own `this`
		const tab = this;
		return {
			type: "page",
			name,
			desc,
			page: () => {
				if (requireApiVersion("1.13.0")) {
					return new (class extends SettingPage {
						constructor() {
							super();
							this.title = name;
						}
						display(): void {
							// Auto-refresh when detected types rebuild (mirrors
							// the legacy renderContent() wiring).
							tab.plugin.onTypesChanged = () => this.display();
							const ctx: SettingsTabContext = {
								app: tab.app,
								plugin: tab.plugin,
								refresh: () => this.display(),
								buildGroupedDropdown: (selectEl, includeNone) =>
									tab.buildGroupedDropdown(selectEl, includeNone),
							};
							this.containerEl.empty();
							build(this.containerEl, ctx);
						}
					})();
				}
				// Unreachable: Obsidian only calls getSettingDefinitions() on 1.13+.
				throw new Error("Declarative settings require Obsidian 1.13+");
			},
		};
	}

	private renderContent(): void {
		// Register auto-refresh so async rebuildDetectedTypes() updates the tab.
		this.plugin.onTypesChanged = () => this.renderContent();

		const { containerEl } = this;
		containerEl.empty();

		// Build the context object passed to every tab builder.
		const ctx: SettingsTabContext = {
			app: this.app,
			plugin: this.plugin,
			refresh: () => this.renderContent(),
			buildGroupedDropdown: (selectEl, includeNone) =>
				this.buildGroupedDropdown(selectEl, includeNone),
		};

		// ── Tab bar ─────────────────────────────────────────────────────
		const tabBar = containerEl.createDiv({ cls: "ccp-tab-bar" });
		const tabContent = containerEl.createDiv({ cls: "ccp-tab-content" });

		const tabs: { label: string; icon: string; builder: (el: HTMLElement) => void }[] = [
			{ label: "Defaults",           icon: "lucide-cog",         builder: (el) => buildInsertionTab(el, ctx) },
			{ label: "CSS type detection", icon: "lucide-telescope",    builder: (el) => buildDetectionTab(el, ctx) },
			{ label: "Custom callouts",    icon: "lucide-paintbrush",   builder: (el) => buildCustomCalloutsTab(el, ctx) },
			{ label: "Most used callouts", icon: "lucide-stars",        builder: (el) => buildFavoritesTab(el, ctx) },
			{ label: "Title overrides",    icon: "lucide-pencil-line",  builder: (el) => buildTitleOverridesTab(el, ctx) },
			{ label: "Import / export",    icon: "lucide-import",       builder: (el) => buildImportExportTab(el, ctx) },
			{ label: "Icon packs",         icon: "lucide-package",      builder: (el) => buildIconPacksTab(el, ctx) },
		];

		const buttons: HTMLElement[] = [];
		const panes: HTMLElement[] = [];

		for (let idx = 0; idx < tabs.length; idx++) {
			const tab = tabs[idx]!;
			const btn = tabBar.createEl("button", { cls: "ccp-tab-button" });
			const iconSpan = btn.createSpan({ cls: "ccp-tab-icon" });
			setIcon(iconSpan, tab.icon);
			btn.createSpan({ cls: "ccp-tab-label", text: tab.label });

			const pane = tabContent.createDiv({ cls: "ccp-tab-pane ccp-hidden" });

			try {
				tab.builder(pane);
			} catch (e) {
				console.error("Callout Control Panel: settings section error", e);
			}

			buttons.push(btn);
			panes.push(pane);

			const tabIdx = idx;
			btn.addEventListener("click", () => {
				for (const b of buttons) b.removeClass("ccp-tab-active");
				for (const p of panes) p.addClass("ccp-hidden");
				btn.addClass("ccp-tab-active");
				pane.removeClass("ccp-hidden");
				this.activeTabIndex = tabIdx;
			});
		}

		// Activate the remembered tab (or first if out of range)
		const idx = this.activeTabIndex < tabs.length ? this.activeTabIndex : 0;
		if (buttons[idx]) buttons[idx].addClass("ccp-tab-active");
		if (panes[idx]) panes[idx].removeClass("ccp-hidden");
	}

	/**
	 * Populate a native <select> element with Custom / Snippet / Default
	 * optgroups. Used by the default type dropdown and favorites.
	 */
	private buildGroupedDropdown(
		selectEl: HTMLSelectElement,
		includeNone = false,
	): void {
		if (includeNone) {
			selectEl.createEl("option", { value: "", text: "— (none)" });
		}

		const customTypes = Object.values(this.plugin.settings.customCallouts).map(
			(cc) => customCalloutToTypeInfo(cc, this.plugin.settings.injectColor),
		);
		const snippetTypes = this.plugin.snippetTypes;
		const builtinTypes = BUILTIN_CALLOUT_TYPES;

		if (customTypes.length > 0) {
			const group = selectEl.createEl("optgroup", {
				attr: { label: "Custom" },
			});
			for (const ct of customTypes) {
				group.createEl("option", { value: ct.type, text: ct.label });
			}
		}

		if (snippetTypes.length > 0) {
			const group = selectEl.createEl("optgroup", {
				attr: { label: "Snippet" },
			});
			for (const ct of snippetTypes) {
				group.createEl("option", { value: ct.type, text: ct.label });
			}
		}

		const defaultGroup = selectEl.createEl("optgroup", {
			attr: { label: "Default" },
		});
		for (const ct of builtinTypes) {
			defaultGroup.createEl("option", { value: ct.type, text: ct.label });
		}
	}
}
