/**
 * Global type declarations for Obsidian runtime globals.
 *
 * These functions and variables are injected by Obsidian at runtime
 * but are not exported from the "obsidian" module.
 */

declare var activeDocument: Document; // eslint-disable-line no-var -- declare var is required for global ambient declarations
declare var activeWindow: Window; // eslint-disable-line no-var -- declare var is required for global ambient declarations

declare function createEl<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	o?: Record<string, unknown> | string,
	callback?: (el: HTMLElementTagNameMap[K]) => void,
): HTMLElementTagNameMap[K];

declare function createDiv(
	o?: Record<string, unknown> | string,
	callback?: (el: HTMLDivElement) => void,
): HTMLDivElement;

declare function createSpan(
	o?: Record<string, unknown> | string,
	callback?: (el: HTMLSpanElement) => void,
): HTMLSpanElement;

declare function createFragment(
	callback?: (el: DocumentFragment) => void,
): DocumentFragment;
