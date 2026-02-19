/**
 * Callout insertion modal — ported from the Editing Toolbar plugin.
 *
 * Attribution: Original implementation by Cuman
 * (https://github.com/cumany/obsidian-editing-toolbar), licensed under MIT.
 *
 * Changes from original:
 * - Uses unified CalloutTypeInfo and BUILTIN_CALLOUT_TYPES from types.ts
 * - Removed editing-toolbar and Admonition plugin dependencies
 * - Accepts settings-driven configuration (default type, auto-focus)
 * - Three-section grouped dropdown: Custom → Snippet → Default (Phase 3)
 * - Non-Lucide icon rendering via optional IconManager (Phase 3)
 */

import { App, Modal, Setting, setIcon, Platform, MarkdownView } from "obsidian";
import { type CalloutTypeInfo, BUILTIN_CALLOUT_TYPES } from "./types";
import type { IconManager } from "./icons/manager";

/** Configuration passed from the plugin to the modal. */
export interface InsertCalloutModalConfig {
	defaultType: string;
	autoFocusContent: boolean;
	/** Snippet-detected callout types (shown in the "Snippet" group). */
	snippetTypes: CalloutTypeInfo[];
	/** User-defined custom callout types (shown first, in the "Custom" group). */
	customTypes?: CalloutTypeInfo[];
	/** Icon manager for rendering Font Awesome / downloaded-pack icons. */
	iconManager?: IconManager;
}

export class InsertCalloutModal extends Modal {
	public type: string;
	public title: string = "";
	public content: string = "";
	public collapse: "none" | "open" | "closed" = "none";
	private insertButton: HTMLElement;
	private contentTextArea: HTMLTextAreaElement;
	private customOptions: CalloutTypeInfo[] = [];
	private builtinOptions: CalloutTypeInfo[] = [];
	private snippetOptions: CalloutTypeInfo[] = [];
	private allCalloutOptions: CalloutTypeInfo[] = [];
	private iconContainerEl: HTMLElement;
	private autoFocusContent: boolean;

	constructor(app: App, private config: InsertCalloutModalConfig) {
		super(app);
		this.type = config.defaultType;
		this.autoFocusContent = config.autoFocusContent;
		this.containerEl.addClass("insert-callout-modal");
		this.prepareCalloutOptions();

		// Pre-populate content with selected text
		const editor = this.getEditor();
		if (editor) {
			const selectedText = editor.getSelection();
			if (selectedText) {
				this.content = selectedText;
			}
		}

		// Validate default type
		if (!this.allCalloutOptions.find(opt => opt.type === this.type)) {
			this.type = this.allCalloutOptions[0]?.type ?? "note";
		}
	}

	/** Get the active editor via the Obsidian API. */
	private getEditor() {
		return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
	}

	private prepareCalloutOptions() {
		// Custom types (user-defined) — shown first
		this.customOptions = [...(this.config.customTypes ?? [])];

		// Snippet types (CSS-detected)
		this.snippetOptions = [...this.config.snippetTypes];

		// Built-in types with their aliases expanded into separate options
		for (const bt of BUILTIN_CALLOUT_TYPES) {
			this.builtinOptions.push({
				type: bt.type,
				label: bt.label,
				icon: bt.icon,
				color: bt.color,
				source: "builtin",
			});
			if (bt.aliases) {
				for (const alias of bt.aliases) {
					this.builtinOptions.push({
						type: alias,
						label: `${bt.label} (${alias})`,
						icon: bt.icon,
						color: bt.color,
						source: "builtin",
					});
				}
			}
		}

		// Combined list for lookups: custom → snippet → builtin
		this.allCalloutOptions = [
			...this.customOptions,
			...this.snippetOptions,
			...this.builtinOptions,
		];
	}

	onOpen() {
		this.display();
	}

