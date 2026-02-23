/**
 * Extracts callout IDs from CSS text by matching [data-callout] attribute selectors.
 *
 * Extracted from: obsidian-callout-manager/src/css-parser.ts
 * Original author: eth-p (https://github.com/eth-p)
 * License: MIT
 */

import type { CalloutID } from './types';

/**
 * Extracts a list of callout IDs from a stylesheet.
 *
 * Matches CSS attribute selectors like:
 *   [data-callout="my-callout"]  — exact match
 *   [data-callout^="my-callout"] — starts-with match
 *
 * Ignores partial match selectors (*=, ~=, |=, $=).
 *
 * @param css The CSS text to extract from.
 * @returns The callout IDs found.
 */
export function getCalloutsFromCSS(css: string): CalloutID[] {
	const REGEX_CALLOUT_SELECTOR = /\[data-callout([^\]]*)\]/gmi;
	const REGEX_MATCH_QUOTED_STRING: {[key: string]: RegExp} = {
		"'": /^'([^']+)'( i)?$/,
		'"': /^"([^"]+)"( i)?$/,
		'': /^([^\]]+)$/,
	};

	// Get a list of attribute selectors.
	const attributeSelectors: string[] = [];
	let matches;
	while ((matches = REGEX_CALLOUT_SELECTOR.exec(css)) != null) {
		if (matches[1] != null) {
			attributeSelectors.push(matches[1]);
		}
		REGEX_CALLOUT_SELECTOR.lastIndex = matches.index + matches[0].length;
	}

	// Try to find exact matches within the list.
	const ids: CalloutID[] = [];
	for (const attributeSelector of attributeSelectors) {
		let selectorString: string;
		if (attributeSelector.startsWith('=')) {
			selectorString = attributeSelector.substring(1);
		} else if (attributeSelector.startsWith('^=')){
			selectorString = attributeSelector.substring(2);
		} else {
			continue;
		}

		// Try to extract the string from the attribute selector.
		const quoteChar = selectorString.charAt(0);
		const stringRegex = REGEX_MATCH_QUOTED_STRING[quoteChar] ?? REGEX_MATCH_QUOTED_STRING[''];
		if (!stringRegex) continue;
		const innerMatch = stringRegex.exec(selectorString);
		if (innerMatch != null && innerMatch[1] != null) {
			ids.push(innerMatch[1]);
		}
	}

	return ids;
}
