/**
 * Parses CSS snippet files from .obsidian/snippets/ to discover
 * custom callout type definitions.
 *
 * Attribution: Adapted from the Editing Toolbar plugin by Cuman
 * (https://github.com/cumany/obsidian-editing-toolbar), licensed under MIT.
 *
 * Uses the robust CSS parser from obsidian-callout-manager (eth-p, MIT)
 * for callout ID extraction. Supports all attribute selector forms:
 *   [data-callout="typename"]  — exact match (quoted or unquoted)
 *   [data-callout^="typename"] — starts-with match
 *   Complex selectors like div:is([data-callout=foo])
 *
 * When a callout type appears multiple times (e.g. light/dark theme
 * variants), only the first occurrence is kept. Accurate theme-aware
 * color resolution is planned for Phase 4.
 */

import type { App } from "obsidian";
import type { CalloutTypeInfo } from "./types";
import { BUILTIN_CALLOUT_TYPES } from "./types";
import { getCalloutsFromCSS } from "./callout-detection";

/** Warning about a snippet file that contains malformed callout definitions. */
export interface SnippetWarning {
	/** Display name of the snippet file (e.g. "my-callouts.css"). */
	file: string;
	/** Number of callout-like patterns that failed to parse. */
	malformedCount: number;
}

/** Result of scanning CSS snippets for callout types. */
export interface SnippetParseResult {
	types: CalloutTypeInfo[];
	warnings: SnippetWarning[];
	/**
	 * Per-snippet data: maps snippet name → { ids, css }.
	 * Used to seed the callout collection and cssTextCache when the
	 * stylesheet watcher cannot access app.customCss.csscache.
	 */
	snippetMap: Map<string, { ids: string[]; css: string }>;
}

/** Shape returned by the undocumented vault adapter list() method. */
interface AdapterListResult {
	files: string[];
	folders: string[];
}

/** Undocumented Obsidian internal for CSS snippet management. */
interface CustomCss {
	enabledSnippets: Set<string>;
}

/**
 * Reads enabled .css snippet files in the vault's snippets directory
 * and extracts any custom callout type definitions found.
 *
 * Only snippets that are toggled on in Obsidian's Appearance settings
 * are scanned. Returns only types that are NOT already in the built-in
 * list, so snippet definitions that shadow built-in types are excluded.
 */
