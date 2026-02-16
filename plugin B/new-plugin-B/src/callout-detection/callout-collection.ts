/**
 * Multi-source callout registry with lazy resolution and diff-based change tracking.
 *
 * Extracted from: obsidian-callout-manager/src/callout-collection.ts
 * Original author: eth-p (https://github.com/eth-p)
 * License: MIT
 *
 * Modified: Replaced obsidian-undocumented SnippetID/ThemeID with string.
 */

import type { Callout, CalloutID, CalloutSource } from './types';

/**
 * A collection of Callout IDs from multiple sources (builtin, theme, snippets, custom).
 * Lazily resolves callout properties (icon, color) via a resolver callback.
 */
export class CalloutCollection {
	private resolver: (id: string) => Omit<Callout, 'sources'>;

	private invalidated: Set<CachedCallout>;
	private invalidationCount: number;
	private cacheById: Map<CalloutID, CachedCallout>;
	private cached: boolean;

	public readonly snippets: CalloutCollectionSnippets;
	public readonly builtin: CalloutCollectionObsidian;
	public readonly theme: CalloutCollectionTheme;
	public readonly custom: CalloutCollectionCustom;

	public constructor(resolver: (id: string) => Omit<Callout, 'sources'>) {
		this.resolver = resolver;
		this.invalidated = new Set();
		this.invalidationCount = 0;
		this.cacheById = new Map();
		this.cached = false;

		this.snippets = new CalloutCollectionSnippets(this.invalidateSource.bind(this));
		this.builtin = new CalloutCollectionObsidian(this.invalidateSource.bind(this));
		this.theme = new CalloutCollectionTheme(this.invalidateSource.bind(this));
		this.custom = new CalloutCollectionCustom(this.invalidateSource.bind(this));
	}

	public get(id: CalloutID): Callout | undefined {
		if (!this.cached) this.buildCache();
		const cached = this.cacheById.get(id);
		if (cached === undefined) return undefined;

		if (this.invalidated.has(cached)) {
			this.resolveOne(cached);
		}

		return cached.callout as Callout;
	}

	public has(id: CalloutID): boolean {
		if (!this.cached) this.buildCache();
		return this.cacheById.has(id);
	}

	public keys(): CalloutID[] {
		if (!this.cached) this.buildCache();
		return Array.from(this.cacheById.keys());
	}

	public values(): Callout[] {
		if (!this.cached) this.buildCache();
		this.resolveAll();
		return Array.from(this.cacheById.values()).map((c) => c.callout as Callout);
	}

	/**
	 * Returns a function that returns true if the collection has changed since creation.
	 */
	public hasChanged(): () => boolean {
		const countSnapshot = this.invalidationCount;
		return () => this.invalidationCount !== countSnapshot;
	}

	protected resolveOne(cached: CachedCallout) {
		this.doResolve(cached);
		this.invalidated.delete(cached);
	}

	protected resolveAll() {
		for (const cached of this.invalidated.values()) {
			this.doResolve(cached);
		}
		this.invalidated.clear();
	}

	protected doResolve(cached: CachedCallout) {
		cached.callout = this.resolver(cached.id) as Callout;
		cached.callout.sources = Array.from(cached.sources.values()).map(sourceFromKey);
	}

	protected buildCache() {
		this.invalidated.clear();
		this.cacheById.clear();

		// Add Obsidian callouts.
		{
			const source = sourceToKey({ type: 'builtin' });
			for (const callout of this.builtin.get()) {
				this.addCalloutSource(callout, source);
			}
		}

		// Add theme callouts.
		if (this.theme.theme != null) {
			const source = sourceToKey({ type: 'theme', theme: this.theme.theme });
			for (const callout of this.theme.get()) {
				this.addCalloutSource(callout, source);
			}
		}

		// Add snippet callouts.
		for (const snippet of this.snippets.keys()) {
			const source = sourceToKey({ type: 'snippet', snippet });
			for (const callout of this.snippets.get(snippet) as CalloutID[]) {
				this.addCalloutSource(callout, source);
			}
		}

		// Add custom callouts.
		{
			const source = sourceToKey({ type: 'custom' });
			for (const callout of this.custom.keys()) {
				this.addCalloutSource(callout, source);
			}
		}

		this.cached = true;
	}

