/**
 * Unified settings tab for Enhanced Callout Manager.
 *
 * Tabs:
 *   1. Default Settings    — default type, remember last, auto-focus, color injection
 *   2. CSS Type Detection  — snippet scanning + detected types table
 *   3. Custom Callouts     — add / edit / delete user-defined callouts
 *   4. Most Used Callouts  — up to 5 pinned type slots
 *   5. Import / Export     — JSON and CSS export, JSON import
 *   6. Icon Packs          — Font Awesome toggle, downloadable pack management
 *
 * Also contains CalloutEditModal (create / edit a single custom type).
 *
 * Source patterns adapted from obsidian-admonition v10.3.2 (MIT, Jeremy Valentine).
 */

import {
	App,
	Modal,
	Notice,
	Platform,
	PluginSettingTab,
	Setting,
	TextComponent,
	setIcon,
} from "obsidian";
import {
	type CalloutIconDefinition,
	type CalloutTypeInfo,
	type CustomCallout,
	type PluginSettings,
	BUILTIN_CALLOUT_TYPES,
} from "./types";
import type { SnippetWarning } from "./snippetParser";
import type { CalloutManager } from "./callout/manager";
import type { IconManager } from "./icons/manager";
import { type DownloadableIconPack, DownloadableIcons } from "./icons/packs";
import { ExportModal } from "./modal/export";
import { confirmWithModal } from "./modal/confirm";
import { IconSuggestionModal } from "./modal/iconSuggestionModal";
import { CalloutValidator } from "./util/validator";
import { hexToRgb, rgbToHex } from "./util/color";

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

		// ── Tab bar ─────────────────────────────────────────────────────
		const tabBar = containerEl.createDiv({ cls: "ecm-tab-bar" });
		const tabContent = containerEl.createDiv({ cls: "ecm-tab-content" });

		const tabs: { label: string; builder: (el: HTMLElement) => void }[] = [
			{ label: "Default Settings", builder: (el) => this.buildInsertionSection(el) },
			{ label: "CSS Type Detection", builder: (el) => this.buildDetectionSection(el) },
			{ label: "Custom Callouts", builder: (el) => this.buildCustomTypesSection(el) },
			{ label: "Most Used Callouts", builder: (el) => this.buildFavoritesSection(el) },
			{ label: "Import / Export", builder: (el) => this.buildImportExportSection(el) },
			{ label: "Icon Packs", builder: (el) => this.buildIconPacksSection(el) },
		];

		const buttons: HTMLElement[] = [];
		const panes: HTMLElement[] = [];

		for (let idx = 0; idx < tabs.length; idx++) {
			const tab = tabs[idx]!;
			const btn = tabBar.createEl("button", {
				text: tab.label,
				cls: "ecm-tab-button",
			});
			const pane = tabContent.createDiv({ cls: "ecm-tab-pane" });
			pane.style.display = "none";

			try {
				tab.builder(pane);
			} catch (e) {
				console.error("Enhanced Callout Manager: settings section error", e);
			}

			buttons.push(btn);
			panes.push(pane);

			const tabIdx = idx;
			btn.addEventListener("click", () => {
				for (const b of buttons) b.removeClass("ecm-tab-active");
				for (const p of panes) p.style.display = "none";
				btn.addClass("ecm-tab-active");
				pane.style.display = "";
				this.activeTabIndex = tabIdx;
			});
		}

		// Activate the remembered tab (or first if out of range)
		const idx = this.activeTabIndex < tabs.length ? this.activeTabIndex : 0;
		if (buttons[idx]) buttons[idx].addClass("ecm-tab-active");
		if (panes[idx]) panes[idx].style.display = "";
	}

	// ── Section 1: Default Settings ─────────────────────────────────────────

	private buildInsertionSection(el: HTMLElement): void {
		new Setting(el)
			.setName("Default callout type")
			.setDesc("The callout type pre-selected when the modal opens.")
			.addDropdown((dropdown) => {
				this.buildGroupedDropdown(dropdown.selectEl);
				dropdown.setValue(this.plugin.settings.defaultCalloutType);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultCalloutType = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(el)
			.setName("Remember last used type")
			.setDesc("When enabled, the modal defaults to the last callout type you inserted.")
			.addToggle((t) => {
				t.setValue(this.plugin.settings.rememberLastType);
				t.onChange(async (v) => {
					this.plugin.settings.rememberLastType = v;
					await this.plugin.saveSettings();
				});
			});

		new Setting(el)
			.setName("Auto-focus content")
			.setDesc("Automatically focus the content textarea when the modal opens.")
			.addToggle((t) => {
				t.setValue(this.plugin.settings.autoFocusContent);
				t.onChange(async (v) => {
					this.plugin.settings.autoFocusContent = v;
					await this.plugin.saveSettings();
				});
			});

		new Setting(el)
			.setName("Inject callout colors")
			.setDesc(
				"When enabled, the color you pick for a custom callout is applied automatically. When disabled, colors must be set manually via CSS.",
			)
			.addToggle((t) => {
				t.setValue(this.plugin.settings.injectColor);
				t.onChange(async (v) => {
					this.plugin.settings.injectColor = v;
					await this.plugin.saveSettings();
				});
			});

		new Setting(el)
			.setName("Smooth collapse transitions")
			.setDesc(
				"Animate the expand and collapse of foldable callouts with a smooth transition.",
			)
			.addToggle((t) => {
				t.setValue(this.plugin.settings.smoothTransitions);
				t.onChange(async (v) => {
					this.plugin.settings.smoothTransitions = v;
					await this.plugin.saveSettings();
				});
			});

		new Setting(el)
			.setName("Copy button")
			.setDesc(
				"Show a copy-to-clipboard button in each callout's title bar.",
			)
			.addToggle((t) => {
				t.setValue(this.plugin.settings.showCopyButton);
				t.onChange(async (v) => {
					this.plugin.settings.showCopyButton = v;
					await this.plugin.saveSettings();
				});
			});

		new Setting(el)
			.setName("Drop shadow")
			.setDesc(
				"Apply a subtle shadow to rendered callouts for added depth.",
			)
			.addToggle((t) => {
				t.setValue(this.plugin.settings.enableDropShadow);
				t.onChange(async (v) => {
					this.plugin.settings.enableDropShadow = v;
					await this.plugin.saveSettings();
				});
			});

		// ── Title overrides ────────────────────────────────────────────
		this.buildTitleOverridesSection(el);
	}

	private buildTitleOverridesSection(el: HTMLElement): void {
		const overrides = this.plugin.settings.titleOverrides ?? {};

		let selectedType = "";
		let titleText = "";

		new Setting(el)
			.setName("Title overrides")
			.setDesc(
				"Replace the default title for specific callout types in reading view. Only affects callouts without an explicit title in markdown.",
			)
			.addDropdown((d) => {
				const existing = new Set(Object.keys(overrides));
				this.buildGroupedDropdown(d.selectEl);
				// Remove options that already have overrides
				for (const opt of Array.from(d.selectEl.querySelectorAll("option"))) {
					if (existing.has(opt.value)) opt.remove();
				}
				selectedType = d.getValue();
				d.onChange((v) => { selectedType = v; });
			})
			.addText((t) => {
				t.setPlaceholder("Custom title");
				t.onChange((v) => { titleText = v; });
			})
			.addButton((btn) => {
				btn.setButtonText("+")
					.setTooltip("Add title override")
					.onClick(async () => {
						if (!selectedType || !titleText.trim()) {
							new Notice("Select a type and enter a title.");
							return;
						}
						this.plugin.settings.titleOverrides[selectedType] = titleText.trim();
						await this.plugin.saveSettings();
						this.display();
					});
			});

		for (const [type, title] of Object.entries(overrides)) {
			const label = type.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
			new Setting(el)
				.setName(label)
				.addText((t) => {
					t.setValue(title).onChange(async (v) => {
						this.plugin.settings.titleOverrides[type] = v;
						await this.plugin.saveSettings();
					});
				})
				.addExtraButton((b) => {
					b.setIcon("trash")
						.setTooltip("Remove override")
						.onClick(async () => {
							delete this.plugin.settings.titleOverrides[type];
							await this.plugin.saveSettings();
							this.display();
						});
				});
		}
	}

	// ── Section 2: CSS Type Detection ───────────────────────────────────────

	private buildDetectionSection(el: HTMLElement): void {
		const det = this.plugin.settings.calloutDetection ?? {
			obsidian: true,
			theme: true,
			snippet: true,
		};

		const onToggle = async (
			key: "obsidian" | "theme" | "snippet",
			value: boolean,
		) => {
			try {
				det[key] = value;
				await this.plugin.saveSettings();
				await this.plugin.refreshSnippetTypes();
			} catch (e) {
				console.error("Enhanced Callout Manager: detection toggle error", e);
			}
			this.display();
		};

		new Setting(el)
			.setName("Obsidian")
			.setDesc("Detect callouts defined in Obsidian's built-in stylesheet.")
			.addToggle((t) => {
				t.setValue(det.obsidian);
				t.onChange((v) => onToggle("obsidian", v));
			});

		new Setting(el)
			.setName("Theme")
			.setDesc("Detect callouts defined by the active theme.")
			.addToggle((t) => {
				t.setValue(det.theme);
				t.onChange((v) => onToggle("theme", v));
			});

		new Setting(el)
			.setName("Snippet")
			.setDesc("Detect callouts defined in your enabled CSS snippet files.")
			.addToggle((t) => {
				t.setValue(det.snippet);
				t.onChange((v) => onToggle("snippet", v));
			});

		// Only show the detected-types list when snippet or theme detection is on.
		// (Obsidian built-ins are always available in the modal from BUILTIN_CALLOUT_TYPES.)
		if (!det.snippet && !det.theme) return;

		const count = this.plugin.snippetTypes.length;
		const colorWarnCount = this.plugin.snippetTypes.filter(
			(st) => st.color.startsWith("var("),
		).length;
		const iconMissingCount = this.plugin.snippetTypes.filter(
			(st) => st.iconDefault,
		).length;
		const iconInvalidCount = this.plugin.snippetTypes.filter(
			(st) => st.iconInvalid,
		).length;
		const totalWarnCount = this.plugin.snippetTypes.filter(
			(st) => st.color.startsWith("var(") || st.iconDefault || st.iconInvalid,
		).length;

		const heading =
			count > 0 ? `Detected types (${count})` : "No custom types detected";
		const desc =
			count > 0
				? "Custom callout types found in your enabled CSS snippets."
				: "No callout definitions were found in your enabled CSS snippet files.";

		const detectedSetting = new Setting(el)
			.setName(heading)
			.setDesc(desc)
			.addExtraButton((btn) => {
				btn
					.setIcon("refresh-cw")
					.setTooltip("Refresh snippets")
					.onClick(async () => {
						await this.plugin.refreshSnippetTypes();
						this.display();
					});
			})
			.addExtraButton((btn) => {
				btn
					.setIcon("folder-open")
					.setTooltip("Open snippets folder")
					.onClick(() => {
						const snippetsPath = `${this.app.vault.configDir}/snippets`;
						(
							this.app as unknown as {
								openWithDefaultApp(path: string): void;
							}
						).openWithDefaultApp(snippetsPath);
					});
			});

		if (totalWarnCount > 0) {
			const parts: string[] = [];
			if (colorWarnCount > 0) parts.push(`${colorWarnCount} missing color`);
			if (iconMissingCount > 0) parts.push(`${iconMissingCount} missing icon`);
			if (iconInvalidCount > 0) parts.push(`${iconInvalidCount} invalid icon`);
			const warnEl = detectedSetting.nameEl.createSpan({
				cls: "detected-snippet-header-warning",
			});
			setIcon(warnEl, "alert-triangle");
			warnEl.setAttribute("aria-label", parts.join(", "));
		}

		if (count > 0) {
			const detailsEl = el.createEl("details", {
				cls: "detected-snippet-types",
			});
			detailsEl.createEl("summary", {
				text: "Show callouts",
				cls: "detected-snippet-types-summary",
			});

			// Table header
			const headerEl = detailsEl.createDiv({
				cls: "detected-snippet-type-row detected-snippet-type-header",
			});
			headerEl.createSpan({ text: "Icon", cls: "detected-snippet-col-icon" });
			headerEl.createSpan({ text: "Callout", cls: "detected-snippet-col-callout" });
			headerEl.createSpan({ text: "Icon Name", cls: "detected-snippet-col-iconname" });
			headerEl.createSpan({ text: "Color", cls: "detected-snippet-col-color" });
			headerEl.createSpan({ text: "", cls: "detected-snippet-col-status" });

			for (const st of this.plugin.snippetTypes) {
				const rowEl = detailsEl.createDiv({ cls: "detected-snippet-type-row" });

				const iconEl = rowEl.createDiv({
					cls: "detected-snippet-col-icon detected-snippet-type-icon",
				});
				setIcon(iconEl, st.icon);
				iconEl.style.setProperty("--callout-color", st.color);

				rowEl.createSpan({ text: st.label, cls: "detected-snippet-col-callout" });

				const iconText = st.iconDefault ? "—" : st.icon;
				const iconNameEl = rowEl.createSpan({
					text: iconText,
					cls: "detected-snippet-col-iconname detected-snippet-type-meta",
				});
				if (st.iconInvalid) iconNameEl.addClass("detected-snippet-type-invalid");

				const colorText = st.color.startsWith("var(")
					? "—"
					: `rgb(${st.color})`;
				rowEl.createSpan({
					text: colorText,
					cls: "detected-snippet-col-color detected-snippet-type-meta",
				});

				const statusEl = rowEl.createDiv({ cls: "detected-snippet-col-status" });
				const missingColor = st.color.startsWith("var(");
				const missingIcon = st.iconDefault === true;
				const invalidIcon = st.iconInvalid === true;
				if (missingColor || missingIcon || invalidIcon) {
					const reasons: string[] = [];
					if (missingColor) reasons.push("no --callout-color");
					if (missingIcon) reasons.push("no --callout-icon");
					if (invalidIcon) reasons.push(`unknown icon "${st.icon}"`);
					const warnEl = statusEl.createDiv({
						cls: "detected-snippet-type-warning",
					});
					setIcon(warnEl, "alert-triangle");
					warnEl.setAttribute("aria-label", reasons.join(", "));
				}
			}
		}

		if (this.plugin.snippetWarnings.length > 0) {
			const warnBlock = el.createDiv({ cls: "detected-snippet-warnings" });
			const warnHeader = warnBlock.createDiv({
				cls: "detected-snippet-warnings-header",
			});
			const warnIcon = warnHeader.createDiv({
				cls: "detected-snippet-warnings-icon",
			});
			setIcon(warnIcon, "alert-triangle");
			warnHeader.createSpan({
				text: "Some snippet files contain malformed callout definitions",
			});
			const warnList = warnBlock.createEl("ul");
			for (const w of this.plugin.snippetWarnings) {
				warnList.createEl("li", {
					text: `${w.file} — ${w.malformedCount} malformed ${
						w.malformedCount === 1 ? "entry" : "entries"
					}`,
				});
			}
		}
	}

	// ── Section 3: Custom Callouts ──────────────────────────────────────────

	private buildCustomTypesSection(el: HTMLElement): void {
		new Setting(el)
			.setName("Add new type")
			.setDesc("Create a custom callout type with a custom icon and color.")
			.addButton((btn) => {
				btn
					.setButtonText("+")
					.setTooltip("Add callout type")
					.onClick(() => {
						const modal = new CalloutEditModal(this.app, this.plugin);
						modal.onClose = async () => {
							if (!modal.saved) return;
							await this.plugin.addCustomCallout({
								type: modal.type,
								icon: modal.icon,
								color: modal.color,
								injectColor: modal.injectColor,
							});
							this.display();
						};
						modal.open();
					});
			})
			.addExtraButton((btn) => {
				btn
					.setIcon("folder-open")
					.setTooltip("Open snippets folder")
					.onClick(() => {
						const snippetsPath = `${this.app.vault.configDir}/snippets`;
						(
							this.app as unknown as {
								openWithDefaultApp(path: string): void;
							}
						).openWithDefaultApp(snippetsPath);
					});
			});

		const customCallouts = Object.values(this.plugin.settings.customCallouts);

		if (customCallouts.length === 0) {
			el.createEl("p", {
				text: "No custom callouts defined yet.",
				cls: "setting-item-description",
			});
			return;
		}

		const listEl = el.createDiv({ cls: "custom-callout-types" });

		// Table header
		const headerEl = listEl.createDiv({
			cls: "custom-callout-type-row custom-callout-type-header",
		});
		headerEl.createSpan({ text: "Icon", cls: "detected-snippet-col-icon" });
		headerEl.createSpan({ text: "Callout", cls: "custom-callout-col-callout" });
		headerEl.createSpan({ text: "Icon Name", cls: "detected-snippet-col-iconname" });
		headerEl.createSpan({ text: "Color", cls: "detected-snippet-col-color" });
		headerEl.createSpan({ text: "", cls: "custom-callout-col-actions" });

		for (const callout of customCallouts) {
			const rowEl = listEl.createDiv({ cls: "custom-callout-type-row" });

			// Icon column — always show color regardless of injectColor setting
			const iconEl = rowEl.createDiv({
				cls: "detected-snippet-col-icon custom-callout-type-icon",
			});
			const iconNode = this.plugin.iconManager.getIconNode(callout.icon);
			if (iconNode) {
				iconEl.appendChild(iconNode);
			} else {
				setIcon(iconEl, "lucide-alert-circle");
			}
			if (callout.color) {
				iconEl.style.setProperty("--callout-color", callout.color);
			}

			// Callout name column
			rowEl.createSpan({ text: callout.type, cls: "custom-callout-col-callout" });

			// Icon name column
			const iconName = callout.icon?.name ?? "—";
			rowEl.createSpan({
				text: iconName,
				cls: "detected-snippet-col-iconname custom-callout-type-meta",
			});

			// Color column
			const colorText = callout.color ? `rgb(${callout.color})` : "—";
			rowEl.createSpan({
				text: colorText,
				cls: "detected-snippet-col-color custom-callout-type-meta",
			});

			// Action buttons column
			const actionsEl = rowEl.createDiv({ cls: "custom-callout-actions" });

			const editBtn = actionsEl.createDiv({ cls: "clickable-icon" });
			setIcon(editBtn, "pencil");
			editBtn.setAttribute("aria-label", "Edit");
			editBtn.addEventListener("click", () => {
				const modal = new CalloutEditModal(
					this.app,
					this.plugin,
					callout,
				);
				modal.onClose = async () => {
					if (!modal.saved) return;
					await this.plugin.editCustomCallout(callout.type, {
						type: modal.type,
						icon: modal.icon,
						color: modal.color,
						injectColor: modal.injectColor,
					});
					this.display();
				};
				modal.open();
			});

			const deleteBtn = actionsEl.createDiv({ cls: "clickable-icon" });
			setIcon(deleteBtn, "trash");
			deleteBtn.setAttribute("aria-label", "Delete");
			deleteBtn.addEventListener("click", async () => {
				const confirmed = await confirmWithModal(
					this.app,
					`Delete custom type "${callout.type}"?`,
				);
				if (confirmed) {
					await this.plugin.removeCustomCallout(callout);
					this.display();
				}
			});
		}
	}

	// ── Section 4: Most Used Callouts ───────────────────────────────────────

	private buildFavoritesSection(el: HTMLElement): void {
		new Setting(el).setDesc(
			"Select your 5 most used callout types. You can then assign hotkeys to them.",
		);

		for (let i = 0; i < 5; i++) {
			new Setting(el).setName(`Favorite ${i + 1}`).addDropdown((dropdown) => {
				this.buildGroupedDropdown(dropdown.selectEl, true);
				dropdown.setValue(this.plugin.settings.favoriteCallouts[i] ?? "");
				dropdown.onChange(async (value) => {
					try {
						this.plugin.settings.favoriteCallouts[i] = value;
						await this.plugin.saveSettings();
					} catch (e) {
						console.error("Enhanced Callout Manager: favorites save error", e);
					}
				});
			});
		}
	}

	// ── Section 5: Import / Export ───────────────────────────────────────────

	private buildImportExportSection(el: HTMLElement): void {
		const hasCallouts =
			Object.keys(this.plugin.settings.customCallouts).length > 0;

		// Export CSS
		if (!Platform.isMobile) {
			new Setting(el)
				.setName("Export as CSS snippet")
				.setDesc(
					"Download a CSS snippet file for your custom callout types.",
				)
				.addButton((b) => {
					b.setIcon("download")
						.setTooltip("Export CSS")
						.setDisabled(!hasCallouts)
						.onClick(() => {
							const css = this.plugin.calloutManager.generateCssString();
							const blob = new Blob([css], { type: "text/css" });
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = "custom_callouts.css";
							a.click();
							URL.revokeObjectURL(url);
						});
				});
		}

		// Export JSON
		new Setting(el)
			.setName("Export as JSON")
			.setDesc(
				"Download your custom callout types as JSON to share or back up.",
			)
			.addButton((b) =>
				b
					.setButtonText("Download all")
					.setCta()
					.setDisabled(!hasCallouts)
					.onClick(() => {
						this.downloadJson(
							Object.values(this.plugin.settings.customCallouts),
						);
					}),
			)
			.addButton((b) =>
				b
					.setButtonText("Select & download")
					.setDisabled(!hasCallouts)
					.onClick(() => {
						const modal = new ExportModal({
							app: this.app,
							customCallouts: this.plugin.settings.customCallouts,
						});
						modal.onClose = () => {
							if (!modal.export) return;
							const selected = Object.values(
								this.plugin.settings.customCallouts,
							).filter((cc) => modal.selectedCallouts.includes(cc.type));
							this.downloadJson(selected);
						};
						modal.open();
					}),
			);

		// Import JSON
		new Setting(el)
			.setName("Import from JSON")
			.setDesc("Import callout type definitions from a JSON file.")
			.addButton((b) => {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = ".json";
				input.multiple = true;
				input.style.display = "none";

				input.onchange = async () => {
					const files = input.files;
					if (!files || !files.length) return;

					try {
						const data: CustomCallout[] = [];
						for (const file of Array.from(files)) {
							const parsed = JSON.parse(await file.text()) as
								| CustomCallout[]
								| CustomCallout;
							if (Array.isArray(parsed)) {
								data.push(...parsed);
							} else {
								data.push(parsed);
							}
						}

						new Notice(`Importing ${data.length} callout type${data.length === 1 ? "" : "s"}…`);

						const validatorRef = {
							customCallouts: this.plugin.settings.customCallouts,
							iconManager: this.plugin.iconManager,
						};

						let imported = 0;
						for (const item of data) {
							if (typeof item !== "object") continue;
							const result = CalloutValidator.validateImport(
								validatorRef,
								item,
							);
							if (!result.success) {
								new Notice(
									`Could not import "${item.type}": ${result.message}`,
								);
								continue;
							}
							if (result.messages?.length) {
								for (const msg of result.messages) {
									new Notice(`Import warning for "${item.type}": ${msg}`);
								}
							}
							await this.plugin.addCustomCallout(item);
							imported++;
						}
						new Notice(`Import complete — ${imported} type${imported === 1 ? "" : "s"} added.`);
						this.display();
					} catch (e) {
						new Notice("There was an error importing the file(s).");
						console.error(e);
					}
					input.value = "";
				};

				b.setButtonText("Choose files");
				b.buttonEl.appendChild(input);
				b.onClick(() => input.click());
			});
	}

	private downloadJson(callouts: CustomCallout[]): void {
		if (!callouts.length) {
			new Notice("At least one type must be selected to export.");
			return;
		}
		const blob = new Blob([JSON.stringify(callouts, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "callout-types.json";
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── Section 6: Icon Packs ───────────────────────────────────────────────

	private buildIconPacksSection(el: HTMLElement): void {
		new Setting(el)
			.setName("Use Font Awesome icons")
			.setDesc("Font Awesome Free icons will be available in the icon picker.")
			.addToggle((t) => {
				t.setValue(this.plugin.settings.useFontAwesome);
				t.onChange(async (v) => {
					try {
						this.plugin.settings.useFontAwesome = v;
						this.plugin.iconManager.setIconDefinitions();
						await this.plugin.saveSettings();
					} catch (e) {
						console.error("Enhanced Callout Manager: icon toggle error", e);
					}
					this.display();
				});
			});

		// Additional icon packs require Font Awesome — hide when FA is off.
		if (!this.plugin.settings.useFontAwesome) return;

		const installed = this.plugin.settings.icons;
		const available = (
			Object.entries(DownloadableIcons) as [DownloadableIconPack, string][]
		).filter(([pack]) => !installed.includes(pack));

		let selectedPack: DownloadableIconPack | undefined = available[0]?.[0];

		new Setting(el)
			.setName("Load additional icon pack")
			.setDesc("Download an additional icon pack. Requires an internet connection.")
			.addDropdown((d) => {
				if (!available.length) {
					d.setDisabled(true);
					return;
				}
				for (const [pack, label] of available) {
					d.addOption(pack, label);
				}
				d.onChange((v: DownloadableIconPack) => {
					selectedPack = v;
				});
			})
			.addExtraButton((b) => {
				b.setIcon("plus-with-circle")
					.setTooltip("Download")
					.setDisabled(!available.length)
					.onClick(async () => {
						if (!selectedPack) return;
						try {
							await this.plugin.iconManager.downloadIcon(selectedPack);
						} catch (e) {
							console.error("Enhanced Callout Manager: download failed", e);
							new Notice("Could not download icon pack.");
						}
						this.display();
					});
			});

		if (installed.length > 0) {
			const packsEl = el.createDiv({ cls: "ecm-icon-packs" });
			for (const pack of installed) {
				new Setting(packsEl)
					.setName(DownloadableIcons[pack] ?? pack)
					.addExtraButton((b) => {
						b.setIcon("reset")
							.setTooltip("Redownload")
							.onClick(async () => {
								try {
									await this.plugin.iconManager.removeIcon(pack);
									await this.plugin.iconManager.downloadIcon(pack);
								} catch (e) {
									console.error("Enhanced Callout Manager: redownload failed", e);
									new Notice("Could not redownload icon pack.");
								}
								this.display();
							});
					})
					.addExtraButton((b) => {
						b.setIcon("trash")
							.setTooltip("Remove")
							.onClick(async () => {
								const usingThisPack = Object.values(
									this.plugin.settings.customCallouts,
								).some((cc) => cc.icon.type === pack);
								if (usingThisPack) {
									const ok = await confirmWithModal(
										this.app,
										"Some custom types use icons from this pack. Remove it anyway?",
									);
									if (!ok) return;
								}
								try {
									await this.plugin.iconManager.removeIcon(pack);
								} catch (e) {
									console.error("Enhanced Callout Manager: remove failed", e);
									new Notice("Could not remove icon pack.");
								}
								this.display();
							});
					});
			}
		}
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

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

// ─── Callout edit modal ───────────────────────────────────────────────────────

interface EditModalPluginRef {
	settings: {
		customCallouts: Record<string, CustomCallout>;
		injectColor: boolean;
	};
	iconManager: IconManager;
}

/**
 * Modal for creating or editing a single custom callout type.
 * Ported from obsidian-admonition SettingsModal (MIT, Jeremy Valentine).
 */
export class CalloutEditModal extends Modal {
	type = "";
	icon: CalloutIconDefinition = {};
	color = "125, 125, 125";
	injectColor: boolean;
	saved = false;

	private previewEl!: HTMLElement;
	private colorWrapperEl!: HTMLElement;
	private readonly originalType: string | undefined;

	constructor(
		app: App,
		private plugin: EditModalPluginRef,
		existing?: CustomCallout,
	) {
		super(app);
		this.injectColor = existing?.injectColor ?? plugin.settings.injectColor;
		if (existing) {
			this.type = existing.type;
			this.icon = { ...existing.icon };
			this.color = existing.color;
			this.originalType = existing.type;
		}
		this.containerEl.addClass("callout-edit-modal");
	}

	onOpen() {
		this.display();
	}

	private display() {
		const { contentEl } = this;
		contentEl.empty();
		this.titleEl.setText(
			this.originalType ? "Edit callout type" : "Add callout type",
		);

		// Live preview
		this.previewEl = contentEl.createDiv({ cls: "callout-edit-preview" });
		this.updatePreview();

		const form = contentEl.createDiv({ cls: "callout-edit-form" });

		// Type ID
		let typeInput: TextComponent;
		new Setting(form)
			.setName("Type ID")
			.setDesc('Used in markdown, e.g. "my-callout". No spaces allowed.')
			.addText((text) => {
				typeInput = text;
				text.setValue(this.type).onChange((v) => {
					const result = CalloutValidator.validateType(
						v,
						{
							customCallouts: this.plugin.settings.customCallouts,
							iconManager: this.plugin.iconManager,
						},
						this.originalType,
					);
					if (!result.success) {
						CalloutEditModal.setValidationError(text.inputEl, result.message);
						return;
					}
					CalloutEditModal.removeValidationError(text.inputEl);
					this.type = v;
					this.updatePreview();
				});
			});

		// Icon
		let iconInput: TextComponent;
		new Setting(form)
			.setName("Icon")
			.setDesc(
				"Icon name (Obsidian, Font Awesome, or downloaded pack). Type to search.",
			)
			.addText((text) => {
				iconInput = text;
				if (this.icon.type !== "image") {
					text.setValue(this.icon.name ?? "");
				}
				text.setPlaceholder("Search icons…");

				const suggest = new IconSuggestionModal(
					{ app: this.app, iconManager: this.plugin.iconManager },
					text,
					this.plugin.iconManager.iconDefinitions,
				);
				suggest.onSelect((item) => {
					text.inputEl.value = item.item.name ?? "";
					this.resolveAndSetIcon(item.item.name ?? "");
					suggest.close();
				});

				text.inputEl.addEventListener("blur", () => {
					this.resolveAndSetIcon(text.inputEl.value);
				});
			})
			.addButton((b) => {
				const fileInput = document.createElement("input");
				fileInput.type = "file";
				fileInput.accept = "image/*";
				fileInput.style.display = "none";

				b.setButtonText("Upload image").setIcon("image-file");
				b.buttonEl.appendChild(fileInput);
				b.onClick(() => fileInput.click());

				fileInput.onchange = () => {
					const file = fileInput.files?.[0];
					if (!file) return;
					const reader = new FileReader();
					reader.onloadend = (evt) => {
						const img = new Image();
						img.onload = () => {
							try {
								const canvas = document.createElement("canvas");
								const maxSize = 24;
								let w = img.width,
									h = img.height;
								if (w > h) {
									if (w > maxSize) {
										h = Math.round((h * maxSize) / w);
										w = maxSize;
									}
								} else {
									if (h > maxSize) {
										w = Math.round((w * maxSize) / h);
										h = maxSize;
									}
								}
								canvas.width = w;
								canvas.height = h;
								canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
								this.icon = {
									name: canvas.toDataURL("image/png"),
									type: "image",
								};
								this.updatePreview();
							} catch {
								new Notice("There was an error parsing the image.");
							}
						};
						img.src = evt.target!.result as string;
					};
					reader.readAsDataURL(file);
					fileInput.value = "";
				};
			});

		// Color (wrapper div so we can rebuild it in-place when toggle fires)
		this.colorWrapperEl = form.createDiv();
		this.buildColorSetting();

		// Footer buttons
		const footer = contentEl.createDiv({ cls: "callout-edit-footer" });
		new Setting(footer)
			.addButton((b) => {
				b.setTooltip("Save")
					.setIcon("checkmark")
					.setCta()
					.onClick(() => {
						// Commit any typed-but-not-blurred icon value
						const currentIconValue = iconInput?.inputEl.value ?? "";
						if (currentIconValue && this.icon.type !== "image") {
							this.resolveAndSetIcon(currentIconValue);
						}

						const result = CalloutValidator.validate(
							{
								customCallouts: this.plugin.settings.customCallouts,
								iconManager: this.plugin.iconManager,
							},
							typeInput.inputEl.value,
							this.icon,
							this.originalType,
						);
						if (!result.success) {
							new Notice(`Cannot save: ${result.message}`);
							return;
						}
						this.type = typeInput.inputEl.value;
						this.saved = true;
						this.close();
					});
			})
			.addExtraButton((b) => {
				b.setIcon("cross")
					.setTooltip("Cancel")
					.onClick(() => {
						this.saved = false;
						this.close();
					});
			});
	}

	private buildColorSetting(): void {
		this.colorWrapperEl.empty();
		new Setting(this.colorWrapperEl)
			.setName("Color")
			.setDesc(
				this.injectColor
					? "Set the callout color. Disable to set via CSS."
					: "Color injection disabled — set color manually via CSS.",
			)
			.addText((t) => {
				t.inputEl.setAttribute("type", "color");
				if (!this.injectColor) {
					t.inputEl.setAttribute("disabled", "true");
				}
				t.setValue(rgbToHex(this.color)).onChange((v) => {
					const rgb = hexToRgb(v);
					if (!rgb) return;
					this.color = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
					this.updatePreview();
				});
			})
			.addToggle((t) => {
				t.setValue(this.injectColor)
					.setTooltip(
						this.injectColor
							? "Disable color injection"
							: "Enable color injection",
					)
					.onChange((v) => {
						this.injectColor = v;
						this.buildColorSetting();
						this.updatePreview();
					});
			});
	}

	private resolveAndSetIcon(name: string): void {
		if (!name) return;
		const type = this.plugin.iconManager.getIconType(name);
		if (type) {
			this.icon = { name, type };
		} else {
			this.icon = { name };
		}
		this.updatePreview();
	}

	private updatePreview(): void {
		if (!this.previewEl) return;
		this.previewEl.empty();
		this.previewEl.addClass("callout");

		const header = this.previewEl.createDiv({ cls: "callout-title" });
		const iconEl = header.createDiv({ cls: "callout-icon" });

		const iconNode = this.plugin.iconManager.getIconNode(this.icon);
		if (iconNode) {
			iconEl.appendChild(iconNode);
		} else if (this.icon.name) {
			setIcon(iconEl, this.icon.name);
		}

		header.createDiv({
			cls: "callout-title-inner",
			text: this.type || "preview",
		});

		if (this.injectColor && this.color) {
			this.previewEl.style.setProperty("--callout-color", this.color);
		} else {
			this.previewEl.style.removeProperty("--callout-color");
		}
	}

	static setValidationError(el: HTMLInputElement, message?: string): void {
		el.addClass("is-invalid");
		if (message) {
			el.parentElement?.addClasses(["has-invalid-message", "unset-align-items"]);
			let mDiv = el.parentElement?.querySelector(
				".invalid-feedback",
			) as HTMLDivElement | null;
			if (!mDiv) {
				mDiv =
					el.parentElement?.createDiv({ cls: "invalid-feedback" }) ?? null;
			}
			mDiv?.setText(message);
		}
	}

	static removeValidationError(el: HTMLInputElement): void {
		el.removeClass("is-invalid");
		el.parentElement?.removeClasses([
			"has-invalid-message",
			"unset-align-items",
		]);
		el.parentElement?.querySelector(".invalid-feedback")?.remove();
	}
}
