/**
 * Export selection modal — lets users pick which callout types to export.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * Changes from the original:
 * - Uses CustomCallout instead of Admonition
 * - Uses typed App import instead of `any`
 */

import { type App, Modal, Setting } from "obsidian";
import type { CustomCallout } from "../callout/manager";

/** Minimum plugin surface area needed by the Export modal. */
export interface ExportPluginRef {
	app: App;
	customCallouts: Record<string, CustomCallout>;
}

export class ExportModal extends Modal {
	calloutNames: string[];
	selectedCallouts: string[];
	export = false;

	constructor(public plugin: ExportPluginRef) {
		super(plugin.app);
		this.calloutNames = Object.keys(this.plugin.customCallouts);
		this.selectedCallouts = [...this.calloutNames];
	}

	onOpen() {
		this.titleEl.setText("Export callout types");
		this.containerEl.addClasses([
			"callout-export-modal",
		]);

		new Setting(this.contentEl).addButton((b) =>
			b.setButtonText("Export Selected").onClick(() => {
				this.export = true;
				this.close();
			}),
		);

		let toggleEl: HTMLDivElement;
		new Setting(this.contentEl)
			.addButton((b) =>
				b
					.setButtonText("Select All")
					.setCta()
					.onClick(() => {
						this.selectedCallouts = [...this.calloutNames];
						this.generateToggles(toggleEl);
					}),
			)
			.addButton((b) =>
				b.setButtonText("Deselect All").onClick(() => {
					this.selectedCallouts = [];
					this.generateToggles(toggleEl);
				}),
			);

		toggleEl = this.contentEl.createDiv("additional");
		this.generateToggles(toggleEl);
	}

	generateToggles(toggleEl: HTMLDivElement) {
		toggleEl.empty();
		for (const name of this.calloutNames) {
			new Setting(toggleEl).setName(name).addToggle((t) => {
				t.setValue(this.selectedCallouts.includes(name)).onChange(
					(v) => {
						if (v) {
							this.selectedCallouts.push(name);
						} else {
							this.selectedCallouts.remove(name);
						}
					},
				);
			});
		}
	}
}