	public invalidate(id: CalloutID): void {
		if (!this.cached) return;
		const callout = this.cacheById.get(id);
		if (callout !== undefined) {
			this.invalidated.add(callout);
		}
	}

	protected addCalloutSource(id: string, sourceKey: string) {
		let callout = this.cacheById.get(id);
		if (callout == null) {
			callout = new CachedCallout(id);
			this.cacheById.set(id, callout);
		}
		callout.sources.add(sourceKey);
		this.invalidated.add(callout);
	}

	protected removeCalloutSource(id: string, sourceKey: string) {
		const callout = this.cacheById.get(id);
		if (callout == null) return;
		callout.sources.delete(sourceKey);
		if (callout.sources.size === 0) {
			this.cacheById.delete(id);
			this.invalidated.delete(callout);
		}
	}

	protected invalidateSource(
		src: CalloutSource,
		data: { added: CalloutID[]; removed: CalloutID[]; changed: CalloutID[] },
	): void {
		const sourceKey = sourceToKey(src);
		if (!this.cached) return;

		for (const removed of data.removed) {
			this.removeCalloutSource(removed, sourceKey);
		}
		for (const added of data.added) {
			this.addCalloutSource(added, sourceKey);
		}
		for (const changed of data.changed) {
			const callout = this.cacheById.get(changed);
			if (callout != null) {
				this.invalidated.add(callout);
			}
		}
		this.invalidationCount++;
	}
}

// ---- Internal cache entry ----

class CachedCallout {
	public readonly id: CalloutID;
	public readonly sources: Set<string>;
	public callout: Callout | null;

	public constructor(id: CalloutID) {
		this.id = id;
		this.sources = new Set();
		this.callout = null;
	}
}

// ---- Source-specific sub-collections ----

class CalloutCollectionSnippets {
	private data = new Map<string, Set<CalloutID>>();
	private invalidate: CalloutCollection['invalidateSource'];

	public constructor(invalidate: CalloutCollection['invalidateSource']) {
		this.invalidate = invalidate;
	}

	public get(id: string): CalloutID[] | undefined {
		const value = this.data.get(id);
		return value === undefined ? undefined : Array.from(value.values());
	}

	public set(id: string, callouts: CalloutID[]): void {
		const source: CalloutSource = { type: 'snippet', snippet: id };
		const old = this.data.get(id);
		const updated = new Set(callouts);
		this.data.set(id, updated);

		if (old === undefined) {
			this.invalidate(source, { added: callouts, changed: [], removed: [] });
			return;
		}

		const diffs = diff(old, updated);
		this.invalidate(source, { added: diffs.added, removed: diffs.removed, changed: diffs.same });
	}

	public delete(id: string): boolean {
		const old = this.data.get(id);
		const deleted = this.data.delete(id);
		if (old !== undefined) {
			this.invalidate(
				{ type: 'snippet', snippet: id },
				{ added: [], changed: [], removed: Array.from(old.keys()) },
			);
		}
		return deleted;
	}

	public clear(): void {
		for (const id of Array.from(this.data.keys())) {
			this.delete(id);
		}
	}

	public keys(): string[] {
		return Array.from(this.data.keys());
	}
}

class CalloutCollectionObsidian {
	private data = new Set<CalloutID>();
	private invalidate: CalloutCollection['invalidateSource'];

	public constructor(invalidate: CalloutCollection['invalidateSource']) {
		this.invalidate = invalidate;
	}

	public set(callouts: CalloutID[]) {
		const old = this.data;
		const updated = (this.data = new Set(callouts));
		const diffs = diff(old, updated);
		this.invalidate(
			{ type: 'builtin' },
			{ added: diffs.added, removed: diffs.removed, changed: diffs.same },
		);
	}

	public get(): CalloutID[] {
		return Array.from(this.data.values());
	}
}

class CalloutCollectionTheme {
	private data = new Set<CalloutID>();
	private invalidate: CalloutCollection['invalidateSource'];
	private oldTheme: string | null;

