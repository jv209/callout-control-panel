/**
 * Callout insertion modal — extracted and cleaned from the Editing Toolbar plugin.
 *
 * Attribution: Original implementation by Cuman
 * (https://github.com/cumany/obsidian-editing-toolbar), licensed under MIT.
 *
 * Changes from original:
 * - Removed dependency on editingToolbarPlugin class
 * - Removed Admonition plugin integration (replaced by snippet parser)
 * - Removed t() translation helper (plain strings)
 * - Uses Obsidian API directly for editor access
 * - Simplified CombinedCalloutTypeInfo (no isAdmonition/sourcePlugin)
 */

import { App, Modal, Setting, setIcon, DropdownComponent, Platform, MarkdownView } from "obsidian";
import type { BuiltInCalloutType, CombinedCalloutTypeInfo, SnippetCalloutType } from "./types";

export class InsertCalloutModal extends Modal {
    public type: string = "note";
    public title: string = "";
    public content: string = "";
    public collapse: "none" | "open" | "closed" = "none";
    private insertButton: HTMLElement;
    private contentTextArea: HTMLTextAreaElement;
    private allCalloutOptions: CombinedCalloutTypeInfo[] = [];
    private iconContainerEl: HTMLElement;

    private readonly builtInCalloutTypes: BuiltInCalloutType[] = [
        { type: "note",      aliases: [],                          icon: "lucide-pencil",          label: "Note",     color: "var(--callout-default)" },
        { type: "abstract",  aliases: ["summary", "tldr"],         icon: "lucide-clipboard-list",  label: "Abstract", color: "var(--callout-summary)" },
        { type: "info",      aliases: [],                          icon: "lucide-info",            label: "Info",     color: "var(--callout-info)" },
        { type: "todo",      aliases: [],                          icon: "lucide-check-circle-2",  label: "Todo",     color: "var(--callout-todo)" },
        { type: "important", aliases: [],                          icon: "lucide-flame",           label: "Important",color: "var(--callout-important)" },
        { type: "tip",       aliases: ["hint"],                    icon: "lucide-flame",           label: "Tip",      color: "var(--callout-tip)" },
        { type: "success",   aliases: ["check", "done"],           icon: "lucide-check",           label: "Success",  color: "var(--callout-success)" },
        { type: "question",  aliases: ["help", "faq"],             icon: "lucide-help-circle",     label: "Question", color: "var(--callout-question)" },
        { type: "warning",   aliases: ["caution", "attention"],    icon: "lucide-alert-triangle",  label: "Warning",  color: "var(--callout-warning)" },
        { type: "failure",   aliases: ["fail", "missing"],         icon: "lucide-x",               label: "Failure",  color: "var(--callout-fail)" },
        { type: "danger",    aliases: ["error"],                   icon: "lucide-zap",             label: "Danger",   color: "var(--callout-error)" },
        { type: "bug",       aliases: [],                          icon: "lucide-bug",             label: "Bug",      color: "var(--callout-bug)" },
        { type: "example",   aliases: [],                          icon: "lucide-list",            label: "Example",  color: "var(--callout-example)" },
        { type: "quote",     aliases: ["cite"],                    icon: "lucide-quote",           label: "Quote",    color: "var(--callout-quote)" },
    ];

    /**
     * @param app          - The Obsidian App instance
     * @param snippetTypes - Custom callout types discovered from CSS snippets
     */
    constructor(app: App, private snippetTypes: SnippetCalloutType[] = []) {
        super(app);
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
            this.type = this.allCalloutOptions.length > 0 ? this.allCalloutOptions[0].type : "note";
        }
    }

    /** Get the active editor via the Obsidian API. */
    private getEditor() {
        return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
    }

    private prepareCalloutOptions() {
        // 1. Built-in types + aliases
        this.builtInCalloutTypes.forEach(bt => {
            this.allCalloutOptions.push({
                type: bt.type,
                label: bt.label,
                icon: bt.icon,
                color: bt.color,
                source: "builtin",
            });
            bt.aliases.forEach(alias => {
                this.allCalloutOptions.push({
                    type: alias,
                    label: `${bt.label} (${alias})`,
                    icon: bt.icon,
                    color: bt.color,
                    source: "builtin",
                });
            });
        });

        // 2. Snippet-defined custom types
        if (this.snippetTypes.length > 0) {
            this.snippetTypes.forEach(st => {
                if (!this.allCalloutOptions.some(opt => opt.type === st.type)) {
                    this.allCalloutOptions.push({
                        type: st.type,
                        label: st.type.charAt(0).toUpperCase() + st.type.slice(1),
                        icon: st.icon,
                        color: st.color,
                        source: "snippet",
                    });
                }
            });
        }
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
            .setName("Callout Type")
            .addDropdown((dropdown: DropdownComponent) => {
                const builtIns = this.allCalloutOptions.filter(opt => opt.source === "builtin");
                const snippets = this.allCalloutOptions.filter(opt => opt.source === "snippet");

                // Snippet types first (if any)
                if (snippets.length > 0 && builtIns.length > 0) {
                    dropdown.addOption("---separator---", "---- Snippets ----");
                    const sep = dropdown.selectEl.options[dropdown.selectEl.options.length - 1];
                    if (sep) sep.disabled = true;
                }
                snippets.forEach(opt => {
                    dropdown.addOption(opt.type, `${opt.label} (Snippet)`);
                });

                // Built-in types
                if (snippets.length > 0) {
                    dropdown.addOption("---separator-default---", "---- Default ----");
                    const sep = dropdown.selectEl.options[dropdown.selectEl.options.length - 1];
                    if (sep) sep.disabled = true;
                }
                builtIns.forEach(opt => {
                    dropdown.addOption(opt.type, opt.label);
                });

                if (!this.allCalloutOptions.some(opt => opt.type === this.type)) {
                    this.type = this.allCalloutOptions.length > 0 ? this.allCalloutOptions[0].type : "note";
                }
                dropdown.setValue(this.type);
                dropdown.onChange((value) => {
                    if (value.startsWith("---separator")) {
                        dropdown.setValue(this.type);
                        return;
                    }
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
            .setName("Collapse State")
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
        const shortcutHint = contentEl.createDiv("shortcut-hint");
        shortcutHint.setText(`${Platform.isMacOS ? "\u2318" : "Ctrl"} + Enter to insert`);
        shortcutHint.style.textAlign = "right";
        shortcutHint.style.fontSize = "0.8em";
        shortcutHint.style.opacity = "0.7";
        shortcutHint.style.marginTop = "5px";

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
        setTimeout(() => {
            if (this.contentTextArea) {
                this.contentTextArea.focus();
            }
        }, 10);
    }

    private updateIconAndColor(iconContainer: HTMLElement, typeKey: string) {
        if (!iconContainer) return;
        const typeInfo = this.allCalloutOptions.find(t => t.type === typeKey);
        iconContainer.empty();

        if (typeInfo) {
            setIcon(iconContainer, typeInfo.icon);
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
