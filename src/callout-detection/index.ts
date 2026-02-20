/**
 * Callout detection module — barrel export.
 *
 * Re-exports the CSS parser, stylesheet watcher, helpers, and detection
 * types for convenient importing.
 */

export { getCalloutsFromCSS } from './css-parser';
export { default as StylesheetWatcher } from './css-watcher';
export type {
	StylesheetWatcherEvents,
	SnippetStylesheet,
	ThemeStylesheet,
	ObsidianStylesheet,
} from './css-watcher';
export { CalloutCollection } from './callout-collection';
export {
	getCurrentThemeID,
	getThemeManifest,
	getThemeStyleElement,
	getSnippetStyleElements,
	getCurrentColorScheme,
	fetchObsidianStyleSheet,
	createCustomStyleSheet,
} from './obsidian-helpers';
export type {
	ObsidianStyleSheetResult,
	CustomStyleSheet,
} from './obsidian-helpers';
export type { CalloutID, Callout, CalloutProperties, CalloutSource } from './types';
