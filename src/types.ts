/**
 * Shared type definitions for the Enhanced Callout Manager plugin.
 *
 * Attribution: Built-in callout type definitions are derived from
 * the Editing Toolbar plugin by Cuman
 * (https://github.com/cumany/obsidian-editing-toolbar), licensed under MIT.
 */

/**
 * Where a callout type originates from.
 */
export type CalloutSource = "builtin" | "snippet" | "custom" | "theme";

/**
 * Universal callout type information used by the modal dropdown
 * and shared across all modules.
 */
export interface CalloutTypeInfo {
	/** The callout identifier used in markdown (e.g., "note", "warning"). */
	type: string;
	/** Display label for the UI (e.g., "Note", "Warning"). */
	label: string;
	/** Icon name (e.g., "lucide-pencil"). */
	icon: string;
	/** CSS color value (e.g., "var(--callout-default)" or "rgb(r,g,b)"). */
	color: string;
	/** Where this callout type was defined. */
	source: CalloutSource;
	/** Alternate names that resolve to this type (e.g., "summary" → "abstract"). */
	aliases?: string[];
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
}

export const DEFAULT_SETTINGS: PluginSettings = {
	defaultCalloutType: "note",
	rememberLastType: false,
	autoFocusContent: true,
	lastUsedType: "note",
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
