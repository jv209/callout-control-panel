/**
 * Tab builder — Custom Callouts.
 */

import { Platform, Setting, setIcon } from "obsidian";
import { confirmWithModal } from "../../modal/confirm";
import { CalloutEditModal } from "../../modal/calloutEdit";
import type { SettingsTabContext } from "../types";
import { formatSwatchColor } from "../../util/color";

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
					modal.onClose = () => {
						if (!modal.saved) return;
						void ctx.plugin.addCustomCallout({
							type: modal.type,
							icon: modal.icon,
							color: modal.color,
							injectColor: modal.injectColor,
						}).then(() => ctx.refresh());
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

	// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
	const customCallouts = Object.values(ctx.plugin.settings.customCallouts);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
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
	headerEl.createSpan({ text: "Icon name", cls: "detected-snippet-col-iconname" });
	headerEl.createSpan({ text: "Color", cls: "detected-snippet-col-color" });
	headerEl.createSpan({ text: "", cls: "custom-callout-col-actions" });

	for (const callout of customCallouts) {
		const rowEl = listEl.createDiv({ cls: "custom-callout-type-row" });

		// Icon column — always show color regardless of injectColor setting
		const iconEl = rowEl.createDiv({
			cls: "detected-snippet-col-icon custom-callout-type-icon",
		});
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
		if (callout.icon?.type === "no-icon") {
			// No-icon callouts show a dash instead of an icon
			iconEl.setText("—");
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
			const iconNode = ctx.plugin.iconManager.getIconNode(callout.icon);
			if (iconNode) {
				iconEl.appendChild(iconNode);
			} else {
				setIcon(iconEl, "lucide-alert-circle");
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
		if (callout.color) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
			iconEl.style.setProperty("--callout-color", formatSwatchColor(callout.color));
		}

		// Callout name column
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
		rowEl.createSpan({ text: callout.type, cls: "custom-callout-col-callout" });

		// Icon name column
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
		const iconName = callout.icon?.name ?? "—";
		rowEl.createSpan({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
			text: iconName,
			cls: "detected-snippet-col-iconname custom-callout-type-meta",
		});

		// Color column
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
				callout,
			);
			modal.onClose = () => {
				if (!modal.saved) return;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
				void ctx.plugin.editCustomCallout(callout.type, {
					type: modal.type,
					icon: modal.icon,
					color: modal.color,
					injectColor: modal.injectColor,
				}).then(() => ctx.refresh());
			};
			modal.open();
		});

		const deleteBtn = actionsEl.createDiv({ cls: "clickable-icon" });
		setIcon(deleteBtn, "trash");
		deleteBtn.setAttribute("aria-label", "Delete");
		deleteBtn.addEventListener("click", () => {
			void confirmWithModal(
				ctx.app,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
				`Delete custom type "${callout.type}"?`,
			).then((confirmed) => {
				if (confirmed) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
					void ctx.plugin.removeCustomCallout(callout).then(() => ctx.refresh());
				}
			});
		});
	}
}
