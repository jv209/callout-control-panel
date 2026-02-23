/**
 * Shared types and helpers for the settings tab and its sub-modules.
 */

import type { App } from "obsidian";
import type { SettingsTabPluginRef } from "../settingsTab";

// ─── Context passed to every tab builder ─────────────────────────────────────

export interface SettingsTabContext {
	app: App;
	plugin: SettingsTabPluginRef;
	refresh: () => void;
	buildGroupedDropdown: (selectEl: HTMLSelectElement, includeNone?: boolean) => void;
}
