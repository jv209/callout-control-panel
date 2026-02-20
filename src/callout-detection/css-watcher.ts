/**
 * Watches for changes to Obsidian stylesheets (themes, snippets, built-in).
 * Emits events when stylesheets are added, changed, or removed.
 *
 * Extracted from: obsidian-callout-manager/src/css-watcher.ts
 * Original author: eth-p (https://github.com/eth-p)
 * License: MIT
 *
 * Modified: Replaced obsidian-extra/obsidian-undocumented imports with
 * inline helpers from obsidian-helpers.ts.
 */

import type { App } from 'obsidian';
import {
	fetchObsidianStyleSheet,
	getCurrentThemeID,
	getSnippetStyleElements,
	getThemeManifest,
	getThemeStyleElement,
	type ObsidianStyleSheetResult,
} from './obsidian-helpers';

/**
 * Finds and watches for changes to any of the applied CSS stylesheets.
 * Uses caching to prevent unnecessary parsing of unchanged stylesheets.
 */
export default class StylesheetWatcher {
	protected cachedObsidian: ObsidianStyleSheetResult | null;
	protected cachedTheme: { id: string; version: string; contents: string } | null;
	protected cachedSnippets: Map<string, string>;
	protected listeners: Map<string, Set<(...data: unknown[]) => void>>;

	protected watching: boolean;
	protected app: App;

	public constructor(app: App) {
		this.app = app;
		this.listeners = new Map();
		this.cachedSnippets = new Map();
		this.cachedObsidian = null;
		this.cachedTheme = null;
		this.watching = false;
	}

	/**
	 * Start watching for changes to stylesheets.
	 * @returns A callback function to pass to Plugin.register() for cleanup.
	 */
	public watch(): () => void {
		if (this.watching) {
			throw new Error('Already watching.');
		}

		this.watching = true;

		// Listen to Obsidian's undocumented css-change workspace event.
		const listener = () => this.checkForChanges(false);
		this.app.workspace.on('css-change' as 'quit', listener);

		this.checkForChanges();

		return () => {
			if (!this.watching) return;
			this.app.workspace.off('css-change' as 'quit', listener);
			this.watching = false;
		};
	}

	/**
	 * Describes how the Obsidian stylesheet was fetched (for display in settings).
	 */
	public describeObsidianFetchMethod(): string {
		switch (this.cachedObsidian?.method ?? 'pending') {
			case 'dom':
				return 'using browser functions';
			case 'fetch':
				return "by reading Obsidian's styles";
			case 'pending':
				return '';
		}
	}

	// ---- Event system ----

	public on(event: 'add', listener: (stylesheet: SnippetStylesheet | ThemeStylesheet) => void): void;
	public on(event: 'change', listener: (stylesheet: SnippetStylesheet | ThemeStylesheet | ObsidianStylesheet) => void): void;
	public on(event: 'remove', listener: (stylesheet: SnippetStylesheet | ThemeStylesheet) => void): void;
	public on(event: 'checkStarted', listener: () => void): void;
	public on(event: 'checkComplete', listener: (anyChanges: boolean) => void): void;
	public on<E extends keyof StylesheetWatcherEvents>(event: E, listener: StylesheetWatcherEvents[E]): void {
		let listenersForEvent = this.listeners.get(event);
		if (listenersForEvent === undefined) {
			listenersForEvent = new Set();
			this.listeners.set(event, listenersForEvent);
		}
		listenersForEvent.add(listener as (...data: unknown[]) => void);
	}

	public off<E extends keyof StylesheetWatcherEvents>(event: E, listener: StylesheetWatcherEvents[E]): void {
		const listenersForEvent = this.listeners.get(event);
		if (listenersForEvent === undefined) return;
		listenersForEvent.delete(listener as (...data: unknown[]) => void);
		if (listenersForEvent.size === 0) {
			this.listeners.delete(event);
		}
	}

	protected emit<E extends keyof StylesheetWatcherEvents>(
		event: E,
		...data: Parameters<StylesheetWatcherEvents[E]>
	): void {
		const listenersForEvent = this.listeners.get(event);
		if (listenersForEvent === undefined) return;
		for (const listener of listenersForEvent) {
			listener(...data);
		}
	}

	// ---- Change detection ----

