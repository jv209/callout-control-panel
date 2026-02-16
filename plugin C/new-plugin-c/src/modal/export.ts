/**
 * Export selection modal — lets users pick which callout types to export.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * NOTE: References a plugin interface. Replace with your plugin class.
 */

import { Modal, Setting } from "obsidian";
import { Admonition } from "../@types";

/** Minimum plugin surface area needed by Export modal. */
export interface ExportPluginRef {
    app: any;
    data: { userAdmonitions: Record<string, Admonition> };
}

export default class Export extends Modal {
    constructor(public plugin: ExportPluginRef) {
        super(plugin.app);
    }
    admonitionDefinitions = Object.values(this.plugin.data.userAdmonitions);
    admonitionNames = Object.keys(this.plugin.data.userAdmonitions);
    selectedAdmonitions = [...this.admonitionNames];
    export = false;

    onOpen() {
        this.titleEl.setText("Export Callout Types");
        this.containerEl.addClasses([
            "admonition-settings",
            "admonition-modal",
            "admonition-export-modal"
        ]);
        new Setting(this.contentEl).addButton((b) =>
            b.setButtonText("Export Selected").onClick(() => {
                this.export = true;
                this.close();
            })
        );
        let toggleEl: HTMLDivElement;
        new Setting(this.contentEl)
            .addButton((b) =>
                b
                    .setButtonText("Select All")
                    .setCta()
                    .onClick(() => {
                        this.selectedAdmonitions = [...this.admonitionNames];
                        this.generateToggles(toggleEl);
                    })
            )
            .addButton((b) =>
                b.setButtonText("Deselect All").onClick(() => {
                    this.selectedAdmonitions = [];
                    this.generateToggles(toggleEl);
                })
            );
        toggleEl = this.contentEl.createDiv("additional");
        this.generateToggles(toggleEl);
    }

    generateToggles(toggleEl: HTMLDivElement) {
        toggleEl.empty();
        for (const name of this.admonitionNames) {
            new Setting(toggleEl).setName(name).addToggle((t) => {
                t.setValue(this.selectedAdmonitions.includes(name)).onChange(
                    (v) => {
                        if (v) {
                            this.selectedAdmonitions.push(name);
                        } else {
                            this.selectedAdmonitions.remove(name);
                        }
                    }
                );
            });
        }
    }
}
