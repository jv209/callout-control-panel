/**
 * Icon fuzzy-search suggestion popover.
 *
 * Originally derived from obsidian-admonition v10.3.2 (MIT, Jeremy Valentine).
 * Reimplemented on Obsidian's native `AbstractInputSuggest` so the plugin no
 * longer depends on `@javalent/utilities` (which pulled in Svelte).
 */

import {
	AbstractInputSuggest,
	type App,
	type FuzzyMatch,
	prepareFuzzySearch,
	renderMatches,
} from "obsidian";

import type { CalloutIconDefinition } from "../types";
import type { IconManager } from "../icons/manager";

/** Minimum plugin surface area needed by IconSuggestionModal. */
export interface IconModalPluginRef {
	app: App;
	iconManager: IconManager;
}

export class IconSuggestionModal extends AbstractInputSuggest<
	FuzzyMatch<CalloutIconDefinition>
> {
	constructor(
		public plugin: IconModalPluginRef,
		inputEl: HTMLInputElement,
		private items: CalloutIconDefinition[],
	) {
		super(plugin.app, inputEl);
	}

	protected getSuggestions(
		query: string,
	): FuzzyMatch<CalloutIconDefinition>[] {
		const matcher = prepareFuzzySearch(query);
		const results: FuzzyMatch<CalloutIconDefinition>[] = [];
		for (const item of this.items) {
			const match = matcher(item.name ?? "");
			if (match) results.push({ item, match });
		}
		results.sort((a, b) => b.match.score - a.match.score);
		return results;
	}

	renderSuggestion(
		result: FuzzyMatch<CalloutIconDefinition>,
		el: HTMLElement,
	): void {
		const { item, match } = result;
		el.addClass("mod-complex");

		const content = el.createDiv("suggestion-content");
		const titleEl = content.createDiv("suggestion-title");
		renderMatches(titleEl, item.name ?? "", match.matches);
		content
			.createDiv("suggestion-note")
			.setText(this.plugin.iconManager.getIconModuleName(item) ?? "");

		const aux = el.createDiv("suggestion-aux");
		aux
			.createDiv("suggestion-flair")
			.appendChild(this.plugin.iconManager.getIconNode(item) ?? createDiv());
	}
}
