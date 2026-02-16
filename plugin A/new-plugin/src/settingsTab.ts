import { App, PluginSettingTab, Setting } from "obsidian";
import type CalloutModalPlugin from "./main";

export class CalloutModalSettingTab extends PluginSettingTab {
    constructor(app: App, private plugin: CalloutModalPlugin) {
        super(app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // --- Callout Sources ---
        containerEl.createEl("h3", { text: "Callout Sources" });

        new Setting(containerEl)
            .setName("Scan CSS snippets")
            .setDesc("Detect custom callout types defined in .obsidian/snippets/*.css")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.parseSnippets)
                    .onChange(async (value) => {
                        this.plugin.settings.parseSnippets = value;
                        await this.plugin.saveSettings();
                        await this.plugin.refreshSnippetTypes();
                        this.display(); // refresh to show/hide detected types
                    });
            });

        // Show detected snippet types
        if (this.plugin.settings.parseSnippets && this.plugin.snippetCalloutTypes.length > 0) {
            const list = containerEl.createEl("div", { cls: "setting-item" });
            list.createEl("span", {
                text: `Detected ${this.plugin.snippetCalloutTypes.length} custom type(s): `,
                cls: "setting-item-description",
            });
            const types = this.plugin.snippetCalloutTypes
                .map(t => t.type)
                .join(", ");
            list.createEl("code", { text: types });
        }

        // --- Modal Defaults ---
        containerEl.createEl("h3", { text: "Modal Defaults" });

        new Setting(containerEl)
            .setName("Default callout type")
            .setDesc("The type pre-selected when the modal opens")
            .addText((text) => {
                text.setPlaceholder("note")
                    .setValue(this.plugin.settings.defaultCalloutType)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultCalloutType = value || "note";
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Remember last used type")
            .setDesc("Use the last selected type as the default next time")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.rememberLastType)
                    .onChange(async (value) => {
                        this.plugin.settings.rememberLastType = value;
                        await this.plugin.saveSettings();
                    });
            });

        // --- Behavior ---
        containerEl.createEl("h3", { text: "Behavior" });

        new Setting(containerEl)
            .setName("Auto-focus content field")
            .setDesc("Automatically focus the content textarea when the modal opens")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.autoFocusContent)
                    .onChange(async (value) => {
                        this.plugin.settings.autoFocusContent = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}
