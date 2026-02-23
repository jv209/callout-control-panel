/**
 * Tab builder — Title Overrides.
 */

import { Notice, Setting, setIcon } from "obsidian";
import type { SettingsTabContext } from "../types";

export function buildTitleOverridesTab(el: HTMLElement, ctx: SettingsTabContext): void {
	const overrides = ctx.plugin.settings.titleOverrides ?? {};

	let selectedType = "";
	let titleText = "";

	new Setting(el)
		.setName("Add title override")
		.setDesc(
			"Replace the default title for specific callout types in reading view. Only affects callouts without an explicit title in markdown.",
		)
		.addDropdown((d) => {
			const existing = new Set(Object.keys(overrides));
			ctx.buildGroupedDropdown(d.selectEl);
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
					ctx.plugin.settings.titleOverrides[selectedType] = titleText.trim();
					await ctx.plugin.saveSettings();
					ctx.refresh();
				});
		});

	const entries = Object.entries(overrides);
	if (entries.length === 0) {
		el.createEl("p", {
			text: "No title overrides defined yet.",
			cls: "setting-item-description",
		});
		return;
	}

	const listEl = el.createDiv({ cls: "ccp-title-overrides" });

	// Table header
	const headerEl = listEl.createDiv({
		cls: "ccp-title-override-row ccp-title-override-header",
	});
	headerEl.createSpan({ text: "Callout Type", cls: "ccp-title-override-col-type" });
	headerEl.createSpan({ text: "Custom Title", cls: "ccp-title-override-col-title" });
	headerEl.createSpan({ text: "", cls: "ccp-title-override-col-actions" });

	for (const [type, title] of entries) {
		const rowEl = listEl.createDiv({ cls: "ccp-title-override-row" });
		const label = type.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

		rowEl.createSpan({
			text: label,
			cls: "ccp-title-override-col-type",
		});

		// Inline-editable title input
		const titleCell = rowEl.createDiv({ cls: "ccp-title-override-col-title" });
		const titleInput = titleCell.createEl("input", {
			cls: "ccp-title-override-input",
			attr: { type: "text", value: title },
		});
		titleInput.addEventListener("change", async () => {
			const v = titleInput.value.trim();
			if (v) {
				ctx.plugin.settings.titleOverrides[type] = v;
			} else {
				delete ctx.plugin.settings.titleOverrides[type];
			}
			await ctx.plugin.saveSettings();
		});

		// Delete button
		const actionsEl = rowEl.createDiv({ cls: "ccp-title-override-col-actions custom-callout-actions" });
		const deleteBtn = actionsEl.createDiv({ cls: "clickable-icon" });
		setIcon(deleteBtn, "trash");
		deleteBtn.setAttribute("aria-label", "Remove override");
		deleteBtn.addEventListener("click", async () => {
			delete ctx.plugin.settings.titleOverrides[type];
			await ctx.plugin.saveSettings();
			ctx.refresh();
		});
	}
}
