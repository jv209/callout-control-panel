/**
 * Inline replacements for obsidian-extra and obsidian-undocumented.
 *
 * These functions access Obsidian's undocumented internal APIs (app.customCss)
 * to read theme, snippet, and built-in stylesheet data. They replace the
 * obsidian-extra (v0.1.5) and obsidian-undocumented (v0.1.3) packages
 * from the original Callout Manager plugin by eth-p.
 *
 * Extracted from: obsidian-callout-manager
 * Original author: eth-p (https://github.com/eth-p)
 * License: MIT
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
 *
 * Primary: reads from app.customCss.csscache (Obsidian's undocumented cache).
 * Fallback: if csscache is missing or empty, scans document.head for <style>
 * elements that Obsidian injects for enabled snippets.
 */
export function getSnippetStyleElements(app: App): Map<string, HTMLStyleElement> {
	const cc = getCustomCss(app);

	// Primary path — csscache is a Map<snippetName, HTMLStyleElement>
	if (cc.csscache instanceof Map && cc.csscache.size > 0) {
		return cc.csscache;
	}

	// Fallback — scan <style> elements that Obsidian injects for snippets.
	// Obsidian gives each snippet <style> a data-* attribute or id matching
	// the snippet name. We also try the enabledSnippets set to filter.
	const result = new Map<string, HTMLStyleElement>();
	const enabled = (cc as Record<string, unknown>).enabledSnippets;
	if (!(enabled instanceof Set) || enabled.size === 0) return result;

	for (const el of Array.from(document.querySelectorAll('head > style'))) {
		const styleEl = el as HTMLStyleElement;
		// Check common Obsidian snippet attributes
		const snippetId =
			styleEl.getAttribute('data-snippet-id') ??
			styleEl.getAttribute('data-snippet') ??
			styleEl.id;
		if (snippetId && enabled.has(snippetId)) {
			result.set(snippetId, styleEl);
		}
	}

	return result;
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
	void app; // app reserved for future strategies (Electron IPC)
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
