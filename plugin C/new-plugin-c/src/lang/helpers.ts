/**
 * Minimal i18n helper. Ships with English only.
 * Add additional locale files and import them here as needed.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 */

import { moment } from "obsidian";
import en from "./locale/en";

const localeMap: { [k: string]: Partial<typeof en> } = {
    en
    // Add more locales here: de, fr, ja, etc.
};

const locale = localeMap[moment.locale()];

export function t(str: keyof typeof en): string {
    return (locale && locale[str]) || en[str];
}