	public constructor(invalidate: CalloutCollection['invalidateSource']) {
		this.invalidate = invalidate;
		this.oldTheme = '';
	}

	public get theme(): string | null {
		return this.oldTheme;
	}

	public set(theme: string, callouts: CalloutID[]) {
		const old = this.data;
		const oldTheme = this.oldTheme;

		const updated = (this.data = new Set(callouts));
		this.oldTheme = theme;

		if (this.oldTheme === theme) {
			const diffs = diff(old, updated);
			this.invalidate(
				{ type: 'theme', theme },
				{ added: diffs.added, removed: diffs.removed, changed: diffs.same },
			);
			return;
		}

		// Theme changed — all old callouts removed, all new ones added.
		this.invalidate(
			{ type: 'theme', theme: oldTheme ?? '' },
			{ added: [], removed: Array.from(old.values()), changed: [] },
		);
		this.invalidate(
			{ type: 'theme', theme },
			{ added: callouts, removed: [], changed: [] },
		);
	}

	public delete(): void {
		const old = this.data;
		const oldTheme = this.oldTheme;
		this.data = new Set();
		this.oldTheme = null;
		this.invalidate(
			{ type: 'theme', theme: oldTheme ?? '' },
			{ added: [], removed: Array.from(old.values()), changed: [] },
		);
	}

	public get(): CalloutID[] {
		return Array.from(this.data.values());
	}
}

class CalloutCollectionCustom {
	private data: CalloutID[] = [];
	private invalidate: CalloutCollection['invalidateSource'];

	public constructor(invalidate: CalloutCollection['invalidateSource']) {
		this.invalidate = invalidate;
	}

	public has(id: CalloutID): boolean {
		return undefined !== this.data.find((existingId) => existingId === id);
	}

	public add(...ids: CalloutID[]): void {
		const set = new Set(this.data);
		const added = [];
		for (const id of ids) {
			if (!set.has(id)) {
				added.push(id);
				set.add(id);
				this.data.push(id);
			}
		}
		if (added.length > 0) {
			this.invalidate({ type: 'custom' }, { added, removed: [], changed: [] });
		}
	}

	public delete(...ids: CalloutID[]): void {
		const { data } = this;
		const removed = [];
		for (const id of ids) {
			const index = data.findIndex((existingId) => id === existingId);
			if (index !== undefined) {
				data.splice(index, 1);
				removed.push(id);
			}
		}
		if (removed.length > 0) {
			this.invalidate({ type: 'custom' }, { added: [], removed, changed: [] });
		}
	}

	public keys(): CalloutID[] {
		return this.data.slice(0);
	}

	public clear(): void {
		const removed = this.data;
		this.data = [];
		this.invalidate({ type: 'custom' }, { added: [], removed, changed: [] });
	}
}

// ---- Utility functions ----

function diff<T>(before: Set<T>, after: Set<T>): { added: T[]; removed: T[]; same: T[] } {
	const added: T[] = [];
	const removed: T[] = [];
	const same: T[] = [];

	for (const item of before.values()) {
		(after.has(item) ? same : removed).push(item);
	}
	for (const item of after.values()) {
		if (!before.has(item)) added.push(item);
	}

	return { added, removed, same };
}

function sourceToKey(source: CalloutSource): string {
	switch (source.type) {
		case 'builtin': return 'builtin';
		case 'snippet': return `snippet:${source.snippet}`;
		case 'theme':   return `theme:${source.theme}`;
		case 'custom':  return `custom`;
	}
}

function sourceFromKey(sourceKey: string): CalloutSource {
	if (sourceKey === 'builtin') return { type: 'builtin' };
	if (sourceKey === 'custom') return { type: 'custom' };
	if (sourceKey.startsWith('snippet:')) return { type: 'snippet', snippet: sourceKey.substring('snippet:'.length) };
	if (sourceKey.startsWith('theme:')) return { type: 'theme', theme: sourceKey.substring('theme:'.length) };
	throw new Error('Unknown source key: ' + sourceKey);
}
