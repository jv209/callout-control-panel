/**
 * Callout preview components (standard and Shadow DOM isolated).
 * Used by the CalloutResolver to compute CSS variable values via getComputedStyle.
 *
 * Extracted from: obsidian-callout-manager/src/ui/component/callout-preview.ts
 * Original author: eth-p (https://github.com/eth-p)
 * License: MIT
 *
 * Modified: Replaced path-aliased imports with local references.
 */

import { Component, getIcon } from 'obsidian';

import type { CalloutID, RGB } from '../types';

const NO_ATTACH = Symbol();

export interface PreviewOptions {
	id: CalloutID;
	icon: string;
	color?: RGB;
	title?: HTMLElement | DocumentFragment | string | ((titleEl: HTMLElement) => unknown);
	content?: HTMLElement | DocumentFragment | string | ((contentEl: HTMLElement) => unknown);
}

/**
 * A component that displays a preview of a callout.
 */
export class CalloutPreviewComponent extends Component {
	public readonly calloutEl: HTMLElement;
	public readonly contentEl: HTMLElement | undefined;
	public readonly titleEl: HTMLElement;
	public readonly iconEl: HTMLElement;

	public constructor(containerEl: HTMLElement | DocumentFragment | typeof NO_ATTACH, options: PreviewOptions) {
		super();
		const { color, icon, id, title, content } = options;

		const frag = document.createDocumentFragment();

		const calloutEl = (this.calloutEl = frag.createDiv({ cls: ['callout', 'calloutmanager-preview'] }));
		const titleElContainer = calloutEl.createDiv({ cls: 'callout-title' });
		this.iconEl = titleElContainer.createDiv({ cls: 'callout-icon' });
		const titleEl = (this.titleEl = titleElContainer.createDiv({ cls: 'callout-title-inner' }));
		const contentEl = (this.contentEl =
			content === undefined ? undefined : calloutEl.createDiv({ cls: 'callout-content' }));

		this.setIcon(icon);
		this.setColor(color);
		this.setCalloutID(id);

		if (title == null) titleEl.textContent = id;
		else if (typeof title === 'function') title(titleEl);
		else if (typeof title === 'string') titleEl.textContent = title;
		else titleEl.appendChild(title);

		if (contentEl != null) {
			if (typeof content === 'function') content(contentEl);
			else if (typeof content === 'string') contentEl.textContent = content;
			else contentEl.appendChild(content as HTMLElement | DocumentFragment);
		}

		if (containerEl !== NO_ATTACH) {
			CalloutPreviewComponent.prototype.attachTo.call(this, containerEl);
		}
	}

	public setCalloutID(id: string): typeof this {
		this.calloutEl.setAttribute('data-callout', id);
		return this;
	}

	public setIcon(icon: string): typeof this {
		const { iconEl, calloutEl } = this;
		calloutEl.style.setProperty('--callout-icon', icon);
		iconEl.empty();
		const iconSvg = getIcon(icon);
		if (iconSvg != null) this.iconEl.appendChild(iconSvg);
		return this;
	}

	public setColor(color: RGB | undefined): typeof this {
		const { calloutEl } = this;
		if (color == null) {
			calloutEl.style.removeProperty('--callout-color');
			return this;
		}
		calloutEl.style.setProperty('--callout-color', `${color.r}, ${color.g}, ${color.b}`);
		return this;
	}

	public attachTo(containerEl: HTMLElement | DocumentFragment): typeof this {
		containerEl.appendChild(this.calloutEl);
		return this;
	}

	public resetStylePropertyOverrides() {
		this.calloutEl.style.removeProperty('--callout-color');
		this.calloutEl.style.removeProperty('--callout-icon');
	}
}

export interface IsolatedPreviewOptions extends PreviewOptions {
	colorScheme: 'dark' | 'light';
	focused?: boolean;
	viewType?: 'source' | 'reading';
	cssEls?: (HTMLStyleElement | HTMLLinkElement)[];
}

/**
 * An isolated callout preview using Shadow DOM.
 * Replicates the full Obsidian workspace DOM tree so CSS selectors resolve correctly.
 */
export class IsolatedCalloutPreviewComponent extends CalloutPreviewComponent {
	protected readonly styleEls: HTMLStyleElement[];
	protected readonly shadowBody: HTMLBodyElement;
	protected readonly shadowHead: HTMLHeadElement;
	protected readonly shadowHostEl: HTMLElement;
	protected readonly shadowRoot: ShadowRoot;

	public readonly customStyleEl: HTMLStyleElement;

