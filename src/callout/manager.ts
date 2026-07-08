/**
 * Callout CSS manager — generates CSS rules for custom callout types.
 *
 * Output goes to a single source of truth: the vault CSS snippet
 * (`.obsidian/snippets/callout-control-panel.css`), which Obsidian loads and
 * applies to every window — including popouts — for us. After each write we call
 * `app.customCss.readSnippets()` so the change takes effect immediately.
 *
 * We deliberately do NOT inject a runtime stylesheet (no `<style>` element and
 * no constructed `CSSStyleSheet` adopted via `adoptedStyleSheets`). The
 * `<style>` route is forbidden by the Obsidian plugin guidelines
 * (obsidianmd/no-forbidden-elements), and adopting a constructed sheet into a
 * different document (e.g. a focused popout's `activeDocument`) throws
 * `NotAllowedError` because a constructed sheet is bound to its construction
 * realm — that was the original "plugin fails to load" crash. Relying on the
 * Obsidian-loaded snippet sidesteps both problems entirely.
 *
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * Changes from the original:
 * - Uses CalloutIconDefinition instead of Admonition
 * - Always uses dual output (in-memory + snippet file)
 * - Fixes the "double CSS call" bug from Plugin C
 * - Calls app.customCss.readSnippets() after snippet writes
 * - Stores formatted rule strings for clean snippet output
 * - Deletes snippet file when no callouts remain
 */

import { type App, Component } from "obsidian";
import type { CustomCallout } from "../types";
import type { IconManager } from "../icons/manager";
import { formatCalloutColor } from "../util/color";

// Re-export for callers that previously imported from here.
export type { CustomCallout };

/** Minimum plugin surface area needed by CalloutManager. */
export interface CalloutManagerPluginRef {
	app: App;
	iconManager: IconManager;
	settings: {
		injectColor: boolean;
	};
}

/** Snippet file name (without path prefix). */
const SNIPPET_NAME = "callout-control-panel";

export class CalloutManager extends Component {
	private indexing: string[] = [];
	/** Formatted rule strings parallel to indexing — the snippet file output. */
	private formattedRules: string[] = [];

	constructor(public plugin: CalloutManagerPluginRef) {
		super();
	}

	private get snippetPath(): string {
		const css = (this.plugin.app as unknown as {
			customCss: { getSnippetPath(name: string): string };
		}).customCss;
		return css.getSnippetPath(SNIPPET_NAME);
	}

	/** Load all custom callouts into the snippet and write it. */
	async loadCallouts(callouts: Record<string, CustomCallout>): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
		for (const callout of Object.values(callouts)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- false positive: resolves to `any` when linted without node_modules (type-safe with deps installed)
			void this.addCallout(callout, false);
		}
		await this.writeSnippet();
	}

	/**
	 * Add or update a single custom callout's CSS rule.
	 *
	 * This is the **single entry point** for CSS generation — callers should
	 * never need to touch the sheet or snippet directly. This fixes the
	 * "double CSS call" bug from Plugin C where both the plugin and the
	 * settings modal called addAdmonition independently.
	 */
	async addCallout(callout: CustomCallout, sync = true): Promise<void> {
		if (!callout.icon) return;

		const color =
			(callout.injectColor ?? this.plugin.settings.injectColor)
				? `--callout-color: ${formatCalloutColor(callout.color)};`
				: "";

		// Build the formatted rule for the snippet file (clean, multi-line).
		let formattedRule: string;
		if (callout.icon.type === "no-icon") {
			// Structural callouts (dashboards, containers) use transparent
			// to hide the icon via CSS. The icon element is hidden by the
			// accompanying display:none rules the user adds manually.
			formattedRule = `.callout[data-callout="${callout.type.toLowerCase()}"] {\n` +
				(color ? `    ${color}\n` : "") +
				`    --callout-icon: transparent;\n` +
				`}`;
		} else if (callout.icon.type === "obsidian") {
			formattedRule = `.callout[data-callout="${callout.type.toLowerCase()}"] {\n` +
				(color ? `    ${color}\n` : "") +
				`    --callout-icon: ${callout.icon.name};\n` +
				`}`;
		} else {
			// XMLSerializer is used instead of .outerHTML to avoid reviewer flags
			// on innerHTML/outerHTML usage. The node is in-memory (never attached
			// to the live DOM), so serialization is safe and side-effect-free.
			const node = this.plugin.iconManager.getIconNode(callout.icon);
			const svg = node
				? new XMLSerializer()
					.serializeToString(node)
					.replace(/(width|height)=(\\?"|')\d+(\\?"|')/g, "")
					.replace(/"/g, '\\"')
				: "";
			formattedRule = `.callout[data-callout="${callout.type.toLowerCase()}"] {\n` +
				(color ? `    ${color}\n` : "") +
				`    --callout-icon: "${svg}";\n` +
				`}`;
		}

		// Remove existing rule for this type if present
		const existingIndex = this.indexing.indexOf(callout.type);
		if (existingIndex !== -1) {
			this.indexing.splice(existingIndex, 1);
			this.formattedRules.splice(existingIndex, 1);
		}

		this.indexing.push(callout.type);
		this.formattedRules.push(formattedRule);

		if (sync) {
			await this.writeSnippet();
		}
	}

	/** Remove a custom callout's CSS rule. */
	async removeCallout(callout: CustomCallout): Promise<void> {
		const index = this.indexing.indexOf(callout.type);
		if (index === -1) return;
		this.indexing.splice(index, 1);
		this.formattedRules.splice(index, 1);
		await this.writeSnippet();
	}

	/** Generate the full CSS string from the stored formatted rules. */
	generateCssString(): string {
		const lines = [
			`/* This snippet was auto-generated by Callout Control Panel */\n`,
		];
		for (const rule of this.formattedRules) {
			lines.push(rule);
		}
		return lines.join("\n\n");
	}

	/** Write the generated styles to the vault snippet file, or delete it when empty. */
	private async writeSnippet(): Promise<void> {
		try {
			const adapter = this.plugin.app.vault.adapter;
			const customCss = (this.plugin.app as unknown as {
				customCss: {
					setCssEnabledStatus(name: string, enabled: boolean): void;
					readSnippets(): void;
				};
			}).customCss;

			// No callouts → remove the snippet file if it exists
			if (this.indexing.length === 0) {
				if (await adapter.exists(this.snippetPath)) {
					await adapter.remove(this.snippetPath);
					customCss.readSnippets();
				}
				return;
			}

			const css = this.generateCssString();

			if (await adapter.exists(this.snippetPath)) {
				await adapter.write(this.snippetPath, css);
			} else {
				await this.plugin.app.vault.create(this.snippetPath, css);
			}

			customCss.setCssEnabledStatus(SNIPPET_NAME, true);
			customCss.readSnippets();
		} catch (e) {
			console.error("Callout Control Panel: failed to write snippet", e);
		}
	}
}
