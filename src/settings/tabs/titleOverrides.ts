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
		.setDesc("Override titles for callout types in reading view")
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

	// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
	const entries = Object.entries(overrides);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
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
	headerEl.createSpan({ text: "Callout type", cls: "ccp-title-override-col-type" });
	headerEl.createSpan({ text: "Custom title", cls: "ccp-title-override-col-title" });
	headerEl.createSpan({ text: "", cls: "ccp-title-override-col-actions" });

	for (const [type, title] of entries) {
		const rowEl = listEl.createDiv({ cls: "ccp-title-override-row" });
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
		const label = type.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

		rowEl.createSpan({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
			text: label,
			cls: "ccp-title-override-col-type",
		});

		// Inline-editable title input
		const titleCell = rowEl.createDiv({ cls: "ccp-title-override-col-title" });
		const titleInput = titleCell.createEl("input", {
			cls: "ccp-title-override-input",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
			attr: { type: "text", value: title },
		});
		titleInput.addEventListener("change", () => {
			const v = titleInput.value.trim();
			if (v) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
				ctx.plugin.settings.titleOverrides[type] = v;
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
				delete ctx.plugin.settings.titleOverrides[type];
			}
			void ctx.plugin.saveSettings();
		});

		// Delete button
		const actionsEl = rowEl.createDiv({ cls: "ccp-title-override-col-actions custom-callout-actions" });
		const deleteBtn = actionsEl.createDiv({ cls: "clickable-icon" });
		setIcon(deleteBtn, "trash");
		deleteBtn.setAttribute("aria-label", "Remove override");
		deleteBtn.addEventListener("click", () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
			delete ctx.plugin.settings.titleOverrides[type];
			void ctx.plugin.saveSettings().then(() => ctx.refresh());
		});
	}
}
