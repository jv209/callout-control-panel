/**
 * Tab builder — Import / Export.
 */

import { Notice, Platform, Setting } from "obsidian";
import type { CustomCallout } from "../../types";
import { ExportModal } from "../../modal/export";
import { CalloutValidator } from "../../util/validator";
import type { SettingsTabContext } from "../types";

export function buildImportExportTab(el: HTMLElement, ctx: SettingsTabContext): void {
	const hasCallouts =
		Object.keys(ctx.plugin.settings.customCallouts).length > 0;

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
						const css = ctx.plugin.calloutManager.generateCssString();
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
					downloadJson(Object.values(ctx.plugin.settings.customCallouts));
				}),
		)
		.addButton((b) =>
			b
				.setButtonText("Select & download")
				.setDisabled(!hasCallouts)
				.onClick(() => {
					const modal = new ExportModal({
						app: ctx.app,
						customCallouts: ctx.plugin.settings.customCallouts,
					});
					modal.onClose = () => {
						if (!modal.export) return;
						const selected = Object.values(
							ctx.plugin.settings.customCallouts,
						).filter((cc) => modal.selectedCallouts.includes(cc.type));
						downloadJson(selected);
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
						customCallouts: ctx.plugin.settings.customCallouts,
						iconManager: ctx.plugin.iconManager,
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
						await ctx.plugin.addCustomCallout(item);
						imported++;
					}
					new Notice(`Import complete — ${imported} type${imported === 1 ? "" : "s"} added.`);
					ctx.refresh();
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

export function downloadJson(callouts: CustomCallout[]): void {
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