	private display() {
		const { contentEl } = this;
		contentEl.empty();

		// Ctrl/Cmd+Enter to insert
		contentEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				if (this.insertButton) {
					this.insertButton.click();
				}
			}
		});

		// --- Type dropdown with icon preview ---
		const typeContainer = contentEl.createDiv("callout-type-container");
		this.iconContainerEl = typeContainer.createDiv("callout-icon-container");

		new Setting(typeContainer)
			.setName("Callout type")
			.addDropdown((dropdown) => {
				const selectEl = dropdown.selectEl;

				// Custom group (user-defined) — first
				if (this.customOptions.length > 0) {
					const customGroup = selectEl.createEl("optgroup", {
						attr: { label: "Custom" },
					});
					for (const opt of this.customOptions) {
						customGroup.createEl("option", {
							value: opt.type,
							text: opt.label,
						});
					}
				}

				// Snippet group (CSS-detected) — second
				if (this.snippetOptions.length > 0) {
					const snippetGroup = selectEl.createEl("optgroup", {
						attr: { label: "Snippet" },
					});
					for (const opt of this.snippetOptions) {
						snippetGroup.createEl("option", {
							value: opt.type,
							text: opt.label,
						});
					}
				}

				// Default group (built-in Obsidian) — last
				const builtinGroup = selectEl.createEl("optgroup", {
					attr: { label: "Default" },
				});
				for (const opt of this.builtinOptions) {
					builtinGroup.createEl("option", {
						value: opt.type,
						text: opt.label,
					});
				}

				// Validate and set initial value
				if (!this.allCalloutOptions.some(opt => opt.type === this.type)) {
					this.type = this.allCalloutOptions[0]?.type ?? "note";
				}
				dropdown.setValue(this.type);
				dropdown.onChange((value) => {
					this.type = value;
					this.updateIconAndColor(this.iconContainerEl, value);
				});
			});
		this.updateIconAndColor(this.iconContainerEl, this.type);

		// --- Title ---
		new Setting(contentEl)
			.setName("Title")
			.setDesc("Optional, leave blank for default title")
			.addText((text) => {
				text.setPlaceholder("Input title")
					.setValue(this.title)
					.onChange((value) => { this.title = value; });
			});

		// --- Collapse state ---
		new Setting(contentEl)
			.setName("Collapse state")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", "Default")
					.addOption("open", "Open")
					.addOption("closed", "Closed")
					.setValue(this.collapse)
					.onChange((value: "none" | "open" | "closed") => { this.collapse = value; });
			});

		// --- Content ---
		new Setting(contentEl)
			.setName("Content")
			.addTextArea((text) => {
				text.setPlaceholder("Input content")
					.setValue(this.content)
					.onChange((value) => { this.content = value; });
				text.inputEl.rows = 5;
				text.inputEl.cols = 40;
				this.contentTextArea = text.inputEl;
			});

		// --- Keyboard shortcut hint ---
		const shortcutHint = contentEl.createDiv("insert-callout-shortcut-hint");
		shortcutHint.setText(`${Platform.isMacOS ? "\u2318" : "Ctrl"} + Enter to insert`);

		// --- Buttons ---
		new Setting(contentEl)
			.addButton((btn) => {
				btn.setButtonText("Insert")
					.setCta()
					.onClick(() => {
						this.insertCallout();
						this.close();
					});
				this.insertButton = btn.buttonEl;
				return btn;
			})
			.addButton((btn) => {
				btn.setButtonText("Cancel")
					.setTooltip("Cancel")
					.onClick(() => this.close());
				return btn;
			});

		// Auto-focus content textarea
		if (this.autoFocusContent) {
			setTimeout(() => {
				if (this.contentTextArea) {
					this.contentTextArea.focus();
				}
			}, 10);
		}
	}

	private updateIconAndColor(iconContainer: HTMLElement, typeKey: string) {
		if (!iconContainer) return;
		const typeInfo = this.allCalloutOptions.find(t => t.type === typeKey);
		iconContainer.empty();

		if (typeInfo) {
			// Use the full icon definition (Font Awesome / downloaded pack / image)
			// when available, otherwise fall back to Lucide via setIcon.
			let rendered = false;
			if (typeInfo.iconDef && this.config.iconManager) {
				const node = this.config.iconManager.getIconNode(typeInfo.iconDef);
				if (node) {
					iconContainer.appendChild(node);
					rendered = true;
				}
			}
			if (!rendered) {
				setIcon(iconContainer, typeInfo.icon);
			}
			iconContainer.style.setProperty("--callout-color", typeInfo.color);
		} else {
			setIcon(iconContainer, "lucide-alert-circle");
			iconContainer.style.removeProperty("--callout-color");
		}
	}

	private insertCallout() {
		const editor = this.getEditor();
		if (!editor) return;

		// Build callout text
		let calloutText = `> [!${this.type}]`;
		if (this.collapse !== "none") {
			calloutText += this.collapse === "open" ? "+" : "-";
		}
		if (this.title) {
			calloutText += ` ${this.title}`;
		}
		calloutText += `\n> ${this.content.replace(/\n/g, "\n> ")}`;

		// Cursor positioning
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const isLineStart = cursor.ch === 0;
		let newCursorPos: { line: number; ch: number };

		if (editor.getSelection()) {
			if (!isLineStart && line.trim().length > 0) {
				calloutText = "\n" + calloutText;
			}
			const selectionStart = editor.getCursor("from");
			editor.replaceSelection(calloutText);
			const calloutLines = calloutText.split("\n").length;
			newCursorPos = { line: selectionStart.line + calloutLines, ch: 0 };
		} else {
			if (!isLineStart && line.trim().length > 0) {
				calloutText = "\n" + calloutText;
			}
			editor.replaceRange(calloutText, cursor);
			const calloutLines = calloutText.split("\n").length;
			newCursorPos = { line: cursor.line + calloutLines, ch: 0 };
		}

		// Place cursor below the callout
		setTimeout(() => {
			editor.replaceRange("\n", newCursorPos);
			editor.setCursor({ line: newCursorPos.line + 1, ch: 0 });
			editor.focus();
		}, 0);
	}
}
