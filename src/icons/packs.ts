/**
 * Downloadable icon pack definitions.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 */

export type DownloadableIconPack = "octicons" | "rpg";

export const DownloadableIcons: Record<DownloadableIconPack, string> = {
	octicons: "Octicons",
	rpg: "RPG Awesome",
} as const;
