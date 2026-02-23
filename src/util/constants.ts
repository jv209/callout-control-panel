/**
 * Default callout type definitions.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * These are the built-in Obsidian callout types with their Plugin C
 * (Font Awesome) icon mappings and RGB colors. Used as defaults when
 * creating or importing callout types.
 */

import type { CustomCallout } from "../callout/manager";

/**
 * Default callout definitions keyed by type name, including aliases.
 *
 * Each entry maps a callout identifier to a CustomCallout with its
 * Font Awesome icon and RGB color. Aliases (e.g. "summary" → "abstract")
 * point to the same definition as their parent type.
 */
export const DEFAULT_CALLOUT_MAP: Record<string, CustomCallout> = {
	note: {
		type: "note",
		color: "68, 138, 255",
		icon: { type: "font-awesome", name: "pencil-alt" },
	},
	seealso: {
		type: "note",
		color: "68, 138, 255",
		icon: { type: "font-awesome", name: "pencil-alt" },
	},
	abstract: {
		type: "abstract",
		color: "0, 176, 255",
		icon: { type: "font-awesome", name: "book" },
	},
	summary: {
		type: "abstract",
		color: "0, 176, 255",
		icon: { type: "font-awesome", name: "book" },
	},
	tldr: {
		type: "abstract",
		color: "0, 176, 255",
		icon: { type: "font-awesome", name: "book" },
	},
	info: {
		type: "info",
		color: "0, 184, 212",
		icon: { type: "font-awesome", name: "info-circle" },
	},
	todo: {
		type: "info",
		color: "0, 184, 212",
		icon: { type: "font-awesome", name: "info-circle" },
	},
	tip: {
		type: "tip",
		color: "0, 191, 165",
		icon: { type: "font-awesome", name: "fire" },
	},
	hint: {
		type: "tip",
		color: "0, 191, 165",
		icon: { type: "font-awesome", name: "fire" },
	},
	important: {
		type: "tip",
		color: "0, 191, 165",
		icon: { type: "font-awesome", name: "fire" },
	},
	success: {
		type: "success",
		color: "0, 200, 83",
		icon: { type: "font-awesome", name: "check-circle" },
	},
	check: {
		type: "success",
		color: "0, 200, 83",
		icon: { type: "font-awesome", name: "check-circle" },
	},
	done: {
		type: "success",
		color: "0, 200, 83",
		icon: { type: "font-awesome", name: "check-circle" },
	},
	question: {
		type: "question",
		color: "100, 221, 23",
		icon: { type: "font-awesome", name: "question-circle" },
	},
	help: {
		type: "question",
		color: "100, 221, 23",
		icon: { type: "font-awesome", name: "question-circle" },
	},
	faq: {
		type: "question",
		color: "100, 221, 23",
		icon: { type: "font-awesome", name: "question-circle" },
	},
	warning: {
		type: "warning",
		color: "255, 145, 0",
		icon: { type: "font-awesome", name: "exclamation-triangle" },
	},
	caution: {
		type: "warning",
		color: "255, 145, 0",
		icon: { type: "font-awesome", name: "exclamation-triangle" },
	},
	attention: {
		type: "warning",
		color: "255, 145, 0",
		icon: { type: "font-awesome", name: "exclamation-triangle" },
	},
	failure: {
		type: "failure",
		color: "255, 82, 82",
		icon: { type: "font-awesome", name: "times-circle" },
	},
	fail: {
		type: "failure",
		color: "255, 82, 82",
		icon: { type: "font-awesome", name: "times-circle" },
	},
	missing: {
		type: "failure",
		color: "255, 82, 82",
		icon: { type: "font-awesome", name: "times-circle" },
	},
	danger: {
		type: "danger",
		color: "255, 23, 68",
		icon: { type: "font-awesome", name: "bolt" },
	},
	error: {
		type: "danger",
		color: "255, 23, 68",
		icon: { type: "font-awesome", name: "bolt" },
	},
	bug: {
		type: "bug",
		color: "245, 0, 87",
		icon: { type: "font-awesome", name: "bug" },
	},
	example: {
		type: "example",
		color: "124, 77, 255",
		icon: { type: "font-awesome", name: "list-ol" },
	},
	quote: {
		type: "quote",
		color: "158, 158, 158",
		icon: { type: "font-awesome", name: "quote-right" },
	},
	cite: {
		type: "quote",
		color: "158, 158, 158",
		icon: { type: "font-awesome", name: "quote-right" },
	},
};
