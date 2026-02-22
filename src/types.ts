/**
 * Shared type definitions for the Enhanced Callout Manager plugin.
 *
 * Attribution: Built-in callout type definitions are derived from
 * the Editing Toolbar plugin by Cuman
 * (https://github.com/cumany/obsidian-editing-toolbar), licensed under MIT.
 *
 * Icon types derived from obsidian-admonition v10.3.2
 * (MIT, Jeremy Valentine).
 */

import type { DownloadableIconPack } from "./icons/packs";

/**
 * Where a callout type originates from.
 */
export type CalloutSource = "builtin" | "snippet" | "custom" | "theme";

/**
 * Which icon pack an icon belongs to.
 */
export type IconType = "font-awesome" | "obsidian" | "image" | DownloadableIconPack;

/**
 * An icon reference: pack type + icon name (or image URL for type "image").
 */
export interface CalloutIconDefinition {
	type?: IconType;
	name?: string;
}

/**
 * Universal callout type information used by the modal dropdown
 * and shared across all modules.
 */
export interface CalloutTypeInfo {
	/** The callout identifier used in markdown (e.g., "note", "warning"). */
	type: string;
	/** Display label for the UI (e.g., "Note", "Warning"). */
	label: string;
	/** Icon name (e.g., "lucide-pencil"). Used as fallback when iconDef is absent. */
	icon: string;
	/** Full icon definition for non-Lucide icons (Font Awesome, downloaded packs, images). */
	iconDef?: CalloutIconDefinition;
	/** CSS color value (e.g., "var(--callout-default)" or "rgb(r,g,b)"). */
	color: string;
	/** Where this callout type was defined. */
	source: CalloutSource;
	/** True when the CSS block had no --callout-icon declaration (using default). */
	iconDefault?: boolean;
	/** True when the declared --callout-icon name doesn't resolve to a real icon. */
	iconInvalid?: boolean;
	/** Alternate names that resolve to this type (e.g., "summary" → "abstract"). */
	aliases?: string[];
}

/**
 * A user-defined custom callout type, persisted to settings and rendered
 * to CSS by CalloutManager.
 */
export interface CustomCallout {
	/** The callout type ID used in markdown (e.g., "my-callout"). */
	type: string;
	/** Icon definition (Obsidian, Font Awesome, downloaded pack, or image). */
	icon: CalloutIconDefinition;
	/** Color in RGB format: "r, g, b". */
	color: string;
	/** Per-type override for color injection. Falls back to global setting when undefined. */
	injectColor?: boolean;
}

/**
 * Plugin settings persisted to data.json.
 */
export interface PluginSettings {
	/** The default callout type selected when the modal opens. */
	defaultCalloutType: string;
	/** Whether to remember and re-select the last used callout type. */
	rememberLastType: boolean;
	/** Whether to auto-focus the content textarea when the modal opens. */
	autoFocusContent: boolean;
	/** Tracks the last used callout type (when rememberLastType is enabled). */
	lastUsedType: string;
	/** Which CSS sources to scan for callout types. */
	calloutDetection: {
		/** Detect callouts from Obsidian's built-in stylesheet (app.css). */
		obsidian: boolean;
		/** Detect callouts from the active theme's stylesheet. */
		theme: boolean;
		/** Detect callouts from enabled CSS snippet files. */
		snippet: boolean;
	};
	/** Installed downloadable icon packs (e.g., "octicons", "rpg"). */
	icons: DownloadableIconPack[];
	/** Whether Font Awesome icons are available for selection. */
	useFontAwesome: boolean;
	/** User-created custom callout type definitions. */
	customCallouts: Record<string, CustomCallout>;
	/** Whether to inject the configured color into custom callout CSS. */
	injectColor: boolean;
	/** Up to 5 pinned callout type IDs for quick access. Empty string = unused slot. */
	favoriteCallouts: string[];
	/** Smooth CSS transition animation for collapsible callouts. */
	smoothTransitions: boolean;
	/** Show a copy-to-clipboard button in each callout's title bar. */
	showCopyButton: boolean;
	/** Apply a subtle drop shadow to rendered callouts. */
	enableDropShadow: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	defaultCalloutType: "note",
	rememberLastType: false,
	autoFocusContent: true,
	lastUsedType: "note",
	calloutDetection: { obsidian: true, theme: true, snippet: true },
	icons: [],
	useFontAwesome: true,
	customCallouts: {},
	injectColor: true,
	favoriteCallouts: [],
	smoothTransitions: true,
	showCopyButton: false,
	enableDropShadow: false,
};

/**
 * The 14 built-in Obsidian callout types.
 *
 * Attribution: Derived from the Editing Toolbar plugin by Cuman
 * (https://github.com/cumany/obsidian-editing-toolbar), licensed under MIT.
 */
export const BUILTIN_CALLOUT_TYPES: CalloutTypeInfo[] = [
	{ type: "note",      label: "Note",      icon: "lucide-pencil",         color: "var(--callout-default)",   source: "builtin", aliases: [] },
	{ type: "abstract",  label: "Abstract",   icon: "lucide-clipboard-list", color: "var(--callout-summary)",   source: "builtin", aliases: ["summary", "tldr"] },
	{ type: "info",      label: "Info",       icon: "lucide-info",           color: "var(--callout-info)",      source: "builtin", aliases: [] },
	{ type: "todo",      label: "Todo",       icon: "lucide-check-circle-2", color: "var(--callout-todo)",      source: "builtin", aliases: [] },
	{ type: "important", label: "Important",  icon: "lucide-flame",          color: "var(--callout-important)", source: "builtin", aliases: [] },
	{ type: "tip",       label: "Tip",        icon: "lucide-flame",          color: "var(--callout-tip)",       source: "builtin", aliases: ["hint"] },
	{ type: "success",   label: "Success",    icon: "lucide-check",          color: "var(--callout-success)",   source: "builtin", aliases: ["check", "done"] },
	{ type: "question",  label: "Question",   icon: "lucide-help-circle",    color: "var(--callout-question)",  source: "builtin", aliases: ["help", "faq"] },
	{ type: "warning",   label: "Warning",    icon: "lucide-alert-triangle", color: "var(--callout-warning)",   source: "builtin", aliases: ["caution", "attention"] },
	{ type: "failure",   label: "Failure",    icon: "lucide-x",              color: "var(--callout-fail)",      source: "builtin", aliases: ["fail", "missing"] },
	{ type: "danger",    label: "Danger",     icon: "lucide-zap",            color: "var(--callout-error)",     source: "builtin", aliases: ["error"] },
	{ type: "bug",       label: "Bug",        icon: "lucide-bug",            color: "var(--callout-bug)",       source: "builtin", aliases: [] },
	{ type: "example",   label: "Example",    icon: "lucide-list",           color: "var(--callout-example)",   source: "builtin", aliases: [] },
	{ type: "quote",     label: "Quote",      icon: "lucide-quote",          color: "var(--callout-quote)",     source: "builtin", aliases: ["cite"] },
];