	/**
	 * Checks for any changes to the application stylesheets.
	 * If watch() is active, this is called automatically on css-change events.
	 *
	 * @param clear If true, the cache will be cleared first.
	 */
	public async checkForChanges(clear?: boolean): Promise<boolean> {
		let changed = false;
		this.emit('checkStarted');

		if (clear === true) {
			this.cachedSnippets.clear();
			this.cachedTheme = null;
			this.cachedObsidian = null;
		}

		if (this.cachedObsidian == null) {
			changed = (await this.checkForChangesObsidian()) || changed;
		}

		changed = this.checkForChangesSnippets() || changed;
		changed = this.checkForChangesTheme() || changed;

		this.emit('checkComplete', changed);
		return changed;
	}

	protected async checkForChangesObsidian(): Promise<boolean> {
		try {
			this.cachedObsidian = await fetchObsidianStyleSheet(this.app);
			this.emit('change', {
				type: 'obsidian',
				styles: this.cachedObsidian.cssText,
			});
			return true;
		} catch (ex) {
			console.warn('Unable to fetch Obsidian stylesheet.', ex);
			return false;
		}
	}

	protected checkForChangesTheme(): boolean {
		const theme = getCurrentThemeID(this.app);
		const themeManifest = theme == null ? null : getThemeManifest(this.app, theme);
		const hasTheme = theme != null && themeManifest != null;
		const styleEl = getThemeStyleElement(this.app);
		const styles = styleEl?.textContent ?? '';

		if (this.cachedTheme != null && !hasTheme) {
			this.emit('remove', { type: 'theme', theme: this.cachedTheme.id, styles: this.cachedTheme.contents });
			this.cachedTheme = null;
			return true;
		}

		if (this.cachedTheme == null && hasTheme) {
			this.cachedTheme = { id: theme, version: themeManifest.version, contents: styles };
			this.emit('add', { type: 'theme', theme, styles });
			return true;
		}

		if (!hasTheme || this.cachedTheme == null) return false;

		const changed =
			this.cachedTheme.id !== theme ||
			this.cachedTheme.version !== themeManifest.version ||
			this.cachedTheme.contents !== styles;

		if (changed) {
			this.cachedTheme = { id: theme, version: themeManifest.version, contents: styles };
			this.emit('change', { type: 'theme', theme, styles });
		}

		return changed;
	}

	protected checkForChangesSnippets(): boolean {
		let anyChanges = false;
		const snippets = getSnippetStyleElements(this.app);
		const knownSnippets = Array.from(this.cachedSnippets.entries());

		for (const [id, cachedStyles] of knownSnippets) {
			const styleEl = snippets.get(id);
			if (styleEl == null) {
				this.cachedSnippets.delete(id);
				this.emit('remove', { type: 'snippet', snippet: id, styles: cachedStyles });
				anyChanges = true;
				continue;
			}
			if (styleEl.textContent != null && styleEl.textContent !== cachedStyles) {
				this.cachedSnippets.set(id, styleEl.textContent);
				this.emit('change', { type: 'snippet', snippet: id, styles: styleEl.textContent });
				anyChanges = true;
			}
		}

		for (const [id, styleEl] of snippets.entries()) {
			if (styleEl == null) continue;
			if (!this.cachedSnippets.has(id) && styleEl.textContent != null) {
				this.cachedSnippets.set(id, styleEl.textContent);
				this.emit('add', { type: 'snippet', snippet: id, styles: styleEl.textContent });
				anyChanges = true;
			}
		}

		return anyChanges;
	}
}

// ---- Exported types ----

export interface StylesheetWatcherEvents {
	add(stylesheet: SnippetStylesheet | ThemeStylesheet): void;
	change(stylesheet: SnippetStylesheet | ThemeStylesheet | ObsidianStylesheet): void;
	remove(stylesheet: SnippetStylesheet | ThemeStylesheet): void;
	checkComplete(anyChanges: boolean): void;
	checkStarted(): void;
}

export interface SnippetStylesheet {
	type: 'snippet';
	snippet: string;
	styles: string;
}

export interface ThemeStylesheet {
	type: 'theme';
	theme: string;
	styles: string;
}

export interface ObsidianStylesheet {
	type: 'obsidian';
	styles: string;
}
