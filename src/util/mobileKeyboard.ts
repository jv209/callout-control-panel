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
 * Adjusts a modal container to stay within the visual viewport on tablets.
 * Call in `onOpen()` and invoke the returned cleanup function in `onClose()`.
 *
 * Phones are excluded — the insert modal uses a stripped-down layout on
 * phones that avoids keyboard issues, and this JS-based workaround was
 * unreliable on phone-sized webviews.
 */
export function enableMobileKeyboardAvoidance(
	containerEl: HTMLElement,
): () => void {
	// Only apply on tablets; phones use a compact layout instead
	if (!Platform.isTablet) return () => {};

	const constrain = () => {
		const vv = window.visualViewport;
		const vpHeight = vv ? vv.height : window.innerHeight;
		const vpTop = vv ? vv.offsetTop : 0;

		containerEl.style.setProperty("--ccp-vp-height", `${vpHeight}px`);
		containerEl.style.setProperty("--ccp-vp-top", `${vpTop}px`);
		containerEl.addClass("ccp-keyboard-constrained");
	};

	const reset = () => {
		containerEl.removeClass("ccp-keyboard-constrained");
		containerEl.style.removeProperty("--ccp-vp-height");
		containerEl.style.removeProperty("--ccp-vp-top");
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
	let focusTimer: number | null = null;
	const onFocusIn = (e: FocusEvent) => {
		const target = e.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.tagName === "SELECT" ||
				target.isContentEditable)
		) {
			if (focusTimer !== null) activeWindow.clearTimeout(focusTimer);
			focusTimer = activeWindow.setTimeout(constrain, 300);
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
		if (focusTimer !== null) activeWindow.clearTimeout(focusTimer);
		reset();
	};
}
