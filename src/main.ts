import { Plugin, getIcon } from "obsidian";
import {
	type CalloutTypeInfo,
	type CustomCallout,
	type PluginSettings,
	DEFAULT_SETTINGS,
} from "./types";
import { EnhancedCalloutSettingTab, customCalloutToTypeInfo } from "./settingsTab";
import { InsertCalloutModal } from "./insertCalloutModal";
import { QuickPickCalloutModal } from "./quickPickCalloutModal";
import { type SnippetWarning, parseSnippetCalloutTypes } from "./snippetParser";
import { IconManager } from "./icons/manager";
import { CalloutManager } from "./callout/manager";
import { StylesheetWatcher } from "./callout-detection";

export default class EnhancedCalloutManager extends Plugin {
	settings: PluginSettings;
	snippetTypes: CalloutTypeInfo[] = [];
	snippetWarnings: SnippetWarning[] = [];
	iconManager: IconManager;
	calloutManager: CalloutManager;
	stylesheetWatcher: StylesheetWatcher;

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

		// Load icon packs, inject custom callout CSS, scan snippets,
		// and start watching for live CSS changes once the workspace
		// layout is ready.
		this.app.workspace.onLayoutReady(async () => {
			await this.iconManager.load();
			await this.calloutManager.loadCallouts(this.settings.customCallouts);
			await this.refreshSnippetTypes();

			// Start live stylesheet monitoring — when themes or snippets
			// change, rescan to keep the callout type list up to date.
			this.stylesheetWatcher = new StylesheetWatcher(this.app);
			this.stylesheetWatcher.on('checkComplete', (anyChanges) => {
				if (anyChanges) {
					void this.refreshSnippetTypes();
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

	/** Re-scan CSS snippets for custom callout types. */
	async refreshSnippetTypes(): Promise<void> {
		if (this.settings.scanSnippets) {
			const result = await parseSnippetCalloutTypes(this.app);
			// Validate icon names against Obsidian's icon set
			for (const st of result.types) {
				if (!st.iconDefault && !getIcon(st.icon)) {
					st.iconInvalid = true;
				}
			}
			this.snippetTypes = result.types;
			this.snippetWarnings = result.warnings;
		} else {
			this.snippetTypes = [];
			this.snippetWarnings = [];
		}
	}

	// ── Custom callout CRUD ───────────────────────────────────────────────────

	async addCustomCallout(callout: CustomCallout): Promise<void> {
		this.settings.customCallouts[callout.type] = callout;
		await this.calloutManager.addCallout(callout);
		await this.saveSettings();
	}

	async removeCustomCallout(callout: CustomCallout): Promise<void> {
		delete this.settings.customCallouts[callout.type];
		await this.calloutManager.removeCallout(callout);
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
		}
		this.settings.customCallouts[callout.type] = callout;
		await this.calloutManager.addCallout(callout);
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
