/**
 * Icon management — loads, resolves, and renders icons from multiple packs.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * Dependencies: @fortawesome/fontawesome-svg-core, @fortawesome/free-*-svg-icons
 * Obsidian API: getIconIds, setIcon, Notice
 */

import { faCopy, far } from "@fortawesome/free-regular-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import {
	type IconDefinition,
	type IconPrefix,
	findIconDefinition,
	icon as getFAIcon,
	library,
} from "@fortawesome/fontawesome-svg-core";
import type { IconName } from "@fortawesome/fontawesome-svg-core";
import type { CalloutIconDefinition, IconType } from "../types";
import { type App, getIconIds, Notice, requestUrl, setIcon } from "obsidian";
import { type DownloadableIconPack, DownloadableIcons } from "./packs";

export { type DownloadableIconPack, DownloadableIcons };

/** Load Font Awesome library (solid, regular, brands + copy icon). */
library.add(fas, far, fab, faCopy);

/** Minimum plugin surface area needed by IconManager. */
export interface IconManagerPluginRef {
	app: App;
	pluginId: string;
	settings: {
		icons: Array<DownloadableIconPack>;
		useFontAwesome: boolean;
	};
	saveSettings(): Promise<void>;
}

export class IconManager {
	DOWNLOADED: {
		[key in DownloadableIconPack]?: Record<string, string>;
	} = {};

	FONT_AWESOME_MAP = new Map(
		[...Object.values(fas), ...Object.values(far), ...Object.values(fab)]
			.map((i: IconDefinition) => {
				return [
					i.iconName,
					{
						name: i.iconName,
						type: "font-awesome" as const,
					},
				] as const;
			})
	);

	constructor(public plugin: IconManagerPluginRef) {}

	async load(): Promise<void> {
		for (const icon of this.plugin.settings.icons) {
			const exists = await this.plugin.app.vault.adapter.exists(
				this.localIconPath(icon)
			);
			if (!exists) {
				await this.downloadIcon(icon);
			} else {
				this.DOWNLOADED[icon] = JSON.parse(
					await this.plugin.app.vault.adapter.read(
						this.localIconPath(icon)
					)
				) as Record<string, string>;
			}
		}
		this.setIconDefinitions();
	}

	iconDefinitions: CalloutIconDefinition[] = [];

	setIconDefinitions(): void {
		const downloaded: CalloutIconDefinition[] = [];
		const icons = this.plugin.settings.icons ?? [];
		for (const pack of icons) {
			if (!(pack in this.DOWNLOADED)) continue;
			const icons = this.DOWNLOADED[pack];
			if (!icons) continue;
			downloaded.push(
				...Object.keys(icons).map((name) => {
					return { type: pack as IconType, name };
				})
			);
		}
		this.iconDefinitions = [
			...(this.plugin.settings.useFontAwesome
				? this.FONT_AWESOME_MAP.values()
				: []),
			...getIconIds().map((name) => {
				return { type: "obsidian" as IconType, name };
			}),
			...downloaded,
		];
	}

	/** Remote URL for a downloadable icon pack. */
	iconPath(pack: DownloadableIconPack): string {
		return `https://raw.githubusercontent.com/valentine195/obsidian-admonition/master/icons/${pack}/icons.json`;
	}

	/** Local cache path for a downloaded icon pack (inside the plugin folder). */
	private localIconPath(pack: DownloadableIconPack): string {
		return `${this.plugin.app.vault.configDir}/plugins/${this.plugin.pluginId}/${pack}.json`;
	}

	async downloadIcon(pack: DownloadableIconPack): Promise<void> {
		try {
			const response = await requestUrl(this.iconPath(pack));
			const icons = response.json as Record<string, string>;
			this.plugin.settings.icons.push(pack);
			this.plugin.settings.icons = [...new Set(this.plugin.settings.icons)];
			await this.plugin.app.vault.adapter.write(
				this.localIconPath(pack),
				JSON.stringify(icons)
			);
			this.DOWNLOADED[pack] = icons;
			await this.plugin.saveSettings();
			this.setIconDefinitions();

			new Notice(`${DownloadableIcons[pack]} successfully downloaded.`);
		} catch (e) {
			console.error(e);
			new Notice("Could not download icon pack");
		}
	}

	async removeIcon(pack: DownloadableIconPack): Promise<void> {
		try {
			const path = this.localIconPath(pack);
			if (await this.plugin.app.vault.adapter.exists(path)) {
				await this.plugin.app.vault.adapter.remove(path);
			}
		} catch (e) {
			console.error("Enhanced Callout Manager: could not remove icon file", e);
		}
		delete this.DOWNLOADED[pack];
		this.plugin.settings.icons.remove(pack);
		this.plugin.settings.icons = [...new Set(this.plugin.settings.icons)];
		await this.plugin.saveSettings();
		this.setIconDefinitions();
	}

	/** Identify which pack an icon name belongs to. */
	getIconType(str: string): IconType | undefined {
		if (findIconDefinition({ iconName: str as IconName, prefix: "fas" }))
			return "font-awesome";
		if (findIconDefinition({ iconName: str as IconName, prefix: "far" }))
			return "font-awesome";
		if (findIconDefinition({ iconName: str as IconName, prefix: "fab" }))
			return "font-awesome";
		if (getIconIds().includes(str)) {
			return "obsidian";
		}
		for (const [pack, icons] of Object.entries(this.DOWNLOADED)) {
			if (icons && str in icons) return pack as DownloadableIconPack;
		}
		return undefined;
	}

	/** Human-readable label for an icon's source pack. */
	getIconModuleName(icon: CalloutIconDefinition): string | undefined {
		if (icon.type === "font-awesome") return "Font Awesome";
		if (icon.type === "obsidian") return "Obsidian Icon";
		if (icon.type === "image") return undefined;
		if (icon.type && icon.type in DownloadableIcons)
			return DownloadableIcons[icon.type as DownloadableIconPack];
		return undefined;
	}

	/** Render an icon as an HTML element. */
	getIconNode(icon: CalloutIconDefinition): Element | undefined {
		if (!icon.name) return undefined;

		if (icon.type === "image") {
			const img = new Image();
			img.src = icon.name;
			return img;
		}
		if (icon.type === "obsidian") {
			const el = document.createElement("div");
			setIcon(el, icon.name);
			return el;
		}
		const svgContent = this.DOWNLOADED[icon.type as DownloadableIconPack]?.[icon.name];
		if (svgContent) {
			const doc = new DOMParser().parseFromString(svgContent, "image/svg+xml");
			return doc.documentElement;
		}
		for (const prefix of ["fas", "far", "fab"] as IconPrefix[]) {
			const definition = findIconDefinition({
				iconName: icon.name as IconName,
				prefix,
			});
			if (definition) return getFAIcon(definition).node[0];
		}
		return undefined;
	}
}