	public constructor(containerEl: HTMLElement | DocumentFragment, options: IsolatedPreviewOptions) {
		super(NO_ATTACH, options);

		const frag = document.createDocumentFragment();
		const focused = options.focused ?? false;
		const colorScheme = options.colorScheme;
		const readingView = (options.viewType ?? 'reading') === 'reading';
		const cssEls = options?.cssEls ?? getCurrentStyles(containerEl?.doc);

		const shadowHostEl = (this.shadowHostEl = frag.createDiv());
		const shadowRoot = (this.shadowRoot = shadowHostEl.attachShadow({ delegatesFocus: false, mode: 'closed' }));
		const shadowHead = (this.shadowHead = shadowRoot.createEl('head'));
		const shadowBody = (this.shadowBody = shadowRoot.createEl('body'));

		const styleEls = (this.styleEls = [] as HTMLStyleElement[]);
		for (const cssEl of cssEls) {
			const cssElClone = cssEl.cloneNode(true);
			if (cssEl.tagName === 'STYLE') {
				styleEls.push(cssElClone as HTMLStyleElement);
			}
			shadowHead.appendChild(cssElClone);
		}

		// eslint-disable-next-line obsidianmd/no-forbidden-elements -- Shadow DOM requires inline style elements
		shadowHead.createEl('style', { text: SHADOW_DOM_RESET_STYLES });
		// eslint-disable-next-line obsidianmd/no-forbidden-elements -- Shadow DOM requires inline style elements
		this.customStyleEl = shadowHead.createEl('style', { attr: { 'data-custom-styles': 'true' } });

		shadowBody.classList.add(`theme-${colorScheme}`, 'obsidian-app');
		const viewContentEl = shadowBody
			.createDiv({ cls: 'app-container' })
			.createDiv({ cls: 'horizontal-main-container' })
			.createDiv({ cls: 'workspace' })
			.createDiv({ cls: 'workspace-split mod-root' })
			.createDiv({ cls: `workspace-tabs ${focused ? 'mod-active' : ''}` })
			.createDiv({ cls: 'workspace-tab-container' })
			.createDiv({ cls: `workspace-leaf ${focused ? 'mod-active' : ''}` })
			.createDiv({ cls: 'workspace-leaf-content' })
			.createDiv({ cls: 'view-content' });

		const calloutParentEl = readingView
			? createReadingViewContainer(viewContentEl)
			: createLiveViewContainer(viewContentEl);

		calloutParentEl.appendChild(this.calloutEl);

		if (containerEl != null) {
			IsolatedCalloutPreviewComponent.prototype.attachTo.call(this, containerEl as HTMLElement);
		}
	}

	public updateStyles(): typeof this {
		return this.updateStylesWith(
			getCurrentStyles(this.shadowHostEl.doc)
				.filter((e) => e.tagName === 'STYLE')
				.map((e) => e.cloneNode(true) as HTMLStyleElement),
		);
	}

	public updateStylesWith(styleEls: HTMLStyleElement[]): typeof this {
		const { styleEls: oldStyleEls, customStyleEl } = this;

		let i, end;
		let lastNode = customStyleEl.previousSibling as HTMLElement;
		for (i = 0, end = Math.min(styleEls.length, oldStyleEls.length); i < end; i++) {
			const el = styleEls[i]!;
			oldStyleEls[i]!.replaceWith(el);
			lastNode = el;
		}

		for (end = styleEls.length; i < end; i++) {
			const el = styleEls[i]!;
			lastNode.insertAdjacentElement('afterend', el);
			oldStyleEls.push(el);
		}

		const toRemove = oldStyleEls.splice(i, oldStyleEls.length - i);
		for (const node of toRemove) node.remove();

		return this;
	}

	public removeStyles(predicate: (el: HTMLStyleElement) => boolean) {
		for (let i = 0; i < this.styleEls.length; i++) {
			const el = this.styleEls[i]!;
			if (predicate(el)) {
				el.remove();
				this.styleEls.splice(i, 1);
				i--;
			}
		}
	}

	public setColorScheme(colorScheme: 'dark' | 'light'): typeof this {
		const { classList } = this.shadowBody;
		classList.toggle('theme-dark', colorScheme === 'dark');
		classList.toggle('theme-light', colorScheme === 'light');
		return this;
	}

	public attachTo(containerEl: HTMLElement): typeof this {
		containerEl.appendChild(this.shadowHostEl);
		return this;
	}
}

// ---- DOM helpers ----

function getCurrentStyles(doc?: Document): Array<HTMLStyleElement | HTMLLinkElement> {
	const els: Array<HTMLStyleElement | HTMLLinkElement> = [];
	let node = (doc ?? window.document).head.firstElementChild;
	for (; node != null; node = node.nextElementSibling) {
		const nodeTag = node.tagName;
		if (nodeTag === 'STYLE' || (nodeTag === 'LINK' && node.getAttribute('rel')?.toLowerCase() === 'stylesheet')) {
			els.push(node as HTMLStyleElement | HTMLLinkElement);
		}
	}
	return els;
}

function createReadingViewContainer(viewContentEl: HTMLDivElement): HTMLDivElement {
	return viewContentEl
		.createDiv({ cls: 'markdown-reading-view' })
		.createDiv({ cls: 'markdown-preview-view markdown-rendered' })
		.createDiv({ cls: 'markdown-preview-section' })
		.createDiv();
}

function createLiveViewContainer(viewContentEl: HTMLDivElement): HTMLDivElement {
	return viewContentEl
		.createDiv({ cls: 'markdown-source-view cm-s-obsidian mod-cm6 is-live-preview' })
		.createDiv({ cls: 'cm-editor' })
		.createDiv({ cls: 'cm-scroller' })
		.createDiv({ cls: 'cm-sizer' })
		.createDiv({ cls: 'cm-contentContainer' })
		.createDiv({ cls: 'cm-content' })
		.createDiv({ cls: 'cm-embed-block markdown-rendered cm-callout' });
}

const SHADOW_DOM_RESET_STYLES = `
/* Reset layout for all elements above the callout in the shadow DOM. */
.app-container,
.horizontal-main-container,
.workspace,
.workspace-split,
.workspace-tabs,
.workspace-tab-container,
.workspace-leaf,
.workspace-leaf-content,
.view-content,
.markdown-reading-view,
.markdown-source-view,
.cm-editor,
.cm-editor > .cm-scroller,
.cm-sizer,
.cm-contentContainer,
.cm-content,
.markdown-preview-view {
	all: initial !important;
	display: block !important;
}

.markdown-preview-section,
.cm-callout {
	color: var(--text-normal) !important;
}

.markdown-preview-section > div > .callout,
.cm-callout > .callout,
.calloutmanager-preview.callout {
	margin: 0 !important;
}

.cm-callout,
.callout {
	font-size: var(--font-text-size) !important;
	font-family: var(--font-text) !important;
	line-height: var(--line-height-normal) !important;
}

body {
	background-color: transparent !important;
}
`;
