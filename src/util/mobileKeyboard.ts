/**
 * Mobile keyboard avoidance for modals.
 *
 * On mobile devices the soft keyboard shrinks the visual viewport but
 * Obsidian's modal container stays at `position: fixed; height: 100%`,
 * which means the modal ends up hidden behind the keyboard.
 *
 * This utility constrains the container to the visual viewport so the
 * modal stays fully visible and scrollable while the keyboard is open.
 */

import { Platform } from "obsidian";

/**
 * Adjusts a modal container to stay within the visual viewport on mobile.
 * Call in `onOpen()` and invoke the returned cleanup function in `onClose()`.
 */
export function enableMobileKeyboardAvoidance(
	containerEl: HTMLElement,
): () => void {
	if (!Platform.isMobile || !window.visualViewport) return () => {};

	const vv = window.visualViewport;

	const onViewportChange = () => {
		containerEl.style.height = `${vv.height}px`;
		containerEl.style.top = `${vv.offsetTop}px`;
	};

	vv.addEventListener("resize", onViewportChange);
	vv.addEventListener("scroll", onViewportChange);
	onViewportChange();

	return () => {
		vv.removeEventListener("resize", onViewportChange);
		vv.removeEventListener("scroll", onViewportChange);
		containerEl.style.removeProperty("height");
		containerEl.style.removeProperty("top");
	};
}
