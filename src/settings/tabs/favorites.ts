/**
 * Tab builder — Most Used Callouts (favorites).
 */

import { Setting } from "obsidian";
import type { SettingsTabContext } from "../types";

export function buildFavoritesTab(el: HTMLElement, ctx: SettingsTabContext): void {
	new Setting(el).setDesc(
		"Select your 5 most used callout types. You can then assign hotkeys to them.",
	);

	for (let i = 0; i < 5; i++) {
		new Setting(el).setName(`Favorite ${i + 1}`).addDropdown((dropdown) => {
			ctx.buildGroupedDropdown(dropdown.selectEl, true);
			dropdown.setValue(ctx.plugin.settings.favoriteCallouts[i] ?? "");
			dropdown.onChange(async (value) => {
				try {
					ctx.plugin.settings.favoriteCallouts[i] = value;
					await ctx.plugin.saveSettings();
				} catch (e) {
					console.error("Enhanced Callout Manager: favorites save error", e);
				}
			});
		});
	}
}
