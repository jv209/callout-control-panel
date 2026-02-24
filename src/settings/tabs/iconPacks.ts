/**
 * Tab builder — Icon Packs.
 */

import { Notice, Setting } from "obsidian";
import { type DownloadableIconPack, DownloadableIcons } from "../../icons/packs";
import { confirmWithModal } from "../../modal/confirm";
import type { SettingsTabContext } from "../types";

export function buildIconPacksTab(el: HTMLElement, ctx: SettingsTabContext): void {
	new Setting(el)
		// eslint-disable-next-line obsidianmd/ui/sentence-case -- "Font Awesome" is a proper noun
		.setName("Use Font Awesome icons")
		// eslint-disable-next-line obsidianmd/ui/sentence-case -- "Font Awesome" is a proper noun
		.setDesc("Font Awesome Free icons will be available in the icon picker.")
		.addToggle((t) => {
			t.setValue(ctx.plugin.settings.useFontAwesome);
			t.onChange(async (v) => {
				try {
					ctx.plugin.settings.useFontAwesome = v;
					ctx.plugin.iconManager.setIconDefinitions();
					await ctx.plugin.saveSettings();
				} catch (e) {
					console.error("Callout Control Panel: icon toggle error", e);
				}
				ctx.refresh();
			});
		});

	// Additional icon packs require Font Awesome — hide when FA is off.
	if (!ctx.plugin.settings.useFontAwesome) return;

	const installed = ctx.plugin.settings.icons;
	const available = (
		Object.entries(DownloadableIcons) as [DownloadableIconPack, string][]
	).filter(([pack]) => !installed.includes(pack));

	let selectedPack: DownloadableIconPack | undefined = available[0]?.[0];

	new Setting(el)
		.setName("Load additional icon pack")
		.setDesc("Download an additional icon pack. Requires an internet connection.")
		.addDropdown((d) => {
			if (!available.length) {
				d.setDisabled(true);
				return;
			}
			for (const [pack, label] of available) {
				d.addOption(pack, label);
			}
			d.onChange((v: DownloadableIconPack) => {
				selectedPack = v;
			});
		})
		.addExtraButton((b) => {
			b.setIcon("plus-with-circle")
				.setTooltip("Download")
				.setDisabled(!available.length)
				.onClick(async () => {
					if (!selectedPack) return;
					try {
						await ctx.plugin.iconManager.downloadIcon(selectedPack);
					} catch (e) {
						console.error("Callout Control Panel: download failed", e);
						new Notice("Could not download icon pack.");
					}
					ctx.refresh();
				});
		});

	if (installed.length > 0) {
		const packsEl = el.createDiv({ cls: "ccp-icon-packs" });
		for (const pack of installed) {
			new Setting(packsEl)
				.setName(DownloadableIcons[pack] ?? pack)
				.addExtraButton((b) => {
					b.setIcon("reset")
						.setTooltip("Redownload")
						.onClick(async () => {
							try {
								await ctx.plugin.iconManager.removeIcon(pack);
								await ctx.plugin.iconManager.downloadIcon(pack);
							} catch (e) {
								console.error("Callout Control Panel: redownload failed", e);
								new Notice("Could not redownload icon pack.");
							}
							ctx.refresh();
						});
				})
				.addExtraButton((b) => {
					b.setIcon("trash")
						.setTooltip("Remove")
						.onClick(async () => {
							const usingThisPack = Object.values(
								ctx.plugin.settings.customCallouts,
							).some((cc) => cc.icon.type === pack);
							if (usingThisPack) {
								const ok = await confirmWithModal(
									ctx.app,
									"Some custom types use icons from this pack. Remove it anyway?",
								);
								if (!ok) return;
							}
							try {
								await ctx.plugin.iconManager.removeIcon(pack);
							} catch (e) {
								console.error("Callout Control Panel: remove failed", e);
								new Notice("Could not remove icon pack.");
							}
							ctx.refresh();
						});
				});
		}
	}
}
