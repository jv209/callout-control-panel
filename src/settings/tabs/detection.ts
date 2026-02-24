/**
 * Tab builder — CSS Type Detection.
 */

import { Platform, Setting, setIcon } from "obsidian";
import type { SettingsTabContext } from "../types";

export function buildDetectionTab(el: HTMLElement, ctx: SettingsTabContext): void {
	const det = ctx.plugin.settings.calloutDetection ?? {
		obsidian: true,
		theme: true,
		snippet: true,
	};

	const onToggle = async (
		key: "obsidian" | "theme" | "snippet",
		value: boolean,
	) => {
		try {
			det[key] = value;
			await ctx.plugin.saveSettings();
			await ctx.plugin.refreshSnippetTypes();
		} catch (e) {
			console.error("Callout Control Panel: detection toggle error", e);
		}
		ctx.refresh();
	};

	new Setting(el)
		.setName("Obsidian")
		.setDesc("Detect callouts defined in Obsidian's built-in stylesheet.")
		.addToggle((t) => {
			t.setValue(det.obsidian);
			t.onChange((v) => onToggle("obsidian", v));
		});

	new Setting(el)
		.setName("Theme")
		.setDesc("Detect callouts defined by the active theme.")
		.addToggle((t) => {
			t.setValue(det.theme);
			t.onChange((v) => onToggle("theme", v));
		});

	new Setting(el)
		.setName("Snippet")
		.setDesc("Detect callouts defined in your enabled CSS snippet files.")
		.addToggle((t) => {
			t.setValue(det.snippet);
			t.onChange((v) => onToggle("snippet", v));
		});

	// Only show the detected-types list when snippet or theme detection is on.
	// (Obsidian built-ins are always available in the modal from BUILTIN_CALLOUT_TYPES.)
	if (!det.snippet && !det.theme) return;

	const count = ctx.plugin.snippetTypes.length;
	const colorWarnCount = ctx.plugin.snippetTypes.filter(
		(st) => st.color.startsWith("var("),
	).length;
	const iconMissingCount = ctx.plugin.snippetTypes.filter(
		(st) => st.iconDefault && st.icon !== "transparent",
	).length;
	const iconInvalidCount = ctx.plugin.snippetTypes.filter(
		(st) => st.iconInvalid,
	).length;
	const totalWarnCount = ctx.plugin.snippetTypes.filter(
		(st) => st.color.startsWith("var(") || (st.iconDefault && st.icon !== "transparent") || st.iconInvalid,
	).length;

	const heading =
		count > 0 ? `Detected types (${count})` : "No custom types detected";
	const desc =
		count > 0
			? "Custom callout types found in your enabled CSS snippets."
			: "No callout definitions were found in your enabled CSS snippet files.";

	const detectedSetting = new Setting(el)
		.setName(heading)
		.setDesc(desc)
		.addExtraButton((btn) => {
			btn
				.setIcon("refresh-cw")
				.setTooltip("Refresh snippets")
				.onClick(async () => {
					await ctx.plugin.refreshSnippetTypes();
					ctx.refresh();
				});
		});

	// "Open snippets folder" uses openWithDefaultApp which is desktop-only
	if (!Platform.isMobile) {
		detectedSetting.addExtraButton((btn) => {
			btn
				.setIcon("folder-open")
				.setTooltip("Open snippets folder")
				.onClick(() => {
					const snippetsPath = `${ctx.app.vault.configDir}/snippets`;
					(
						ctx.app as unknown as {
							openWithDefaultApp(path: string): void;
						}
					).openWithDefaultApp(snippetsPath);
				});
		});
	}

	if (totalWarnCount > 0) {
		const parts: string[] = [];
		if (colorWarnCount > 0) parts.push(`${colorWarnCount} missing color`);
		if (iconMissingCount > 0) parts.push(`${iconMissingCount} missing icon`);
		if (iconInvalidCount > 0) parts.push(`${iconInvalidCount} invalid icon`);
		const warnEl = detectedSetting.nameEl.createSpan({
			cls: "detected-snippet-header-warning",
		});
		setIcon(warnEl, "alert-triangle");
		warnEl.setAttribute("aria-label", parts.join(", "));
	}

	if (count > 0) {
		const detailsEl = el.createEl("details", {
			cls: "detected-snippet-types",
		});
		detailsEl.createEl("summary", {
			text: "Show callouts",
			cls: "detected-snippet-types-summary",
		});

		// Table header
		const headerEl = detailsEl.createDiv({
			cls: "detected-snippet-type-row detected-snippet-type-header",
		});
		headerEl.createSpan({ text: "Icon", cls: "detected-snippet-col-icon" });
		headerEl.createSpan({ text: "Callout", cls: "detected-snippet-col-callout" });
		headerEl.createSpan({ text: "Icon Name", cls: "detected-snippet-col-iconname" });
		headerEl.createSpan({ text: "Color", cls: "detected-snippet-col-color" });
		headerEl.createSpan({ text: "", cls: "detected-snippet-col-status" });

		for (const st of ctx.plugin.snippetTypes) {
			const rowEl = detailsEl.createDiv({ cls: "detected-snippet-type-row" });

			const iconEl = rowEl.createDiv({
				cls: "detected-snippet-col-icon detected-snippet-type-icon",
			});
			if (st.icon === "transparent") {
				setIcon(iconEl, "lucide-eye-off");
				iconEl.style.opacity = "0.35";
			} else {
				setIcon(iconEl, st.icon);
			}
			iconEl.style.setProperty("--callout-color", st.color);

			rowEl.createSpan({ text: st.label, cls: "detected-snippet-col-callout" });

			const iconText = st.icon === "transparent" ? "transparent" : st.iconDefault ? "—" : st.icon;
			const iconNameEl = rowEl.createSpan({
				text: iconText,
				cls: "detected-snippet-col-iconname detected-snippet-type-meta",
			});
			if (st.iconInvalid) iconNameEl.addClass("detected-snippet-type-invalid");

			const colorText = st.color.startsWith("var(")
				? "—"
				: `rgb(${st.color})`;
			rowEl.createSpan({
				text: colorText,
				cls: "detected-snippet-col-color detected-snippet-type-meta",
			});

			const statusEl = rowEl.createDiv({ cls: "detected-snippet-col-status" });
			const missingColor = st.color.startsWith("var(");
			const missingIcon = st.iconDefault === true && st.icon !== "transparent";
			const invalidIcon = st.iconInvalid === true;
			if (missingColor || missingIcon || invalidIcon) {
				const reasons: string[] = [];
				if (missingColor) reasons.push("no --callout-color");
				if (missingIcon) reasons.push("no --callout-icon");
				if (invalidIcon) reasons.push(`unknown icon "${st.icon}"`);
				const warnEl = statusEl.createDiv({
					cls: "detected-snippet-type-warning",
				});
				setIcon(warnEl, "alert-triangle");
				warnEl.setAttribute("aria-label", reasons.join(", "));
			}
		}
	}

	if (ctx.plugin.snippetWarnings.length > 0) {
		const warnBlock = el.createDiv({ cls: "detected-snippet-warnings" });
		const warnHeader = warnBlock.createDiv({
			cls: "detected-snippet-warnings-header",
		});
		const warnIcon = warnHeader.createDiv({
			cls: "detected-snippet-warnings-icon",
		});
		setIcon(warnIcon, "alert-triangle");
		warnHeader.createSpan({
			text: "Some snippet files contain malformed callout definitions",
		});
		const warnList = warnBlock.createEl("ul");
		for (const w of ctx.plugin.snippetWarnings) {
			warnList.createEl("li", {
				text: `${w.file} — ${w.malformedCount} malformed ${
					w.malformedCount === 1 ? "entry" : "entries"
				}`,
			});
		}
	}
}
