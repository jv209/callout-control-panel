/**
 * Icon fuzzy-search suggestion modal.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * Dependency: @javalent/utilities (FuzzyInputSuggest)
 */

import {
    FuzzyMatch,
    SearchComponent,
    TextComponent,
    renderMatches
} from "obsidian";

import { FuzzyInputSuggest } from "@javalent/utilities";

import { AdmonitionIconDefinition } from "../@types";
import { IconManager } from "../icons/manager";

/** Minimum plugin surface area needed by IconSuggestionModal. */
export interface IconModalPluginRef {
    app: any;
    iconManager: IconManager;
}

export class IconSuggestionModal extends FuzzyInputSuggest<AdmonitionIconDefinition> {
    constructor(
        public plugin: IconModalPluginRef,
        input: TextComponent | SearchComponent,
        items: AdmonitionIconDefinition[]
    ) {
        super(plugin.app, input, items);
    }
    renderNote(
        noteEL: HTMLElement,
        result: FuzzyMatch<AdmonitionIconDefinition>
    ): void {
        noteEL.setText(this.plugin.iconManager.getIconModuleName(result.item));
    }
    renderTitle(
        titleEl: HTMLElement,
        result: FuzzyMatch<AdmonitionIconDefinition>
    ): void {
        renderMatches(titleEl, result.item.name, result.match.matches);
    }
    renderFlair(
        flairEl: HTMLElement,
        result: FuzzyMatch<AdmonitionIconDefinition>
    ): void {
        const { item } = result;
        flairEl.appendChild(
            this.plugin.iconManager.getIconNode(item) ?? createDiv()
        );
    }
    getItemText(item: AdmonitionIconDefinition) {
        return item.name;
    }
}