export async function parseSnippetCalloutTypes(app: App): Promise<SnippetParseResult> {
	const results: CalloutTypeInfo[] = [];
	const warnings: SnippetWarning[] = [];
	const snippetMap = new Map<string, { ids: string[]; css: string }>();

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

	// Get enabled snippets from Obsidian's undocumented API.
	// Guarded: if the API shape changes, we return empty results gracefully.
	let enabledSnippets: Set<string>;
	try {
		const customCss = (app as unknown as { customCss: CustomCss }).customCss;
		enabledSnippets = customCss.enabledSnippets;
		if (!(enabledSnippets instanceof Set)) {
			return { types: results, warnings, snippetMap };
		}
	} catch {
		return { types: results, warnings, snippetMap };
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
		return { types: results, warnings, snippetMap };
	}

	// Skip the plugin's own generated snippet to avoid circular detection
	// (custom types written to this file would otherwise appear as snippet types).
	const PLUGIN_SNIPPET_NAME = "callout-control-panel";

	const cssFiles = listing.files.filter((f) => {
		if (!f.endsWith(".css")) return false;
		// Extract snippet name (filename without .css extension)
		const fileName = f.split("/").pop() ?? "";
		const snippetName = fileName.replace(/\.css$/, "");
		if (snippetName === PLUGIN_SNIPPET_NAME) return false;
		return enabledSnippets.has(snippetName);
	});

	for (const filePath of cssFiles) {
		let css: string;
		try {
			css = await app.vault.adapter.read(filePath);
		} catch {
			continue;
		}

		// Use the robust parser to discover callout IDs, then extract
		// properties (color, icon) from the CSS blocks.
		const discoveredIds = getCalloutsFromCSS(css);

		// Store per-snippet data so the caller can seed the callout
		// collection and cssTextCache (used when csscache is unavailable).
		const snippetName = filePath.split("/").pop()?.replace(/\.css$/, "") ?? "";
		if (snippetName) {
			snippetMap.set(snippetName, { ids: discoveredIds, css });
		}

		// Count loose mentions that look like callout definitions.
		// The robust parser handles more patterns (unquoted, complex selectors)
		// than this heuristic, so malformed warnings only fire when something
		// looks clearly intended as a callout def but wasn't parseable.
		const looseMatches = css.match(/\[data-callout[\^]?=/g);
		const potentialCount = looseMatches ? looseMatches.length : 0;

		const parsedCount = collectCalloutTypes(
			css, discoveredIds, results, builtinNames,
		);

		// If the loose heuristic found more data-callout mentions than the
		// robust parser extracted, some entries may be malformed.
		const malformedCount = potentialCount - parsedCount;
		if (malformedCount > 0) {
			const fileName = filePath.split("/").pop() ?? filePath;
			warnings.push({ file: fileName, malformedCount });
		}
	}

	return { types: results, warnings, snippetMap };
}

/**
 * For each callout ID discovered by the robust parser, extract CSS
 * properties (color, icon) from the stylesheet and add to results.
 *
 * Deduplicates by type name — when a type has both light and dark
 * variants, only the first encountered definition is kept.
 *
 * @returns The total number of selector occurrences found (before dedup),
 *          used for the malformed-count comparison.
 */
function collectCalloutTypes(
	css: string,
	discoveredIds: string[],
	results: CalloutTypeInfo[],
	builtinNames: Set<string>,
): number {
	const seenInFile = new Set<string>();

	for (const typeName of discoveredIds) {
		// Skip duplicates within this file (light/dark variants)
		if (seenInFile.has(typeName)) continue;
		seenInFile.add(typeName);

		// Skip built-in types and aliases
		if (builtinNames.has(typeName)) continue;

		// Skip if already collected from a previous file
		if (results.some((r) => r.type === typeName)) continue;

		// Extract color and icon from the first rule block referencing this ID
		const props = extractCalloutProperties(css, typeName);

		// Title-case the type name for the display label
		const label = typeName
			.replace(/[-_]/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase());

		results.push({
			type: typeName,
			label,
			icon: props.icon,
			color: props.color,
			source: "snippet",
			iconDefault: props.iconDefault,
		});
	}

	return discoveredIds.length;
}

/**
 * Extract --callout-color and --callout-icon from the first CSS rule
 * block that references the given callout ID.
 *
 * Searches for any `[data-callout="id"]` (or unquoted / starts-with)
 * followed by a `{ ... }` block, then pulls the custom properties.
 */
export function extractCalloutProperties(
	css: string,
	calloutId: string,
): { color: string; icon: string; iconDefault: boolean } {
	// Escape the callout ID for regex use
	const escaped = calloutId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	// Match any rule block whose selector references this callout ID.
	// Handles quoted, unquoted, and starts-with selectors.
	const blockRegex = new RegExp(
		`\\[data-callout(?:\\^)?=["']?${escaped}["']?\\][^{]*\\{([^}]*)\\}`,
		"gi",
	);

	const match = blockRegex.exec(css);
	if (!match?.[1]) {
		return { color: "var(--callout-default)", icon: "lucide-box", iconDefault: true };
	}

	const block = match[1];

	// Extract --callout-color: R, G, B
	// Store as raw RGB tuple (e.g. "68, 138, 255") without rgb() wrapper,
	// matching how built-in colors work with the CSS pattern rgb(var(--callout-color)).
	const colorMatch = block.match(/--callout-color:\s*([\d\s,]+)/);
	const color = colorMatch?.[1]
		? colorMatch[1].trim()
		: "var(--callout-default)";

	// Extract --callout-icon: icon-name
	const iconMatch = block.match(/--callout-icon:\s*([\w-]+)/);
	let icon = iconMatch?.[1] ? iconMatch[1] : "lucide-box";
	const iconDefault = !iconMatch?.[1];

	// "transparent" is used to hide the icon element entirely.
	// Display as "no-icon" in the UI for clarity.
	if (icon === "transparent") {
		icon = "no-icon";
	}

	return { color, icon, iconDefault };
}
