/**
 * Mobile keyboard avoidance for modals.
 *
 * On mobile devices the soft keyboard shrinks the visual viewport but
 * Obsidian's modal container stays at `position: fixed; inset: 0`,
 * which means the modal ends up hidden behind the keyboard.
 *
 * This utility constrains both the container and the inner `.modal`
 * element to the visual viewport so the modal stays fully visible
 * and scrollable while the keyboard is open.
 *
 * Three layers of detection are used because mobile webviews are
 * inconsistent about which events fire when the keyboard opens:
 *   1. visualViewport resize / scroll (preferred, most reliable)
 *   2. window resize (fallback for webviews that lack VV events)
 *   3. focusin on inputs — triggers a delayed re-measure in case
 *      neither of the above fires promptly
 */

import { Platform } from "obsidian";

/**
 * Adjusts a modal container to stay within the visual viewport on mobile.
 * Call in `onOpen()` and invoke the returned cleanup function in `onClose()`.
 */
export function enableMobileKeyboardAvoidance(
	containerEl: HTMLElement,
): () => void {
	if (!Platform.isMobile) return () => {};

	const modalEl = containerEl.querySelector(":scope > .modal") as HTMLElement | null;

	const constrain = () => {
		const vv = window.visualViewport;
		const vpHeight = vv ? vv.height : window.innerHeight;
		const vpTop = vv ? vv.offsetTop : 0;

		// Override inset:0's bottom so height is respected
		containerEl.style.height = `${vpHeight}px`;
		containerEl.style.top = `${vpTop}px`;
		containerEl.style.bottom = "auto";
		containerEl.style.overflow = "hidden";

		if (modalEl) {
			modalEl.style.maxHeight = `${vpHeight}px`;
		}
	};

	const reset = () => {
		containerEl.style.removeProperty("height");
		containerEl.style.removeProperty("top");
		containerEl.style.removeProperty("bottom");
		containerEl.style.removeProperty("overflow");
		if (modalEl) {
			modalEl.style.removeProperty("max-height");
		}
	};

	// 1. visualViewport events (preferred)
	const vv = window.visualViewport;
	if (vv) {
		vv.addEventListener("resize", constrain);
		vv.addEventListener("scroll", constrain);
	}

	// 2. window resize fallback
	window.addEventListener("resize", constrain);

	// 3. focusin — when user taps an input, re-measure after a short
	//    delay to give the keyboard time to appear
	let focusTimer: ReturnType<typeof setTimeout> | null = null;
	const onFocusIn = (e: FocusEvent) => {
		const target = e.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.tagName === "SELECT" ||
				target.isContentEditable)
		) {
			if (focusTimer) clearTimeout(focusTimer);
			focusTimer = setTimeout(constrain, 300);
		}
	};
	containerEl.addEventListener("focusin", onFocusIn);

	// Apply immediately
	constrain();

	return () => {
		if (vv) {
			vv.removeEventListener("resize", constrain);
			vv.removeEventListener("scroll", constrain);
		}
		window.removeEventListener("resize", constrain);
		containerEl.removeEventListener("focusin", onFocusIn);
		if (focusTimer) clearTimeout(focusTimer);
		reset();
	};
}
