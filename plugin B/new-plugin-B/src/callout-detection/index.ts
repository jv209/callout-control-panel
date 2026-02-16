/**
 * Barrel export for the callout detection module.
 *
 * This module provides everything needed to detect, monitor, resolve,
 * and collect callout definitions from Obsidian's CSS sources.
 */

// Types
export type {
	CalloutID,
	Callout,
	CalloutProperties,
	CalloutSource,
	CalloutSourceObsidian,
	CalloutSourceSnippet,
	CalloutSourceTheme,
	CalloutSourceCustom,
} from './types';

// CSS parsing
export { getCalloutsFromCSS } from './css-parser';

// Stylesheet watching
export { default as StylesheetWatcher } from './css-watcher';
export type {
	StylesheetWatcherEvents,
	SnippetStylesheet,
	ThemeStylesheet,
	ObsidianStylesheet,
} from './css-watcher';

// Callout collection
export { CalloutCollection } from './callout-collection';

// Callout property resolution
export { CalloutResolver } from './callout-resolver';

// Obsidian internal helpers (use with care — undocumented APIs)
export {
	getCurrentThemeID,
	getThemeManifest,
	getThemeStyleElement,
	getSnippetStyleElements,
	getCurrentColorScheme,
	fetchObsidianStyleSheet,
	createCustomStyleSheet,
	type CustomStyleSheet,
} from './obsidian-helpers';

// Color utilities
export type { RGB, RGBA, HSV, HSVA } from './util/color';
export { parseColor, parseColorRGB, parseColorRGBA, parseColorHex, toHSV, toHexRGB } from './util/color';

// UI components (for resolver and preview)
export { CalloutPreviewComponent, IsolatedCalloutPreviewComponent } from './ui/callout-preview';
export type { PreviewOptions, IsolatedPreviewOptions } from './ui/callout-preview';
