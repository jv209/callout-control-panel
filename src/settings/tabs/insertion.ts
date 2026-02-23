/**
 * Tab builder — Default Settings (insertion options).
 */

import { Setting } from "obsidian";
import type { CollapseState } from "../../types";
import type { SettingsTabContext } from "../types";

export function buildInsertionTab(el: HTMLElement, ctx: SettingsTabContext): void {
	new Setting(el)
		.setName("Default callout type")
		.setDesc("The callout type pre-selected when the modal opens.")
		.addDropdown((dropdown) => {
			ctx.buildGroupedDropdown(dropdown.selectEl);
			dropdown.setValue(ctx.plugin.settings.defaultCalloutType);
			dropdown.onChange(async (value) => {
				ctx.plugin.settings.defaultCalloutType = value;
				await ctx.plugin.saveSettings();
			});
		});

	new Setting(el)
		.setName("Remember last used type")
		.setDesc("When enabled, the modal defaults to the last callout type you inserted.")
		.addToggle((t) => {
			t.setValue(ctx.plugin.settings.rememberLastType);
			t.onChange(async (v) => {
				ctx.plugin.settings.rememberLastType = v;
				await ctx.plugin.saveSettings();
			});
		});

	new Setting(el)
		.setName("Auto-focus content")
		.setDesc("Automatically focus the content textarea when the modal opens.")
		.addToggle((t) => {
			t.setValue(ctx.plugin.settings.autoFocusContent);
			t.onChange(async (v) => {
				ctx.plugin.settings.autoFocusContent = v;
				await ctx.plugin.saveSettings();
			});
		});

	new Setting(el)
		.setName("Inject callout colors")
		.setDesc(
			"When enabled, the color you pick for a custom callout is applied automatically. When disabled, colors must be set manually via CSS.",
		)
		.addToggle((t) => {
			t.setValue(ctx.plugin.settings.injectColor);
			t.onChange(async (v) => {
				ctx.plugin.settings.injectColor = v;
				await ctx.plugin.saveSettings();
			});
		});

	new Setting(el)
		.setName("Copy button")
		.setDesc(
			"Show a copy-to-clipboard button in each callout's title bar.",
		)
		.addToggle((t) => {
			t.setValue(ctx.plugin.settings.showCopyButton);
			t.onChange(async (v) => {
				ctx.plugin.settings.showCopyButton = v;
				await ctx.plugin.saveSettings();
			});
		});

	new Setting(el)
		.setName("Default collapse state (modal)")
		.setDesc(
			"The default collapse state when inserting a callout via the full modal.",
		)
		.addDropdown((d) => {
			d.addOption("none", "Default (no fold)")
				.addOption("open", "Open (+)")
				.addOption("closed", "Closed (-)")
				.setValue(ctx.plugin.settings.defaultCollapseModal)
				.onChange(async (v: CollapseState) => {
					ctx.plugin.settings.defaultCollapseModal = v;
					await ctx.plugin.saveSettings();
				});
		});

	new Setting(el)
		.setName("Default collapse state (quick pick)")
		.setDesc(
			"The default collapse state when inserting a callout via quick pick or favorites.",
		)
		.addDropdown((d) => {
			d.addOption("none", "Default (no fold)")
				.addOption("open", "Open (+)")
				.addOption("closed", "Closed (-)")
				.setValue(ctx.plugin.settings.defaultCollapseQuickPick)
				.onChange(async (v: CollapseState) => {
					ctx.plugin.settings.defaultCollapseQuickPick = v;
					await ctx.plugin.saveSettings();
				});
		});
}
