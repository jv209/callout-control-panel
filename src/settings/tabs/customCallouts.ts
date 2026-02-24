/**
 * Tab builder — Custom Callouts.
 */

import { Platform, Setting, setIcon } from "obsidian";
import { confirmWithModal } from "../../modal/confirm";
import { CalloutEditModal } from "../../modal/calloutEdit";
import type { SettingsTabContext } from "../types";

export function buildCustomCalloutsTab(el: HTMLElement, ctx: SettingsTabContext): void {
	const addSetting = new Setting(el)
		.setName("Add new type")
		.setDesc("Create a custom callout type with a custom icon and color.")
		.addButton((btn) => {
			btn
				.setButtonText("+")
				.setTooltip("Add callout type")
				.onClick(() => {
					const modal = new CalloutEditModal(ctx.app, ctx.plugin);
					modal.onClose = async () => {
						if (!modal.saved) return;
						await ctx.plugin.addCustomCallout({
							type: modal.type,
							icon: modal.icon,
							color: modal.color,
							injectColor: modal.injectColor,
						});
						ctx.refresh();
					};
					modal.open();
				});
		});

	// "Open snippets folder" uses openWithDefaultApp which is desktop-only
	if (!Platform.isMobile) {
		addSetting.addExtraButton((btn) => {
			btn
				.setIcon("folder-open")
				.setTooltip("Open snippets folder")
				.onClick(() => {
					const snippetsPath = `${ctx.app.vault.configDir}/snippets`;
					(
						ctx.app as unknown as {
							openWithDefaultApp(path: string): void;
						}
					).openWithDefaultApp(snippetsPath);
				});
		});
	}

	const customCallouts = Object.values(ctx.plugin.settings.customCallouts);

	if (customCallouts.length === 0) {
		el.createEl("p", {
			text: "No custom callouts defined yet.",
			cls: "setting-item-description",
		});
		return;
	}

	const listEl = el.createDiv({ cls: "custom-callout-types" });

	// Table header
	const headerEl = listEl.createDiv({
		cls: "custom-callout-type-row custom-callout-type-header",
	});
	headerEl.createSpan({ text: "Icon", cls: "detected-snippet-col-icon" });
	headerEl.createSpan({ text: "Callout", cls: "custom-callout-col-callout" });
	headerEl.createSpan({ text: "Icon Name", cls: "detected-snippet-col-iconname" });
	headerEl.createSpan({ text: "Color", cls: "detected-snippet-col-color" });
	headerEl.createSpan({ text: "", cls: "custom-callout-col-actions" });

	for (const callout of customCallouts) {
		const rowEl = listEl.createDiv({ cls: "custom-callout-type-row" });

		// Icon column — always show color regardless of injectColor setting
		const iconEl = rowEl.createDiv({
			cls: "detected-snippet-col-icon custom-callout-type-icon",
		});
		if (callout.icon?.type === "no-icon") {
			// No-icon callouts show a dash instead of an icon
			iconEl.setText("—");
		} else {
			const iconNode = ctx.plugin.iconManager.getIconNode(callout.icon);
			if (iconNode) {
				iconEl.appendChild(iconNode);
			} else {
				setIcon(iconEl, "lucide-alert-circle");
			}
		}
		if (callout.color) {
			iconEl.style.setProperty("--callout-color", callout.color);
		}

		// Callout name column
		rowEl.createSpan({ text: callout.type, cls: "custom-callout-col-callout" });

		// Icon name column
		const iconName = callout.icon?.name ?? "—";
		rowEl.createSpan({
			text: iconName,
			cls: "detected-snippet-col-iconname custom-callout-type-meta",
		});

		// Color column
		const colorText = callout.color ? `rgb(${callout.color})` : "—";
		rowEl.createSpan({
			text: colorText,
			cls: "detected-snippet-col-color custom-callout-type-meta",
		});

		// Action buttons column
		const actionsEl = rowEl.createDiv({ cls: "custom-callout-actions" });

		const editBtn = actionsEl.createDiv({ cls: "clickable-icon" });
		setIcon(editBtn, "pencil");
		editBtn.setAttribute("aria-label", "Edit");
		editBtn.addEventListener("click", () => {
			const modal = new CalloutEditModal(
				ctx.app,
				ctx.plugin,
				callout,
			);
			modal.onClose = async () => {
				if (!modal.saved) return;
				await ctx.plugin.editCustomCallout(callout.type, {
					type: modal.type,
					icon: modal.icon,
					color: modal.color,
					injectColor: modal.injectColor,
				});
				ctx.refresh();
			};
			modal.open();
		});

		const deleteBtn = actionsEl.createDiv({ cls: "clickable-icon" });
		setIcon(deleteBtn, "trash");
		deleteBtn.setAttribute("aria-label", "Delete");
		deleteBtn.addEventListener("click", async () => {
			const confirmed = await confirmWithModal(
				ctx.app,
				`Delete custom type "${callout.type}"?`,
			);
			if (confirmed) {
				await ctx.plugin.removeCustomCallout(callout);
				ctx.refresh();
			}
		});
	}
}
