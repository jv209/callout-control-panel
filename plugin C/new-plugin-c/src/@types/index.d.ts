/**
 * Core type definitions for callout management.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 */

import { IconName } from "@fortawesome/fontawesome-svg-core";
import { DownloadableIconPack } from "../icons/packs";

export interface Admonition {
    type: string;
    title?: string;
    icon: AdmonitionIconDefinition;
    color: string; // RGB format: "r, g, b"
    command: boolean;
    injectColor?: boolean;
    noTitle: boolean;
    copy?: boolean;
}

export interface AdmonitionSettings {
    userAdmonitions: Record<string, Admonition>;
    syntaxHighlight: boolean;
    copyButton: boolean;
    autoCollapse: boolean;
    defaultCollapseType: "open" | "closed";
    version: string;
    injectColor: boolean;
    parseTitles: boolean;
    dropShadow: boolean;
    hideEmpty: boolean;
    icons: Array<DownloadableIconPack>;
    useFontAwesome: boolean;
    rpgDownloadedOnce: boolean;
    open: {
        admonitions: boolean;
        icons: boolean;
        other: boolean;
        advanced: boolean;
    };
    msDocConverted: boolean;
    useSnippet: boolean;
    snippetPath: string;
}

export type AdmonitionIconDefinition = {
    type?: IconType;
    name?: IconName | string;
};

export type IconType =
    | "font-awesome"
    | "obsidian"
    | "image"
    | DownloadableIconPack;

export type AdmonitionIconName = AdmonitionIconDefinition["name"];
export type AdmonitionIconType = AdmonitionIconDefinition["type"];
