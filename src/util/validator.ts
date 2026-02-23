/**
 * Input validation for callout type creation, editing, and import.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * Changes from the original:
 * - Uses CustomCallout / CalloutIconDefinition instead of Admonition types
 * - Removes the t() i18n dependency (plain English strings)
 * - Strips Admonition-specific boolean fields (command, noTitle, copy)
 *
 * IMPORTANT — saveSettings() bug from Plugin C:
 * The original edit flow in settings.ts modified userAdmonitions and called
 * registerType() but never called saveSettings(). Callers of this validator
 * (e.g. the settings tab) MUST call saveSettings() explicitly after a
 * successful edit.
 */

import type { CustomCallout, CalloutIconDefinition, IconType } from "../types";

/** Minimum plugin surface area needed by the validator. */
export interface ValidatorPluginRef {
	customCallouts: Record<string, CustomCallout>;
	iconManager: {
		getIconType(name: string): IconType | undefined;
		getIconNode(icon: CalloutIconDefinition): Element | undefined;
	};
}

type ValidationSuccess = {
	success: true;
	messages?: string[];
};

type ValidationError = {
	success: false;
	failed: "type" | "icon" | "rgb";
	message: string;
};

type Result = ValidationSuccess | ValidationError;

export const isSelectorValid = ((dummyElement) => (selector: string) => {
	try {
		dummyElement.querySelector(selector);
	} catch {
		return false;
	}
	return true;
})(document.createDocumentFragment());

export class CalloutValidator {
	/**
	 * Validate an imported callout definition.
	 * Checks type, icon, and color. Assigns a random color if missing.
	 */
	static validateImport(
		plugin: ValidatorPluginRef,
		callout: CustomCallout,
	): Result {
		const result: Result = {
			success: true,
			messages: [],
		};

		const validType = CalloutValidator.validateType(
			callout.type,
			plugin,
		);
		if (!validType.success) {
			return validType;
		}

		const iconName = callout.icon?.name ?? null;
		if (iconName) {
			const validIcon = CalloutValidator.validateIcon(
				callout.icon,
				plugin,
			);
			if (!validIcon.success) {
				return validIcon;
			}

			const iconNode = plugin.iconManager.getIconNode(callout.icon);
			if (!iconNode) {
				result.messages!.push(
					`No installed icon found by the name "${iconName}". Perhaps you need to install a new icon pack?`,
				);
			}
		}

		if (
			!("color" in callout) ||
			!/(?:(?:2(?:[0-4]\d|5[0-5])|\d{1,2}|1\d\d)\s*,\s*){2}\s*(?:2(?:[0-4]\d|5[0-5])|\d{1,2}|1\d\d)/.test(
				callout.color,
			)
		) {
			console.warn(
				`No valid color for imported callout "${callout.type}". Assigning a random color.`,
			);
			callout.color = `${Math.floor(Math.random() * 255)}, ${Math.floor(
				Math.random() * 255,
			)}, ${Math.floor(Math.random() * 255)}`;
		}

		return result;
	}

	/** Validate a type + icon pair (used when creating or editing a callout). */
	static validate(
		plugin: ValidatorPluginRef,
		type: string,
		icon: CalloutIconDefinition,
		oldType?: string,
	): Result {
		const validType = CalloutValidator.validateType(
			type,
			plugin,
			oldType,
		);
		if (!validType.success) {
			return validType;
		}

		return CalloutValidator.validateIcon(icon, plugin);
	}

	/** Validate a callout type name (non-empty, no spaces, valid CSS selector, unique). */
	static validateType(
		type: string,
		plugin: ValidatorPluginRef,
		oldType?: string,
	): Result {
		if (!type.length) {
			return {
				success: false,
				message: "Callout type cannot be empty.",
				failed: "type",
			};
		}

		if (type.includes(" ")) {
			return {
				success: false,
				message: "Callout type cannot include spaces.",
				failed: "type",
			};
		}

		if (!isSelectorValid(type)) {
			return {
				success: false,
				message: "Type must be a valid CSS selector.",
				failed: "type",
			};
		}

		if (type !== oldType && type in plugin.customCallouts) {
			return {
				success: false,
				message: "That callout type already exists.",
				failed: "type",
			};
		}

		return { success: true };
	}

	/** Validate an icon definition (non-empty, resolvable by the icon manager). */
	static validateIcon(
		definition: CalloutIconDefinition,
		plugin: ValidatorPluginRef,
	): Result {
		if (definition.type === "image") {
			return { success: true };
		}

		if (!definition.name?.length) {
			return {
				success: false,
				message: "Icon cannot be empty.",
				failed: "icon",
			};
		}

		const icon = plugin.iconManager.getIconType(definition.name);
		if (!icon) {
			return {
				success: false,
				message: "Invalid icon name.",
				failed: "icon",
			};
		}

		return { success: true };
	}
}
