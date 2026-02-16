/**
 * Resolves CSS variable values (--callout-icon, --callout-color) for callouts
 * using a hidden Shadow DOM element and getComputedStyle.
 *
 * Extracted from: obsidian-callout-manager/src/callout-resolver.ts
 * Original author: eth-p (https://github.com/eth-p)
 * License: MIT
 *
 * Modified: Replaced obsidian-extra import with inline helper, replaced
 * path-aliased imports with local references.
 */

import type { CalloutID } from './types';
import { getCurrentColorScheme } from './obsidian-helpers';
import { IsolatedCalloutPreviewComponent } from './ui/callout-preview';

/**
 * Fetches style information for callouts using a hidden Shadow DOM.
 * Uses getComputedStyle to read CSS variables as the browser's CSS engine resolves them
 * (respecting cascade, specificity, etc.).
 */
export class CalloutResolver {
	private readonly hostElement: HTMLElement;
	private readonly calloutPreview: IsolatedCalloutPreviewComponent;

	public constructor() {
		this.hostElement = document.body.createDiv({
			cls: 'calloutmanager-callout-resolver',
		});

		this.hostElement.style.setProperty('display', 'none', 'important');
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
		this.calloutPreview.setColorScheme(getCurrentColorScheme(app));
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
	 * Gets the icon and color for a callout ID.
	 */
	public getCalloutProperties(id: CalloutID): { icon: string; color: string } {
		return this.getCalloutStyles(id, (styles) => ({
			icon: styles.getPropertyValue('--callout-icon').trim(),
			color: styles.getPropertyValue('--callout-color').trim(),
		}));
	}

	public get customStyleEl(): HTMLStyleElement {
		return this.calloutPreview.customStyleEl as HTMLStyleElement;
	}
}
