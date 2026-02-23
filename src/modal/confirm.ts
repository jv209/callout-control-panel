/**
 * Generic confirmation modal.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 */

import { type App, ButtonComponent, Modal } from "obsidian";

export async function confirmWithModal(
	app: App,
	text: string,
	buttons: { cta: string; secondary: string } = {
		cta: "Yes",
		secondary: "No",
	},
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		try {
			const modal = new ConfirmModal(app, text, buttons);
			modal.onClose = () => {
				resolve(modal.confirmed);
			};
			modal.open();
		} catch (e) {
			reject(e);
		}
	});
}

export class ConfirmModal extends Modal {
	confirmed = false;

	constructor(
		app: App,
		public text: string,
		public buttons: { cta: string; secondary: string },
	) {
		super(app);
	}

	async display() {
		this.contentEl.empty();
		this.contentEl.addClass("confirm-modal");
		this.contentEl.createEl("p", {
			text: this.text,
		});
		const buttonEl = this.contentEl.createDiv("confirm-buttons");
		new ButtonComponent(buttonEl)
			.setButtonText(this.buttons.cta)
			.setCta()
			.onClick(() => {
				this.confirmed = true;
				this.close();
			});
		new ButtonComponent(buttonEl)
			.setButtonText(this.buttons.secondary)
			.onClick(() => {
				this.close();
			});
	}

	onOpen() {
		this.display();
	}
}
