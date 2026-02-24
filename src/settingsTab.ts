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
	setIcon,
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
		// Register auto-refresh so async rebuildDetectedTypes() updates the tab.
		this.plugin.onTypesChanged = () => this.display();

		const { containerEl } = this;
		containerEl.empty();

		// Build the context object passed to every tab builder.
		const ctx: SettingsTabContext = {
			app: this.app,
			plugin: this.plugin,
			refresh: () => this.display(),
			buildGroupedDropdown: (selectEl, includeNone) =>
				this.buildGroupedDropdown(selectEl, includeNone),
		};

		// ── Tab bar ─────────────────────────────────────────────────────
		const tabBar = containerEl.createDiv({ cls: "ccp-tab-bar" });
		const tabContent = containerEl.createDiv({ cls: "ccp-tab-content" });

		const tabs: { label: string; icon: string; builder: (el: HTMLElement) => void }[] = [
			{ label: "Default Settings",   icon: "lucide-cog",         builder: (el) => buildInsertionTab(el, ctx) },
			{ label: "CSS Type Detection", icon: "lucide-telescope",    builder: (el) => buildDetectionTab(el, ctx) },
			{ label: "Custom Callouts",    icon: "lucide-paintbrush",   builder: (el) => buildCustomCalloutsTab(el, ctx) },
			{ label: "Most Used Callouts", icon: "lucide-stars",        builder: (el) => buildFavoritesTab(el, ctx) },
			{ label: "Title Overrides",    icon: "lucide-pencil-line",  builder: (el) => buildTitleOverridesTab(el, ctx) },
			{ label: "Import / Export",    icon: "lucide-import",       builder: (el) => buildImportExportTab(el, ctx) },
			{ label: "Icon Packs",         icon: "lucide-package",      builder: (el) => buildIconPacksTab(el, ctx) },
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
