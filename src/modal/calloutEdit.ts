/**
 * Modal for creating or editing a single custom callout type.
 * Extracted from settingsTab.ts.
 *
 * Ported from obsidian-admonition SettingsModal (MIT, Jeremy Valentine).
 */

import {
	App,
	Modal,
	Notice,
	Setting,
	TextComponent,
	setIcon,
} from "obsidian";
import type { CalloutIconDefinition, CustomCallout } from "../types";
import type { IconManager } from "../icons/manager";
import { IconSuggestionModal } from "./iconSuggestionModal";
import { CalloutValidator } from "../util/validator";
import { hexToRgb, rgbToHex } from "../util/color";

// ─── Plugin surface required by this modal ────────────────────────────────────

interface EditModalPluginRef {
	settings: {
		customCallouts: Record<string, CustomCallout>;
		injectColor: boolean;
	};
	iconManager: IconManager;
}

// ─── Modal class ─────────────────────────────────────────────────────────────

/**
 * Modal for creating or editing a single custom callout type.
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
			.setName("Type identifier")
			// eslint-disable-next-line obsidianmd/ui/sentence-case -- multi-sentence description
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
				// eslint-disable-next-line obsidianmd/ui/sentence-case -- proper nouns
			"Icon name (Obsidian, Font Awesome, or downloaded pack). Type to search.",
			)
			.addText((text) => {
				iconInput = text;
				if (this.icon.type === "no-icon") {
					text.setValue("no-icon");
					text.inputEl.setAttribute("disabled", "true");
				} else if (this.icon.type !== "image") {
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
					if (this.icon.type !== "no-icon") {
						this.resolveAndSetIcon(text.inputEl.value);
					}
				});
			})
			.addButton((b) => {
				b.setButtonText("No icon")
					.setTooltip("Toggle icon visibility. Click again to restore the icon field.")
					.onClick(() => {
						if (this.icon.type === "no-icon") {
							// Undo: re-enable the input and reset icon state
							this.icon = {};
							// eslint-disable-next-line @typescript-eslint/no-misused-promises -- iconInput is TextComponent, not Promise
							if (iconInput) {
								iconInput.inputEl.value = "";
								iconInput.inputEl.removeAttribute("disabled");
								iconInput.inputEl.focus();
							}
						} else {
							// Activate no-icon mode
							this.icon = { name: "no-icon", type: "no-icon" };
							// eslint-disable-next-line @typescript-eslint/no-misused-promises -- iconInput is TextComponent, not Promise
							if (iconInput) {
								iconInput.inputEl.value = "no-icon";
								iconInput.inputEl.setAttribute("disabled", "true");
							}
						}
						this.updatePreview();
					});
			})
			.addButton((b) => {
				const fileInput = document.createElement("input");
				fileInput.type = "file";
				fileInput.accept = "image/*";
				fileInput.addClass("ccp-sr-only");

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
								// eslint-disable-next-line @typescript-eslint/no-misused-promises -- iconInput is TextComponent, not Promise
							if (iconInput) {
									iconInput.inputEl.removeAttribute("disabled");
								}
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
						if (currentIconValue && this.icon.type !== "image" && this.icon.type !== "no-icon") {
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
		if (name === "no-icon") {
			this.icon = { name: "no-icon", type: "no-icon" };
		} else {
			const type = this.plugin.iconManager.getIconType(name);
			if (type) {
				this.icon = { name, type };
			} else {
				this.icon = { name };
			}
		}
		this.updatePreview();
	}

	private updatePreview(): void {
		if (!this.previewEl) return;
		this.previewEl.empty();
		this.previewEl.addClass("callout");

		const header = this.previewEl.createDiv({ cls: "callout-title" });

		// Hide icon element entirely for no-icon callouts
		if (this.icon.type !== "no-icon") {
			const iconEl = header.createDiv({ cls: "callout-icon" });
			const iconNode = this.plugin.iconManager.getIconNode(this.icon);
			if (iconNode) {
				iconEl.appendChild(iconNode);
			} else if (this.icon.name) {
				setIcon(iconEl, this.icon.name);
			}
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
