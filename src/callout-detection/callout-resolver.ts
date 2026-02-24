/**
 * Resolves CSS variable values (--callout-icon, --callout-color) for callouts
 * using a hidden Shadow DOM element and getComputedStyle.
 *
 * Extracted from: obsidian-callout-manager/src/callout-resolver.ts
 * Original author: eth-p (https://github.com/eth-p)
 * License: MIT
 *
 * Modified: Replaced obsidian-extra import with inline helper, replaced
 * path-aliased imports with local references. Added App parameter to
 * constructor (original used bare global `app`).
 */

import type { App } from 'obsidian';
import type { CalloutID } from './types';
import { getCurrentColorScheme } from './obsidian-helpers';
import { IsolatedCalloutPreviewComponent } from './ui/callout-preview';

/**
 * Fetches style information for callouts using a hidden Shadow DOM.
 * Uses getComputedStyle to read CSS variables as the browser's CSS engine resolves them
 * (respecting cascade, specificity, etc.).
 *
 * Designed as a **verification fallback** — the fast path is regex-based
 * property extraction from cached CSS text. The resolver is invoked only
 * when regex output looks uncertain (e.g. the color contains a CSS variable
 * reference, or no icon/color was found in the CSS text).
 */
export class CalloutResolver {
	private readonly app: App;
	private readonly hostElement: HTMLElement;
	private readonly calloutPreview: IsolatedCalloutPreviewComponent;

	public constructor(app: App) {
		this.app = app;
		this.hostElement = document.body.createDiv({
			cls: 'calloutmanager-callout-resolver',
		});

		// Host must be hidden — uses CSS class from styles.css (.calloutmanager-callout-resolver).
		this.calloutPreview = new IsolatedCalloutPreviewComponent(this.hostElement, {
			id: '',
			icon: '',
			colorScheme: 'dark',
		});

		this.calloutPreview.resetStylePropertyOverrides();
	}

	/**
	 * Reloads styles in the Shadow DOM to reflect CSS changes.
	 * Call this when themes or snippets change.
	 */
	public reloadStyles(): void {
		this.calloutPreview.setColorScheme(getCurrentColorScheme(this.app));
		this.calloutPreview.updateStyles();
		this.calloutPreview.removeStyles((el) => el.getAttribute('data-callout-manager') === 'style-overrides');
	}

	/**
	 * Removes the host element from the DOM. Call during plugin unload.
	 */
	public unload() {
		this.hostElement.remove();
	}

	/**
	 * Gets computed styles for a callout by temporarily setting the data-callout attribute.
	 *
	 * @param id The callout ID.
	 * @param callback Receives the live CSSStyleDeclaration. Must extract values synchronously.
	 */
	public getCalloutStyles<T>(id: CalloutID, callback: (styles: CSSStyleDeclaration) => T): T {
		const { calloutEl } = this.calloutPreview;
		calloutEl.setAttribute('data-callout', id);
		return callback(window.getComputedStyle(calloutEl));
	}

	/**
	 * Gets the icon and color for a callout ID via computed styles.
	 */
	public getCalloutProperties(id: CalloutID): { icon: string; color: string } {
		return this.getCalloutStyles(id, (styles) => ({
			icon: styles.getPropertyValue('--callout-icon').trim(),
			color: styles.getPropertyValue('--callout-color').trim(),
		}));
	}

	/**
	 * Returns true when the regex-extracted properties look uncertain
	 * and the Shadow DOM resolver should be used as a verification pass.
	 *
	 * Triggers when:
	 *  - The color is the default fallback (no --callout-color found)
	 *    AND no icon was found either (fully empty definition)
	 *  - The color contains a CSS variable reference (var(...)) that
	 *    regex can't resolve — only getComputedStyle can
	 */
	public static needsVerification(color: string, iconDefault: boolean): boolean {
		// Fully empty: no color, no icon → might be defined via cascade
		if (color === 'var(--callout-default)' && iconDefault) return true;

		// Color contains an unresolved CSS variable (not the expected
		// raw RGB tuple format like "68, 138, 255")
		if (color.includes('var(')) return true;

		return false;
	}

	public get customStyleEl(): HTMLStyleElement {
		return this.calloutPreview.customStyleEl;
	}
}
