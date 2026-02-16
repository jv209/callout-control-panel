/**
 * Parses CSS snippet files from .obsidian/snippets/ to discover
 * custom callout type definitions.
 *
 * Looks for patterns like:
 *   .callout[data-callout="typename"] {
 *       --callout-color: R, G, B;
 *       --callout-icon: lucide-icon-name;
 *   }
 */

import type { App } from "obsidian";
import type { SnippetCalloutType } from "./types";

const SNIPPETS_DIR = ".obsidian/snippets";

/**
 * Reads all .css files in the vault's snippets directory and extracts
 * any custom callout type definitions found.
 */
export async function parseSnippetCalloutTypes(app: App): Promise<SnippetCalloutType[]> {
    const results: SnippetCalloutType[] = [];

    let listing: { files: string[] };
    try {
        listing = await (app.vault.adapter as any).list(SNIPPETS_DIR);
    } catch {
        // Snippets directory doesn't exist or can't be read
        return results;
    }

    const cssFiles = listing.files.filter((f: string) => f.endsWith(".css"));

    for (const filePath of cssFiles) {
        let css: string;
        try {
            css = await app.vault.adapter.read(filePath);
        } catch {
            continue;
        }

        const fileName = filePath.split("/").pop() ?? filePath;
        extractCalloutTypes(css, fileName, results);
    }

    return results;
}

/**
 * Extract callout type definitions from a CSS string.
 * Matches: .callout[data-callout="typename"]
 * Then looks for --callout-color and --callout-icon within the block.
 */
function extractCalloutTypes(css: string, sourceFile: string, results: SnippetCalloutType[]) {
    // Match .callout[data-callout="..."] followed by its { ... } block
    const blockRegex = /\.callout\[data-callout=["']([^"']+)["']\]\s*\{([^}]*)}/g;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(css)) !== null) {
        const typeName = match[1];
        const block = match[2];

        // Skip if we already have this type
        if (results.some(r => r.type === typeName)) continue;

        // Extract --callout-color: R, G, B
        const colorMatch = block.match(/--callout-color:\s*([\d\s,]+)/);
        const color = colorMatch
            ? `rgb(${colorMatch[1].trim()})`
            : "var(--callout-default)";

        // Extract --callout-icon: icon-name
        const iconMatch = block.match(/--callout-icon:\s*([\w-]+)/);
        const icon = iconMatch ? iconMatch[1] : "lucide-box";

        results.push({ type: typeName, icon, color, sourceFile });
    }
}
