import { App, SuggestModal, MarkdownView, setIcon } from "obsidian";
import { type CalloutTypeInfo, type CollapseState, BUILTIN_CALLOUT_TYPES } from "./types";
import type { IconManager } from "./icons/manager";

/** A fast callout picker that inserts a callout block at the cursor. */
export class QuickPickCalloutModal extends SuggestModal<CalloutTypeInfo> {
	private allCalloutOptions: CalloutTypeInfo[] = [];
	private onChoose: (type: string) => void;
	private iconManager: IconManager | undefined;

	constructor(
		app: App,
		customTypes: CalloutTypeInfo[],
		snippetTypes: CalloutTypeInfo[],
		onChoose: (type: string) => void,
		iconManager?: IconManager,
	) {
		super(app);
		this.onChoose = onChoose;
		this.iconManager = iconManager;
		this.setPlaceholder("Choose a callout type...");
		this.prepareCalloutOptions(customTypes, snippetTypes);
	}

	private prepareCalloutOptions(
		customTypes: CalloutTypeInfo[],
		snippetTypes: CalloutTypeInfo[],
	) {
		// Custom types (user-defined) first
		for (const ct of customTypes) {
			this.allCalloutOptions.push(ct);
		}

		// Snippet types (CSS-detected) second
		for (const st of snippetTypes) {
			this.allCalloutOptions.push(st);
		}

		// Built-in types with aliases last
		for (const bt of BUILTIN_CALLOUT_TYPES) {
			this.allCalloutOptions.push(bt);
			if (bt.aliases) {
				for (const alias of bt.aliases) {
					this.allCalloutOptions.push({
						type: alias,
						label: `${bt.label} (${alias})`,
						icon: bt.icon,
						color: bt.color,
						source: "builtin",
					});
				}
			}
		}
	}

	getSuggestions(query: string): CalloutTypeInfo[] {
		const lower = query.toLowerCase();
		if (!lower) return this.allCalloutOptions;
		return this.allCalloutOptions.filter(
			(opt) =>
				opt.type.toLowerCase().includes(lower) ||
				opt.label.toLowerCase().includes(lower),
		);
	}

	renderSuggestion(item: CalloutTypeInfo, el: HTMLElement) {
		const container = el.createDiv({ cls: "quick-pick-callout-item" });
		const iconEl = container.createDiv({ cls: "quick-pick-callout-icon" });

		// Use the full icon definition for non-Lucide icons when available.
		let rendered = false;
		if (item.iconDef && this.iconManager) {
			const node = this.iconManager.getIconNode(item.iconDef);
			if (node) {
				iconEl.appendChild(node);
				rendered = true;
			}
		}
		if (!rendered) {
			setIcon(iconEl, item.icon);
		}

		iconEl.style.setProperty("--callout-color", item.color);
		container.createDiv({ cls: "quick-pick-callout-label", text: item.label });

		// Show source tag for non-builtin types
		if (item.source !== "builtin") {
			container.createDiv({
				cls: "quick-pick-callout-source",
				text: item.source,
			});
		}
	}

	onChooseSuggestion(item: CalloutTypeInfo) {
		this.onChoose(item.type);
	}

	/** Insert a bare callout block into the active editor. */
	static insertQuickCallout(app: App, type: string, collapse: CollapseState = "none") {
		const editor =
			app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
		if (!editor) return;

		const foldMarker = collapse === "open" ? "+" : collapse === "closed" ? "-" : "";
		let calloutText = `> [!${type}]${foldMarker}\n> `;

		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const isLineStart = cursor.ch === 0;

		if (editor.getSelection()) {
			const selected = editor.getSelection();
			calloutText = `> [!${type}]${foldMarker}\n> ${selected.replace(/\n/g, "\n> ")}`;
			if (!isLineStart && line.trim().length > 0) {
				calloutText = "\n" + calloutText;
			}
			const selectionStart = editor.getCursor("from");
			editor.replaceSelection(calloutText);
			const calloutLines = calloutText.split("\n").length;
			const newCursorPos = {
				line: selectionStart.line + calloutLines,
				ch: 0,
			};
			setTimeout(() => {
				editor.replaceRange("\n", newCursorPos);
				editor.setCursor({ line: newCursorPos.line + 1, ch: 0 });
				editor.focus();
			}, 0);
		} else {
			if (!isLineStart && line.trim().length > 0) {
				calloutText = "\n" + calloutText;
			}
			editor.replaceRange(calloutText, cursor);
			const calloutLines = calloutText.split("\n").length;
			// Place cursor on the content line (after "> ")
			setTimeout(() => {
				editor.setCursor({
					line: cursor.line + calloutLines - 1,
					ch: 2,
				});
				editor.focus();
			}, 0);
		}
	}
}
