/**
 * Parses CSS snippet files from .obsidian/snippets/ to discover
 * custom callout type definitions.
 *
 * Attribution: Adapted from the Editing Toolbar plugin by Cuman
 * (https://github.com/cumany/obsidian-editing-toolbar), licensed under MIT.
 *
 * Looks for patterns like:
 *   .callout[data-callout="typename"] {
 *       --callout-color: R, G, B;
 *       --callout-icon: lucide-icon-name;
 *   }
 *
 * When a callout type appears multiple times (e.g. light/dark theme
 * variants), only the first occurrence is kept. Accurate theme-aware
 * color resolution is planned for Phase 4.
 */

import type { App } from "obsidian";
import type { CalloutTypeInfo } from "./types";
import { BUILTIN_CALLOUT_TYPES } from "./types";

/** Shape returned by the undocumented vault adapter list() method. */
interface AdapterListResult {
	files: string[];
	folders: string[];
}

/**
 * Reads all .css files in the vault's snippets directory and extracts
 * any custom callout type definitions found.
 *
 * Returns only types that are NOT already in the built-in list, so
 * snippet definitions that shadow built-in types are excluded.
 */
export async function parseSnippetCalloutTypes(app: App): Promise<CalloutTypeInfo[]> {
	const results: CalloutTypeInfo[] = [];

	// Build a set of built-in type names (including aliases) for filtering
	const builtinNames = new Set<string>();
	for (const bt of BUILTIN_CALLOUT_TYPES) {
		builtinNames.add(bt.type);
		if (bt.aliases) {
			for (const alias of bt.aliases) {
				builtinNames.add(alias);
			}
		}
	}

	const snippetsDir = `${app.vault.configDir}/snippets`;

	let listing: AdapterListResult;
	try {
		const adapter = app.vault.adapter as unknown as {
			list(path: string): Promise<AdapterListResult>;
		};
		listing = await adapter.list(snippetsDir);
	} catch {
		// Snippets directory doesn't exist or can't be read
		return results;
	}

	const cssFiles = listing.files.filter((f) => f.endsWith(".css"));

	for (const filePath of cssFiles) {
		let css: string;
		try {
			css = await app.vault.adapter.read(filePath);
		} catch {
			continue;
		}

		extractCalloutTypes(css, results, builtinNames);
	}

	return results;
}

/**
 * Extract callout type definitions from a CSS string.
 *
 * Matches: .callout[data-callout="typename"] (with optional ancestor
 * selectors like .theme-light or .theme-dark before it).
 *
 * Then looks for --callout-color and --callout-icon within the block.
 * Deduplicates by type name — when a type has both light and dark
 * variants, only the first encountered definition is kept.
 */
function extractCalloutTypes(
	css: string,
	results: CalloutTypeInfo[],
	builtinNames: Set<string>,
): void {
	// Match .callout[data-callout="..."] followed by its { ... } block.
	// The regex doesn't anchor to line start, so it handles ancestor
	// selectors like ".theme-light .callout[...]" naturally.
	const blockRegex = /\.callout\[data-callout=["']([^"']+)["']\]\s*\{([^}]*)}/g;
	let match: RegExpExecArray | null;

	while ((match = blockRegex.exec(css)) !== null) {
		const typeName = match[1];
		const block = match[2];

		// Skip if not captured
		if (!typeName || !block) continue;

		// Skip built-in types and aliases
		if (builtinNames.has(typeName)) continue;

		// Skip if we already have this type (dedup light/dark variants)
		if (results.some((r) => r.type === typeName)) continue;

		// Extract --callout-color: R, G, B
		const colorMatch = block.match(/--callout-color:\s*([\d\s,]+)/);
		const color = colorMatch && colorMatch[1]
			? `rgb(${colorMatch[1].trim()})`
			: "var(--callout-default)";

		// Extract --callout-icon: icon-name
		const iconMatch = block.match(/--callout-icon:\s*([\w-]+)/);
		const icon = iconMatch && iconMatch[1] ? iconMatch[1] : "lucide-box";

		// Title-case the type name for the display label
		const label = typeName
			.replace(/[-_]/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase());

		results.push({
			type: typeName,
			label,
			icon,
			color,
			source: "snippet",
		});
	}
}
