import { Plugin } from "obsidian";

export default class EnhancedCalloutManager extends Plugin {
	async onload() {
		console.log("Enhanced Callout Manager loaded");
	}

	onunload() {
		console.log("Enhanced Callout Manager unloaded");
	}
}
