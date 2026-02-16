/**
 * Settings schema and settings pane reference for callout detection.
 *
 * Extracted from:
 *   - obsidian-callout-manager/src/settings.ts (settings schema)
 *   - obsidian-callout-manager/src/callout-settings.ts (callout appearance settings + CSS generation)
 *   - obsidian-callout-manager/src/panes/manage-plugin-pane.ts (settings UI reference)
 *
 * Original author: eth-p (https://github.com/eth-p)
 * License: MIT
 */

import { Setting } from 'obsidian';

import type { CalloutID } from '../callout-detection/types';
import { getCurrentColorScheme, getCurrentThemeID } from '../callout-detection/obsidian-helpers';
import type { App } from 'obsidian';

// =====================================================================================================================
// Settings Schema
// =====================================================================================================================

/**
 * Plugin settings that control callout detection and per-callout customization.
 *
 * USAGE IN ORIGINAL PLUGIN:
 * - Stored via Plugin.loadData() / Plugin.saveData()
 * - calloutDetection toggles control which CSS sources are scanned
 * - callouts.settings stores per-callout appearance overrides
 * - callouts.custom stores user-created callout IDs
 */
export interface CalloutDetectionSettings {
	callouts: {
		/** IDs of user-created callouts. */
		custom: string[];
		/** Per-callout appearance overrides (keyed by callout ID). */
		settings: Record<CalloutID, CalloutSettings>;
	};

	calloutDetection: {
		/** Detect built-in Obsidian callouts from app.css. */
		obsidian: boolean;
		/** Detect callouts from the active theme. */
		theme: boolean;
		/** Detect callouts from CSS snippets. */
		snippet: boolean;
	};
}

export function defaultSettings(): CalloutDetectionSettings {
	return {
		callouts: {
			custom: [],
			settings: {},
		},
		calloutDetection: {
			obsidian: true,
			theme: true,
			snippet: true,
		},
	};
}

export function migrateSettings(
	into: CalloutDetectionSettings,
	from: CalloutDetectionSettings | undefined,
): CalloutDetectionSettings {
	return Object.assign(into, {
		...from,
		calloutDetection: {
			...into.calloutDetection,
			...(from?.calloutDetection ?? {}),
		},
	});
}

// =====================================================================================================================
// Callout Appearance Settings (per-callout overrides + CSS generation)
// =====================================================================================================================

/**
 * Changes that can be applied to a callout's appearance.
 */
export type CalloutSettingsChanges = {
	color?: string;
	icon?: string;
	customStyles?: string;
};

export type CalloutSettingsCondition =
	| undefined
	| { theme: string }
	| { colorScheme: 'dark' | 'light' }
	| { and: CalloutSettingsCondition[] }
	| { or: CalloutSettingsCondition[] };

/**
 * A setting that changes a callout's appearance when the given condition holds true.
 */
export type CalloutSetting = {
	condition?: CalloutSettingsCondition;
	changes: CalloutSettingsChanges;
};

/**
 * An array of CalloutSetting objects for a single callout.
 */
export type CalloutSettings = Array<CalloutSetting>;

/**
 * Gets the current environment for condition evaluation.
 */
export function currentCalloutEnvironment(app: App): { theme: string; colorScheme: 'dark' | 'light' } {
	const theme = getCurrentThemeID(app) ?? '<default>';
	return {
		theme,
		colorScheme: getCurrentColorScheme(app),
	};
}

/**
 * Converts callout settings to CSS that applies the appearance changes.
 */
export function calloutSettingsToCSS(
	id: CalloutID,
	settings: CalloutSettings,
	environment: { theme: string; colorScheme: 'dark' | 'light' },
): string {
	const styles = calloutSettingsToStyles(settings, environment).join(';\n\t');
	if (styles.length === 0) return '';
	return `.callout[data-callout="${id}"] {\n\t` + styles + '\n}';
}

export function calloutSettingsToStyles(
	settings: CalloutSettings,
	environment: { theme: string; colorScheme: 'dark' | 'light' },
): string[] {
	const styles: string[] = [];

	for (const setting of settings) {
		if (!checkCondition(setting.condition, environment)) continue;

		const { changes } = setting;
		if (changes.color != null) styles.push(`--callout-color: ${changes.color}`);
		if (changes.icon != null) styles.push(`--callout-icon: ${changes.icon}`);
		if (changes.customStyles != null) styles.push(changes.customStyles);
	}

	return styles;
}

function checkCondition(
	condition: CalloutSettingsCondition,
	environment: { theme: string; colorScheme: 'dark' | 'light' },
): boolean {
	if (condition == null) return true;

	if ('or' in condition && condition.or !== undefined) {
		return condition.or.findIndex((p) => checkCondition(p, environment) === true) !== undefined;
	}

	if ('and' in condition && condition.and !== undefined) {
		return condition.and.findIndex((p) => checkCondition(p, environment) === false) === undefined;
	}

	if ('theme' in condition && condition.theme === environment.theme) return true;
	if ('colorScheme' in condition && condition.colorScheme === environment.colorScheme) return true;

	return false;
}

// =====================================================================================================================
// Settings Pane Reference
// =====================================================================================================================

/**
 * Builds the "Callout Detection" settings section.
 *
 * USAGE IN ORIGINAL PLUGIN (manage-plugin-pane.ts):
 * This was rendered inside the ManagePluginPane.display() method
 * using Obsidian's Setting API. The three toggles control which CSS
 * sources are scanned for callout definitions.
 *
 * Adapt this for your own settings tab by calling it from your
 * PluginSettingTab.display() method.
 *
 * @param containerEl The settings container element.
 * @param settings The current settings object.
 * @param onChanged Callback when a toggle changes. Save settings and call refreshCalloutSources().
 */
export function buildCalloutDetectionSettings(
	containerEl: HTMLElement,
	settings: CalloutDetectionSettings,
	onChanged: (key: 'obsidian' | 'theme' | 'snippet', value: boolean) => void,
): void {
	new Setting(containerEl).setHeading().setName('Callout Detection');

	new Setting(containerEl)
		.setName('Obsidian')
		.setDesc('Find built-in Obsidian callouts.')
		.addToggle((toggle) => {
			toggle.setValue(settings.calloutDetection.obsidian).onChange((v) => {
				settings.calloutDetection.obsidian = v;
				onChanged('obsidian', v);
			});
		});

	new Setting(containerEl)
		.setName('Theme')
		.setDesc('Find theme-provided callouts.')
		.addToggle((toggle) => {
			toggle.setValue(settings.calloutDetection.theme).onChange((v) => {
				settings.calloutDetection.theme = v;
				onChanged('theme', v);
			});
		});

	new Setting(containerEl)
		.setName('Snippet')
		.setDesc('Find callouts in custom CSS snippets.')
		.addToggle((toggle) => {
			toggle.setValue(settings.calloutDetection.snippet).onChange((v) => {
				settings.calloutDetection.snippet = v;
				onChanged('snippet', v);
			});
		});
}
