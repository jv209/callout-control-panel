import { Plugin, PluginSettingTab, App, Setting, setIcon } from "obsidian";
import { type CalloutTypeInfo, type PluginSettings, DEFAULT_SETTINGS, BUILTIN_CALLOUT_TYPES } from "./types";
import { InsertCalloutModal } from "./insertCalloutModal";
import { QuickPickCalloutModal } from "./quickPickCalloutModal";
import { parseSnippetCalloutTypes } from "./snippetParser";

export default class EnhancedCalloutManager extends Plugin {
	settings: PluginSettings;
	snippetTypes: CalloutTypeInfo[] = [];

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
					snippetTypes: this.snippetTypes,
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
				const modal = new QuickPickCalloutModal(this.app, this.snippetTypes, (type) => {
					QuickPickCalloutModal.insertQuickCallout(this.app, type);
					if (this.settings.rememberLastType) {
						this.settings.lastUsedType = type;
						void this.saveSettings();
					}
				});
				modal.open();
			},
		});

		this.addCommand({
			id: "open-settings",
			name: "Open settings",
			callback: () => {
				// app.setting is an undocumented Obsidian internal
				const setting = (this.app as unknown as { setting: { open(): void; openTabById(id: string): void } }).setting;
				setting.open();
				setting.openTabById(this.manifest.id);
			},
		});

		this.addSettingTab(new EnhancedCalloutSettingTab(this.app, this));

		// Scan snippet types once the workspace layout is ready
		this.app.workspace.onLayoutReady(() => {
			void this.refreshSnippetTypes();
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** Re-scan CSS snippets for custom callout types. */
	async refreshSnippetTypes(): Promise<void> {
		if (this.settings.scanSnippets) {
			this.snippetTypes = await parseSnippetCalloutTypes(this.app);
		} else {
			this.snippetTypes = [];
		}
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

		// --- Insertion section ---
		new Setting(containerEl).setName("Insertion").setHeading();

		new Setting(containerEl)
			.setName("Default callout type")
			.setDesc("The callout type pre-selected when the modal opens.")
			.addDropdown((dropdown) => {
				for (const ct of BUILTIN_CALLOUT_TYPES) {
					dropdown.addOption(ct.type, ct.label);
				}
				// Also include snippet types in the default type picker
				for (const st of this.plugin.snippetTypes) {
					dropdown.addOption(st.type, st.label);
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

		// --- Detection section ---
		new Setting(containerEl).setName("Detection").setHeading();

		new Setting(containerEl)
			.setName("Scan CSS snippets")
			.setDesc("Detect custom callout types defined in your enabled CSS snippet files.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.scanSnippets);
				toggle.onChange(async (value) => {
					this.plugin.settings.scanSnippets = value;
					await this.plugin.saveSettings();
					await this.plugin.refreshSnippetTypes();
					// Re-render to update the detected types list
					this.display();
				});
			});

		// Show detected snippet types
		if (this.plugin.settings.scanSnippets) {
			const count = this.plugin.snippetTypes.length;
			if (count > 0) {
				new Setting(containerEl)
					.setName(`Detected types (${count})`)
					.setDesc("Custom callout types found in your enabled CSS snippets.")
					.addExtraButton((btn) => {
						btn.setIcon("folder-open")
							.setTooltip("Open snippets folder")
							.onClick(() => {
								const snippetsPath = `${this.app.vault.configDir}/snippets`;
								const opener = this.app as unknown as {
									openWithDefaultApp(path: string): void;
								};
								opener.openWithDefaultApp(snippetsPath);
							});
					});

				const listEl = containerEl.createDiv({ cls: "detected-snippet-types" });
				for (const st of this.plugin.snippetTypes) {
					const itemEl = listEl.createDiv({ cls: "detected-snippet-type-item" });
					const iconEl = itemEl.createDiv({ cls: "detected-snippet-type-icon" });
					setIcon(iconEl, st.icon);
					iconEl.style.setProperty("--callout-color", st.color);
					itemEl.createSpan({ text: st.label, cls: "detected-snippet-type-label" });
					itemEl.createSpan({ text: st.icon, cls: "detected-snippet-type-meta" });
					itemEl.createSpan({ text: `rgb(${st.color})`, cls: "detected-snippet-type-meta" });
				}
			} else {
				new Setting(containerEl)
					.setName("No custom types detected")
					.setDesc("No callout definitions were found in your enabled CSS snippet files.")
					.addExtraButton((btn) => {
						btn.setIcon("folder-open")
							.setTooltip("Open snippets folder")
							.onClick(() => {
								const snippetsPath = `${this.app.vault.configDir}/snippets`;
								const opener = this.app as unknown as {
									openWithDefaultApp(path: string): void;
								};
								opener.openWithDefaultApp(snippetsPath);
							});
					});
			}
		}
	}
}
