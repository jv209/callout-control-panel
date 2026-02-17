import { Plugin, PluginSettingTab, App, Setting, setIcon, getIcon } from "obsidian";
import { type CalloutTypeInfo, type PluginSettings, DEFAULT_SETTINGS, BUILTIN_CALLOUT_TYPES } from "./types";
import { InsertCalloutModal } from "./insertCalloutModal";
import { QuickPickCalloutModal } from "./quickPickCalloutModal";
import { type SnippetWarning, parseSnippetCalloutTypes } from "./snippetParser";

export default class EnhancedCalloutManager extends Plugin {
	settings: PluginSettings;
	snippetTypes: CalloutTypeInfo[] = [];
	snippetWarnings: SnippetWarning[] = [];

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
			const colorWarningCount = this.plugin.snippetTypes.filter(st => st.color.startsWith("var(")).length;
			const iconWarningCount = this.plugin.snippetTypes.filter(st => st.iconDefault || st.iconInvalid).length;
			const totalWarningCount = this.plugin.snippetTypes.filter(st => st.color.startsWith("var(") || st.iconDefault || st.iconInvalid).length;
			const heading = count > 0
				? `Detected types (${count})`
				: "No custom types detected";
			const desc = count > 0
				? "Custom callout types found in your enabled CSS snippets."
				: "No callout definitions were found in your enabled CSS snippet files.";

			const detectedSetting = new Setting(containerEl)
				.setName(heading)
				.setDesc(desc)
				.addExtraButton((btn) => {
					btn.setIcon("refresh-cw")
						.setTooltip("Refresh snippets")
						.onClick(async () => {
							await this.plugin.refreshSnippetTypes();
							this.display();
						});
				})
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

			// Inline warning if any types have color/icon issues
			if (totalWarningCount > 0) {
				const iconMissingCount = this.plugin.snippetTypes.filter(st => st.iconDefault).length;
				const iconInvalidCount = this.plugin.snippetTypes.filter(st => st.iconInvalid).length;
				const parts: string[] = [];
				if (colorWarningCount > 0) {
					parts.push(`${colorWarningCount} missing color`);
				}
				if (iconMissingCount > 0) {
					parts.push(`${iconMissingCount} missing icon`);
				}
				if (iconInvalidCount > 0) {
					parts.push(`${iconInvalidCount} invalid icon`);
				}
				const warnEl = detectedSetting.nameEl.createSpan({ cls: "detected-snippet-header-warning" });
				setIcon(warnEl, "alert-triangle");
				warnEl.setAttribute("aria-label", parts.join(", "));
			}

			if (count > 0) {
				// Collapsible container — collapsed by default
				const detailsEl = containerEl.createEl("details", { cls: "detected-snippet-types" });
				detailsEl.createEl("summary", { text: "Show callouts", cls: "detected-snippet-types-summary" });

				// Table header
				const headerEl = detailsEl.createDiv({ cls: "detected-snippet-type-row detected-snippet-type-header" });
				headerEl.createSpan({ text: "Icon", cls: "detected-snippet-col-icon" });
				headerEl.createSpan({ text: "Callout", cls: "detected-snippet-col-callout" });
				headerEl.createSpan({ text: "Icon Name", cls: "detected-snippet-col-iconname" });
				headerEl.createSpan({ text: "Color", cls: "detected-snippet-col-color" });
				headerEl.createSpan({ text: "", cls: "detected-snippet-col-status" });

				for (const st of this.plugin.snippetTypes) {
					const rowEl = detailsEl.createDiv({ cls: "detected-snippet-type-row" });

					// Icon column
					const iconEl = rowEl.createDiv({ cls: "detected-snippet-col-icon detected-snippet-type-icon" });
					setIcon(iconEl, st.icon);
					iconEl.style.setProperty("--callout-color", st.color);

					// Callout name column
					rowEl.createSpan({ text: st.label, cls: "detected-snippet-col-callout" });

					// Icon name column
					const iconText = st.iconDefault ? "—" : st.icon;
					const iconNameEl = rowEl.createSpan({ text: iconText, cls: "detected-snippet-col-iconname detected-snippet-type-meta" });
					if (st.iconInvalid) {
						iconNameEl.addClass("detected-snippet-type-invalid");
					}

					// Color column
					const colorText = st.color.startsWith("var(") ? "—" : `rgb(${st.color})`;
					rowEl.createSpan({ text: colorText, cls: "detected-snippet-col-color detected-snippet-type-meta" });

					// Status column (warning if color/icon missing or icon invalid)
					const statusEl = rowEl.createDiv({ cls: "detected-snippet-col-status" });
					const missingColor = st.color.startsWith("var(");
					const missingIcon = st.iconDefault === true;
					const invalidIcon = st.iconInvalid === true;
					if (missingColor || missingIcon || invalidIcon) {
						const reasons: string[] = [];
						if (missingColor) reasons.push("no --callout-color");
						if (missingIcon) reasons.push("no --callout-icon");
						if (invalidIcon) reasons.push(`unknown icon "${st.icon}"`);
						const warnEl = statusEl.createDiv({ cls: "detected-snippet-type-warning" });
						setIcon(warnEl, "alert-triangle");
						warnEl.setAttribute("aria-label", reasons.join(", "));
					}
				}
			}

			// Malformed callout warnings (always visible, outside collapsible)
			if (this.plugin.snippetWarnings.length > 0) {
				const warnBlock = containerEl.createDiv({ cls: "detected-snippet-warnings" });
				const warnHeader = warnBlock.createDiv({ cls: "detected-snippet-warnings-header" });
				const warnIcon = warnHeader.createDiv({ cls: "detected-snippet-warnings-icon" });
				setIcon(warnIcon, "alert-triangle");
				warnHeader.createSpan({ text: "Some snippet files contain malformed callout definitions" });

				const warnList = warnBlock.createEl("ul");
				for (const w of this.plugin.snippetWarnings) {
					warnList.createEl("li", {
						text: `${w.file} — ${w.malformedCount} malformed ${w.malformedCount === 1 ? "entry" : "entries"}`,
					});
				}
			}
		}
	}
}
