/**
 * Shared type definitions for the Callout Modal plugin.
 *
 * Attribution: BuiltInCalloutType and CombinedCalloutTypeInfo are derived from
 * the Editing Toolbar plugin by Cuman (https://github.com/cumany/obsidian-editing-toolbar),
 * licensed under MIT.
 */

/** A built-in Obsidian callout type definition. */
export interface BuiltInCalloutType {
    type: string;
    aliases: string[];
    icon: string;        // Lucide icon name (e.g., "lucide-pencil")
    label: string;
    color: string;       // CSS variable (e.g., "var(--callout-default)")
}

/** A custom callout type discovered from a CSS snippet file. */
export interface SnippetCalloutType {
    type: string;        // from data-callout value
    icon: string;        // from --callout-icon (fallback: "lucide-box")
    color: string;       // from --callout-color as "rgb(R,G,B)" (fallback: "var(--callout-default)")
    sourceFile: string;  // which snippet file it came from
}

/** Unified callout type info used by the modal dropdown. */
export interface CombinedCalloutTypeInfo {
    type: string;
    label: string;
    icon: string;
    color: string;
    source: "builtin" | "snippet";
}

/** Plugin settings persisted to data.json. */
export interface CalloutModalSettings {
    parseSnippets: boolean;
    defaultCalloutType: string;
    rememberLastType: boolean;
    autoFocusContent: boolean;
}

export const DEFAULT_SETTINGS: CalloutModalSettings = {
    parseSnippets: true,
    defaultCalloutType: "note",
    rememberLastType: false,
    autoFocusContent: true,
};
