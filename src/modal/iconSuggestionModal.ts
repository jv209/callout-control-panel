/**
 * Icon fuzzy-search suggestion modal.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * Dependency: @javalent/utilities (FuzzyInputSuggest)
 */

import {
	type FuzzyMatch,
	type SearchComponent,
	type TextComponent,
	renderMatches,
} from "obsidian";

import { FuzzyInputSuggest } from "@javalent/utilities";

import type { CalloutIconDefinition } from "../types";
import type { IconManager } from "../icons/manager";

/** Minimum plugin surface area needed by IconSuggestionModal. */
export interface IconModalPluginRef {
	app: unknown;
	iconManager: IconManager;
}

export class IconSuggestionModal extends FuzzyInputSuggest<CalloutIconDefinition> {
	constructor(
		public plugin: IconModalPluginRef,
		input: TextComponent | SearchComponent,
		items: CalloutIconDefinition[],
	) {
		super(plugin.app as import("obsidian").App, input, items);
	}
	renderNote(
		noteEl: HTMLElement,
		result: FuzzyMatch<CalloutIconDefinition>,
	): void {
		noteEl.setText(
			this.plugin.iconManager.getIconModuleName(result.item) ?? "",
		);
	}
	renderTitle(
		titleEl: HTMLElement,
		result: FuzzyMatch<CalloutIconDefinition>,
	): void {
		renderMatches(titleEl, result.item.name ?? "", result.match.matches);
	}
	renderFlair(
		flairEl: HTMLElement,
		result: FuzzyMatch<CalloutIconDefinition>,
	): void {
		const { item } = result;
		flairEl.appendChild(
			this.plugin.iconManager.getIconNode(item) ?? document.createElement("div"),
		);
	}
	getItemText(item: CalloutIconDefinition): string {
		return item.name ?? "";
	}
}
