import { Plugin, PluginSettingTab, App, Setting } from "obsidian";
import { type PluginSettings, DEFAULT_SETTINGS, BUILTIN_CALLOUT_TYPES } from "./types";
import { InsertCalloutModal } from "./insertCalloutModal";

export default class EnhancedCalloutManager extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "insert-callout",
			name: "Insert callout",
			editorCallback: () => {
				const defaultType = this.settings.rememberLastType
					? this.settings.lastUsedType
					: this.settings.defaultCalloutType;

				const modal = new InsertCalloutModal(this.app, {
					defaultType,
					autoFocusContent: this.settings.autoFocusContent,
				});

				const origClose = modal.close.bind(modal);
				modal.close = () => {
					if (this.settings.rememberLastType && modal.type) {
						this.settings.lastUsedType = modal.type;
						this.saveSettings();
					}
					origClose();
				};

				modal.open();
			},
		});

		this.addSettingTab(new EnhancedCalloutSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class EnhancedCalloutSettingTab extends PluginSettingTab {
	plugin: EnhancedCalloutManager;

	constructor(app: App, plugin: EnhancedCalloutManager) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default callout type")
			.setDesc("The callout type pre-selected when the modal opens.")
			.addDropdown((dropdown) => {
				for (const ct of BUILTIN_CALLOUT_TYPES) {
					dropdown.addOption(ct.type, ct.label);
				}
				dropdown.setValue(this.plugin.settings.defaultCalloutType);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultCalloutType = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Remember last used type")
			.setDesc("When enabled, the modal will default to the last callout type you inserted.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.rememberLastType);
				toggle.onChange(async (value) => {
					this.plugin.settings.rememberLastType = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Auto-focus content")
			.setDesc("Automatically focus the content textarea when the modal opens.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.autoFocusContent);
				toggle.onChange(async (value) => {
					this.plugin.settings.autoFocusContent = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
