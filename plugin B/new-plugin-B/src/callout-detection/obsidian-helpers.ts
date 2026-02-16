/**
 * Inline replacements for obsidian-extra and obsidian-undocumented.
 *
 * These functions access Obsidian's undocumented internal APIs (app.customCss)
 * to read theme, snippet, and built-in stylesheet data. They replace the
 * obsidian-extra (v0.1.5) and obsidian-undocumented (v0.1.3) packages
 * from the original Callout Manager plugin by eth-p.
 *
 * WARNING: These APIs are undocumented and may break with Obsidian updates.
 * The original obsidian-extra library uses multiple fallback strategies;
 * these helpers use the most common/direct approach only.
 */

import type { App } from 'obsidian';

// ---- Internal type representing Obsidian's undocumented customCss property ----
interface ObsidianCustomCss {
	theme: string | null;
	themes: Record<string, { name: string; version: string }>;
	styleEl: HTMLStyleElement | null;
	csscache: Map<string, HTMLStyleElement>;
}

interface AppWithCustomCss extends App {
	customCss: ObsidianCustomCss;
}

function getCustomCss(app: App): ObsidianCustomCss {
	return (app as AppWithCustomCss).customCss;
}

// ---- Theme helpers ----

/**
 * Gets the ID of the currently active theme, or null if using default.
 */
export function getCurrentThemeID(app: App): string | null {
	return getCustomCss(app).theme ?? null;
}

/**
 * Gets the manifest for a theme.
 */
export function getThemeManifest(app: App, id: string): { name: string; version: string } | null {
	return getCustomCss(app).themes?.[id] ?? null;
}

/**
 * Gets the <style> element containing the active theme's CSS.
 */
export function getThemeStyleElement(app: App): HTMLStyleElement | null {
	return getCustomCss(app).styleEl ?? null;
}

// ---- Snippet helpers ----

/**
 * Gets a Map of snippet ID -> <style> element for all enabled snippets.
 */
export function getSnippetStyleElements(app: App): Map<string, HTMLStyleElement> {
	return getCustomCss(app).csscache ?? new Map();
}

// ---- Color scheme helpers ----

/**
 * Gets the current color scheme ('dark' or 'light').
 */
export function getCurrentColorScheme(_app: App): 'dark' | 'light' {
	return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
}

// ---- Obsidian built-in stylesheet ----

export interface ObsidianStyleSheetResult {
	cssText: string;
	method: 'dom' | 'fetch';
}

/**
 * Fetches the built-in Obsidian stylesheet (app.css).
 *
 * Strategy: iterates document.styleSheets looking for the Obsidian built-in stylesheet,
 * then reads its cssRules. Falls back to fetching from the app:// protocol.
 *
 * The original obsidian-extra had three strategies (DOM, Electron, fetch).
 * This implementation uses DOM first, then fetch as fallback.
 */
export async function fetchObsidianStyleSheet(app: App): Promise<ObsidianStyleSheetResult> {
	// Strategy 1: Read from document.styleSheets (DOM).
	try {
		for (const sheet of Array.from(document.styleSheets)) {
			try {
				const href = sheet.href ?? '';
				if (href.includes('app.css') || sheet.ownerNode?.nodeName === 'STYLE') {
					const rules = Array.from(sheet.cssRules);
					const hasCalloutRules = rules.some((r) => r.cssText?.includes('data-callout'));
					if (hasCalloutRules) {
						const cssText = rules.map((r) => r.cssText).join('\n');
						return { cssText, method: 'dom' };
					}
				}
			} catch {
				// CORS or access errors on individual sheets — skip.
			}
		}
	} catch {
		// styleSheets not available — fall through.
	}

	// Strategy 2: Fetch the CSS file.
	try {
		const response = await fetch('app://obsidian.md/app.css');
		if (response.ok) {
			const cssText = await response.text();
			return { cssText, method: 'fetch' };
		}
	} catch {
		// Fetch not available — fall through.
	}

	throw new Error('Unable to fetch the Obsidian built-in stylesheet.');
}

// ---- Custom stylesheet helper ----

/**
 * Creates a managed <style> element that is added to the document head.
 * Returns an object whose `.css` property can be set to apply styles,
 * and which can be passed to Plugin.register() for cleanup.
 */
export function createCustomStyleSheet(): CustomStyleSheet {
	const styleEl = document.createElement('style');
	document.head.appendChild(styleEl);

	return {
		get css(): string {
			return styleEl.textContent ?? '';
		},
		set css(value: string) {
			styleEl.textContent = value;
		},
		setAttribute(name: string, value: string) {
			styleEl.setAttribute(name, value);
		},
		unload() {
			styleEl.remove();
		},
	};
}

export interface CustomStyleSheet {
	css: string;
	setAttribute(name: string, value: string): void;
	unload(): void;
}
