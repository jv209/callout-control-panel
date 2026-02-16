/**
 * Callout Modal Plugin — standalone Obsidian plugin for callout insertion.
 *
 * Attribution: The callout insertion modal is derived from the Editing Toolbar
 * plugin by Cuman (https://github.com/cumany/obsidian-editing-toolbar),
 * licensed under MIT.
 */

import { Plugin } from "obsidian";
import { InsertCalloutModal } from "./insertCalloutModal";
import { parseSnippetCalloutTypes } from "./snippetParser";
import { CalloutModalSettingTab } from "./settingsTab";
import type { CalloutModalSettings, SnippetCalloutType } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export default class CalloutModalPlugin extends Plugin {
    settings: CalloutModalSettings;
    snippetCalloutTypes: SnippetCalloutType[] = [];

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new CalloutModalSettingTab(this.app, this));

        // Register the single command — user assigns hotkey in Obsidian settings
        this.addCommand({
            id: "insert-callout",
            name: "Insert Callout",
            callback: () => {
                new InsertCalloutModal(this.app, this.snippetCalloutTypes).open();
            },
        });

        // Load snippet callout types once layout is ready
        this.app.workspace.onLayoutReady(async () => {
            if (this.settings.parseSnippets) {
                this.snippetCalloutTypes = await parseSnippetCalloutTypes(this.app);
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /** Re-scan snippet files (called from settings tab after toggle). */
    async refreshSnippetTypes() {
        if (this.settings.parseSnippets) {
            this.snippetCalloutTypes = await parseSnippetCalloutTypes(this.app);
        } else {
            this.snippetCalloutTypes = [];
        }
    }
}
