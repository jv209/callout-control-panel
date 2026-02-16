import { Plugin } from "obsidian";

export default class EnhancedCalloutManager extends Plugin {
	async onload() {
		console.debug("Enhanced Callout Manager loaded");
	}

	onunload() {
		console.debug("Enhanced Callout Manager unloaded");
	}
}
