/**
 * Settings tab — callout type management UI.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * Contains:
 * - Settings tab (AdmonitionSetting) with import/export, add new, type listing
 * - SettingsModal for creating/editing individual callout types
 *
 * NOTE: References a plugin interface. When adapting, replace SettingsPluginRef
 * with your own plugin class, or wire it up in your main.ts.
 */

import {
    PluginSettingTab,
    Setting,
    App,
    ButtonComponent,
    Modal,
    TextComponent,
    Notice,
    setIcon,
    Platform,
    TextAreaComponent
} from "obsidian";
import {
    Admonition,
    AdmonitionIconDefinition,
    AdmonitionIconName,
    AdmonitionIconType
} from "./@types";
import {
    ADD_COMMAND_NAME,
    REMOVE_COMMAND_NAME,
    SPIN_ICON_NAME,
    WARNING_ICON_NAME
} from "./util/constants";
import { IconSuggestionModal } from "./modal";
import { t } from "./lang/helpers";
import { confirmWithModal } from "./modal/confirm";
import { DownloadableIconPack, DownloadableIcons } from "./icons/packs";
import { AdmonitionValidator } from "./util/validator";
import Export from "./modal/export";
import { hexToRgb, rgbToHex } from "./util/color";
import CalloutManager from "./callout/manager";
import { IconManager } from "./icons/manager";

/**
 * Minimum plugin surface area needed by the settings tab.
 * When building your plugin, have your main plugin class implement this
 * or pass the plugin directly.
 */
export interface SettingsPluginRef {
    app: App;
    data: {
        userAdmonitions: Record<string, Admonition>;
        copyButton: boolean;
        autoCollapse: boolean;
        defaultCollapseType: "open" | "closed";
        injectColor: boolean;
        parseTitles: boolean;
        dropShadow: boolean;
        hideEmpty: boolean;
        useSnippet: boolean;
        snippetPath: string;
        syntaxHighlight: boolean;
        icons: Array<DownloadableIconPack>;
        useFontAwesome: boolean;
        open: {
            admonitions: boolean;
            icons: boolean;
            other: boolean;
            advanced: boolean;
        };
    };
    admonitions: Record<string, Admonition>;
    iconManager: IconManager;
    calloutManager: CalloutManager;
    saveSettings(): Promise<void>;
    addAdmonition(admonition: Admonition): Promise<void>;
    removeAdmonition(admonition: Admonition): Promise<void>;
    registerCommandsFor(admonition: Admonition): void;
    unregisterCommandsFor(admonition: Admonition): void;
    registerType(type: string): void;
    unregisterType(admonition: Admonition): void;
    /** Builds an admonition preview element for the settings UI. */
    getAdmonitionElement(
        type: string,
        title: string,
        icon: AdmonitionIconDefinition,
        color?: string
    ): HTMLElement;
}

export default class AdmonitionSetting extends PluginSettingTab {
    additionalEl: HTMLDivElement;
    constructor(app: App, public plugin: SettingsPluginRef) {
        super(app, plugin as any);
    }
    async display(): Promise<void> {
        this.containerEl.empty();
        this.containerEl.addClass("admonition-settings");
        this.containerEl.createEl("h2", { text: t("Admonition Settings") });

        const admonitionEl = this.containerEl.createDiv(
            "admonitions-nested-settings"
        );
        if (!Platform.isMobile) {
            new Setting(admonitionEl)
                .setName("Export Custom Types as CSS")
                .setDesc("Export a CSS snippet for custom callout types.")
                .addButton((b) =>
                    b
                        .setIcon("download")
                        .onClick(() => {
                            const file = new Blob(
                                [
                                    this.plugin.calloutManager.generateCssString()
                                ],
                                { type: "text/css" }
                            );
                            createEl("a", {
                                attr: {
                                    download: "custom_callouts.css",
                                    href: URL.createObjectURL(file)
                                }
                            }).click();
                        })
                        .setDisabled(
                            !Object.keys(this.plugin.data.userAdmonitions)
                                .length
                        )
                );
        }

        new Setting(admonitionEl)
            .setName("Export Custom Types as JSON")
            .setDesc(
                "Choose custom types to export as a JSON file that you can then share with other users."
            )
            .addButton((b) =>
                b
                    .setButtonText("Download All")
                    .setCta()
                    .onClick(() => {
                        const admonitions = Object.values(
                            this.plugin.data.userAdmonitions
                        );
                        this.download(admonitions);
                    })
            )
            .addButton((b) =>
                b.setButtonText("Select & Download").onClick(() => {
                    const modal = new Export(this.plugin);
                    modal.onClose = () => {
                        if (!modal.export) return;
                        const admonitions = Object.values(
                            this.plugin.data.userAdmonitions
                        );
                        this.download(
                            admonitions.filter((a) =>
                                modal.selectedAdmonitions.includes(a.type)
                            )
                        );
                    };
                    modal.open();
                })
            );

        new Setting(admonitionEl)
            .setName("Use CSS Snippet for Custom Callouts")
            .setDesc(
                "Instead of managing it internally, the plugin will maintain a CSS snippet to enable your custom types for callouts."
            )
            .addToggle((t) =>
                t.setValue(this.plugin.data.useSnippet).onChange((v) => {
                    this.plugin.data.useSnippet = v;
                    this.plugin.saveSettings();
                    this.plugin.calloutManager.setUseSnippet();
                })
            );

        new Setting(admonitionEl)
            .setName(t("Add New"))
            .setDesc(
                "Add a new callout type. All custom types will also be usable as callouts."
            )
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip(t("Add Additional"))
                    .setButtonText("+")
                    .onClick(async () => {
                        let modal = new SettingsModal(this.plugin);

                        modal.onClose = async () => {
                            if (modal.saved) {
                                const admonition = {
                                    type: modal.type,
                                    color: modal.color,
                                    icon: modal.icon,
                                    command: false,
                                    title: modal.title,
                                    injectColor: modal.injectColor,
                                    noTitle: modal.noTitle,
                                    copy: modal.copy
                                };
                                await this.plugin.addAdmonition(admonition);
                                this.display();
                            }
                        };

                        modal.open();
                    });

                return b;
            });
        new Setting(admonitionEl)
            .setName("Import Callout Type(s)")
            .setDesc("Import callout types from a JSON definition.")
            .addButton((b) => {
                const input = createEl("input", {
                    attr: {
                        type: "file",
                        name: "merge",
                        accept: ".json",
                        multiple: true,
                        style: "display: none;"
                    }
                });
                input.onchange = async () => {
                    const { files } = input;

                    if (!files.length) return;
                    try {
                        const data: Admonition[][] | Admonition[] = [];
                        for (let file of Array.from(files)) {
                            data.push(JSON.parse(await file.text()));
                        }
                        for (const item of data.flat()) {
                            if (typeof item != "object") continue;

                            if (!item.icon) {
                                item.icon = {
                                    name: "pencil-alt",
                                    type: "font-awesome"
                                };
                            }
                            const valid = AdmonitionValidator.validateImport(
                                this.plugin,
                                item
                            );
                            if (valid.success == false) {
                                new Notice(
                                    createFragment((e) => {
                                        e.createSpan({
                                            text: `There was an issue importing the ${item.type} type:`
                                        });
                                        e.createEl("br");
                                        e.createSpan({ text: valid.message });
                                    })
                                );
                                continue;
                            }
                            if (valid.messages?.length) {
                                new Notice(
                                    createFragment((e) => {
                                        e.createSpan({
                                            text: `There was an issue importing the ${item.type} type:`
                                        });
                                        for (const message of valid.messages) {
                                            e.createEl("br");
                                            e.createSpan({ text: message });
                                        }
                                    })
                                );
                            }
                            await this.plugin.addAdmonition(item);
                        }
                        this.display();
                    } catch (e) {
                        new Notice(
                            `There was an error while importing the type${
                                files.length == 1 ? "" : "s"
                            }.`
                        );
                        console.error(e);
                    }

                    input.value = null;
                };
                b.setButtonText("Choose Files");
                b.buttonEl.appendChild(input);
                b.onClick(() => input.click());
            })
            .addExtraButton((b) =>
                b.setIcon("info").onClick(() => {
                    const modal = new Modal(this.plugin.app);
                    modal.onOpen = () => {
                        modal.contentEl.createSpan({
                            text: "Import one or more callout type definitions as a JSON array. A definition should look as follows at minimum:"
                        });
                        modal.contentEl.createEl("br");
                        const textarea = new TextAreaComponent(
                            modal.contentEl.createDiv()
                        )
                            .setDisabled(true)
                            .setValue(
                                JSON.stringify(
                                    {
                                        type: "embed-affliction",
                                        color: "149, 214, 148",
                                        icon: {
                                            name: "head-side-cough",
                                            type: "font-awesome"
                                        }
                                    },
                                    null,
                                    4
                                )
                            );
                        textarea.inputEl.setAttribute(
                            "style",
                            `height: ${textarea.inputEl.scrollHeight}px; resize: none;`
                        );
                    };
                    modal.open();
                })
            );
        this.additionalEl = admonitionEl.createDiv("additional");
        this.buildTypes();

        this.buildAdmonitions(
            this.containerEl.createEl("details", {
                cls: "admonitions-nested-settings",
                attr: {
                    ...(this.plugin.data.open.admonitions ? { open: true } : {})
                }
            })
        );
        this.buildIcons(
            this.containerEl.createEl("details", {
                cls: "admonitions-nested-settings",
                attr: {
                    ...(this.plugin.data.open.icons ? { open: true } : {})
                }
            })
        );
    }
    download(admonitions: Admonition[]) {
        if (!admonitions.length) {
            new Notice("At least one type must be chosen to export.");
            return;
        }
        const link = createEl("a");
        const file = new Blob([JSON.stringify(admonitions)], {
            type: "json"
        });
        const url = URL.createObjectURL(file);
        link.href = url;
        link.download = `callout-types.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
    buildAdmonitions(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        containerEl.ontoggle = () => {
            this.plugin.data.open.admonitions = containerEl.open;
            this.plugin.saveSettings();
        };
        const summary = containerEl.createEl("summary");
        new Setting(summary).setHeading().setName("Callout Settings");
        summary.createDiv("collapser").createDiv("handle");

        new Setting(containerEl)
            .setName("Add Drop Shadow")
            .setDesc("A drop shadow will be added to callouts.")
            .addToggle((t) => {
                t.setValue(this.plugin.data.dropShadow).onChange(async (v) => {
                    this.plugin.data.dropShadow = v;
                    this.display();
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName(t("Collapsible by Default"))
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "All callouts will be collapsible by default. Use "
                    });
                    e.createEl("code", { text: "collapse: none" });
                    e.createSpan({ text: t(" to prevent.") });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.autoCollapse).onChange(
                    async (v) => {
                        this.plugin.data.autoCollapse = v;
                        this.display();
                        await this.plugin.saveSettings();
                    }
                );
            });

        if (this.plugin.data.autoCollapse) {
            new Setting(containerEl)
                .setName(t("Default Collapse Type"))
                .setDesc(
                    "Collapsible callouts will be either opened or closed."
                )
                .addDropdown((d) => {
                    d.addOption("open", "open");
                    d.addOption("closed", "closed");
                    d.setValue(this.plugin.data.defaultCollapseType);
                    d.onChange(async (v: "open" | "closed") => {
                        this.plugin.data.defaultCollapseType = v;
                        await this.plugin.saveSettings();
                    });
                });
        }
        new Setting(containerEl)
            .setName(t("Add Copy Button"))
            .setDesc("Add a 'copy content' button to callouts.")
            .addToggle((t) => {
                t.setValue(this.plugin.data.copyButton);
                t.onChange(async (v) => {
                    this.plugin.data.copyButton = v;

                    if (!v) {
                        document
                            .querySelectorAll(".admonition-content-copy")
                            .forEach((el) => {
                                el.detach();
                            });
                    }

                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Set Callout Colors")
            .setDesc(
                "Disable this setting to turn off callout coloring by default. Can be overridden per type."
            )
            .addToggle((t) =>
                t
                    .setValue(this.plugin.data.injectColor)
                    .setTooltip(
                        `${
                            this.plugin.data.injectColor ? "Disable" : "Enable"
                        } Callout Color`
                    )
                    .onChange(async (v) => {
                        this.plugin.data.injectColor = v;
                        await this.plugin.saveSettings();
                        await this.buildTypes();
                    })
            );
        new Setting(containerEl)
            .setName("Hide Empty Callouts")
            .setDesc(
                "Any callout that does not have content inside it will be hidden."
            )
            .addToggle((t) =>
                t.setValue(this.plugin.data.hideEmpty).onChange(async (v) => {
                    this.plugin.data.hideEmpty = v;
                    await this.plugin.saveSettings();
                    await this.buildTypes();
                })
            );
    }

    buildIcons(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        containerEl.ontoggle = () => {
            this.plugin.data.open.icons = containerEl.open;
            this.plugin.saveSettings();
        };
        const summary = containerEl.createEl("summary");
        new Setting(summary).setHeading().setName("Icon Packs");
        summary.createDiv("collapser").createDiv("handle");

        new Setting(containerEl)
            .setName("Use Font Awesome Icons")
            .setDesc(
                "Font Awesome Free icons will be available in the icon picker."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.useFontAwesome).onChange((v) => {
                    this.plugin.data.useFontAwesome = v;
                    this.plugin.iconManager.setIconDefinitions();
                    this.plugin.saveSettings();
                });
            });

        let selected: DownloadableIconPack;
        const possibilities = Object.entries(DownloadableIcons).filter(
            ([icon]) =>
                !this.plugin.data.icons.includes(icon as DownloadableIconPack)
        );
        new Setting(containerEl)
            .setName("Load Additional Icons")
            .setDesc(
                "Load an additional icon pack. This requires an internet connection."
            )
            .addDropdown((d) => {
                if (!possibilities.length) {
                    d.setDisabled(true);
                    return;
                }
                for (const [icon, display] of possibilities) {
                    d.addOption(icon, display);
                }
                d.onChange((v: DownloadableIconPack) => (selected = v));
                selected = d.getValue() as DownloadableIconPack;
            })
            .addExtraButton((b) => {
                b.setIcon("plus-with-circle")
                    .setTooltip("Load")
                    .onClick(async () => {
                        if (!selected || !selected.length) return;
                        await this.plugin.iconManager.downloadIcon(selected);
                        this.buildIcons(containerEl);
                    });
                if (!possibilities.length) b.setDisabled(true);
            });

        const iconsEl = containerEl.createDiv("admonitions-nested-settings");
        new Setting(iconsEl);
        for (const icon of this.plugin.data.icons) {
            new Setting(iconsEl)
                .setName(DownloadableIcons[icon])
                .addExtraButton((b) => {
                    b.setIcon("reset")
                        .setTooltip("Redownload")
                        .onClick(async () => {
                            await this.plugin.iconManager.removeIcon(icon);
                            await this.plugin.iconManager.downloadIcon(icon);
                            this.buildIcons(containerEl);
                        });
                })
                .addExtraButton((b) => {
                    b.setIcon("trash").onClick(async () => {
                        if (
                            Object.values(
                                this.plugin.data.userAdmonitions
                            ).find((admonition) => admonition.icon.type == icon)
                        ) {
                            if (
                                !(await confirmWithModal(
                                    this.plugin.app,
                                    "You have types using icons from this pack. Are you sure you want to remove it?"
                                ))
                            )
                                return;
                        }
                        await this.plugin.iconManager.removeIcon(icon);
                        this.buildIcons(containerEl);
                    });
                });
        }
    }

    buildTypes() {
        this.additionalEl.empty();
        for (const admonition of Object.values(
            this.plugin.data.userAdmonitions
        )) {
            let setting = new Setting(this.additionalEl);

            let admonitionElement = this.plugin.getAdmonitionElement(
                admonition.type,
                admonition.type[0].toUpperCase() +
                    admonition.type.slice(1).toLowerCase(),
                admonition.icon,
                admonition.injectColor ?? this.plugin.data.injectColor
                    ? admonition.color
                    : null
            );
            setting.infoEl.replaceWith(admonitionElement);

            if (!admonition.command) {
                setting.addExtraButton((b) => {
                    b.setIcon(ADD_COMMAND_NAME.toString())
                        .setTooltip(t("Register Commands"))
                        .onClick(async () => {
                            this.plugin.registerCommandsFor(admonition);
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
            } else {
                setting.addExtraButton((b) => {
                    b.setIcon(REMOVE_COMMAND_NAME.toString())
                        .setTooltip(t("Unregister Commands"))
                        .onClick(async () => {
                            this.plugin.unregisterCommandsFor(admonition);
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
            }

            setting
                .addExtraButton((b) => {
                    b.setIcon("pencil")
                        .setTooltip(t("Edit"))
                        .onClick(() => {
                            let modal = new SettingsModal(
                                this.plugin,
                                admonition
                            );

                            modal.onClose = async () => {
                                if (modal.saved) {
                                    const hasCommand = admonition.command;
                                    const modalAdmonition = {
                                        type: modal.type,
                                        color: modal.color,
                                        icon: modal.icon,
                                        command: hasCommand,
                                        title: modal.title,
                                        injectColor: modal.injectColor,
                                        noTitle: modal.noTitle,
                                        copy: modal.copy
                                    };

                                    if (
                                        modalAdmonition.type != admonition.type
                                    ) {
                                        this.plugin.unregisterType(admonition);

                                        const existing: [string, Admonition][] =
                                            Object.entries(
                                                this.plugin.data.userAdmonitions
                                            );

                                        this.plugin.data.userAdmonitions =
                                            Object.fromEntries(
                                                existing.map(([type, def]) => {
                                                    if (
                                                        type == admonition.type
                                                    ) {
                                                        return [
                                                            modalAdmonition.type,
                                                            modalAdmonition
                                                        ];
                                                    }
                                                    return [type, def];
                                                })
                                            );
                                    } else {
                                        this.plugin.data.userAdmonitions[
                                            modalAdmonition.type
                                        ] = modalAdmonition;
                                    }

                                    this.plugin.registerType(
                                        modalAdmonition.type
                                    );
                                    this.plugin.calloutManager.addAdmonition(
                                        modalAdmonition
                                    );
                                    await this.plugin.saveSettings();
                                    this.display();
                                }
                            };

                            modal.open();
                        });
                })
                .addExtraButton((b) => {
                    b.setIcon("trash")
                        .setTooltip(t("Delete"))
                        .onClick(() => {
                            this.plugin.removeAdmonition(admonition);
                            this.display();
                        });
                });
        }
    }
}

class SettingsModal extends Modal {
    color: string = "#7d7d7d";
    icon: AdmonitionIconDefinition = {};
    type: string;
    saved: boolean = false;
    error: boolean = false;
    title: string;
    injectColor: boolean = this.plugin.data.injectColor;
    noTitle: boolean = false;
    admonitionPreviewParent: HTMLElement;
    admonitionPreview: HTMLElement;
    copy: boolean;
    originalType: string;
    editing = false;
    constructor(public plugin: SettingsPluginRef, admonition?: Admonition) {
        super(plugin.app);
        if (admonition) {
            this.editing = true;
            this.color = admonition.color;
            this.icon = admonition.icon;
            this.type = admonition.type;
            this.originalType = admonition.type;
            this.title = admonition.title;
            this.injectColor = admonition.injectColor ?? this.injectColor;
            this.noTitle = admonition.noTitle ?? false;
            this.copy = admonition.copy ?? this.plugin.data.copyButton;
        }
    }

    setAdmonitionElement(title: string) {
        this.admonitionPreviewParent.empty();
        this.admonitionPreview = this.plugin.getAdmonitionElement(
            this.type,
            title[0].toUpperCase() + title.slice(1).toLowerCase(),
            this.icon,
            this.injectColor ?? this.plugin.data.injectColor ? this.color : null
        );
        this.admonitionPreview
            .createDiv("callout-content admonition-content")
            .createEl("p", {
                text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla et euismod nulla."
            });
        this.admonitionPreviewParent.appendChild(this.admonitionPreview);
    }
    async display() {
        this.containerEl.addClass("admonition-settings-modal");
        this.titleEl.setText(`${this.editing ? "Edit" : "Add"} Callout Type`);
        let { contentEl } = this;

        contentEl.empty();

        const settingDiv = contentEl.createDiv();
        const title = this.title ?? this.type ?? "...";

        this.admonitionPreviewParent = contentEl.createDiv();
        this.setAdmonitionElement(
            title[0].toUpperCase() + title.slice(1).toLowerCase()
        );

        let typeText: TextComponent;
        const typeSetting = new Setting(settingDiv)
            .setName(t("Admonition Type"))
            .addText((text) => {
                typeText = text;
                typeText.setValue(this.type).onChange((v) => {
                    const valid = AdmonitionValidator.validateType(
                        v,
                        this.plugin,
                        this.originalType
                    );
                    if (valid.success == false) {
                        SettingsModal.setValidationError(
                            text.inputEl,
                            valid.message
                        );
                        return;
                    }

                    SettingsModal.removeValidationError(text.inputEl);

                    this.type = v;
                    if (!this.title)
                        this.setAdmonitionElement(
                            this.type?.[0].toUpperCase() +
                                this.type?.slice(1).toLowerCase()
                        );
                });
            });
        typeSetting.controlEl.addClass("admonition-type-setting");

        typeSetting.descEl.createSpan({
            text: "This is used to create the callout type (e.g.,  "
        });
        typeSetting.descEl.createEl("code", { text: "note" });
        typeSetting.descEl.createSpan({ text: " or " });
        typeSetting.descEl.createEl("code", { text: "abstract" });
        typeSetting.descEl.createSpan({ text: ")" });

        new Setting(settingDiv)
            .setName(t("Admonition Title"))
            .setDesc(
                t("This will be the default title for this admonition type.")
            )
            .addText((text) => {
                text.setValue(this.title).onChange((v) => {
                    if (!v.length) {
                        this.title = null;
                        this.setAdmonitionElement(
                            this.type?.[0].toUpperCase() +
                                title.slice(1).toLowerCase()
                        );
                        return;
                    }

                    this.title = v;
                    this.setAdmonitionElement(this.title);
                });
            });
        new Setting(settingDiv)
            .setName(t("No Admonition Title by Default"))
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: t("The admonition will have no title unless ")
                    });
                    e.createEl("code", { text: "title" });
                    e.createSpan({ text: t(" is explicitly provided.") });
                })
            )
            .addToggle((t) => {
                t.setValue(this.noTitle).onChange((v) => (this.noTitle = v));
            });
        new Setting(settingDiv)
            .setName(t("Show Copy Button"))
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "A copy button will be added to the callout."
                    });
                })
            )
            .addToggle((t) => {
                t.setValue(this.copy).onChange((v) => (this.copy = v));
            });

        const input = createEl("input", {
            attr: {
                type: "file",
                name: "image",
                accept: "image/*"
            }
        });
        let iconText: TextComponent;
        new Setting(settingDiv)
            .setName(t("Admonition Icon"))
            .setDesc("Icon to display next to the title.")
            .addText((text) => {
                iconText = text;
                if (this.icon.type !== "image") text.setValue(this.icon.name);

                const validate = async () => {
                    const v = text.inputEl.value;
                    const valid = AdmonitionValidator.validateIcon(
                        { name: v },
                        this.plugin
                    );
                    if (valid.success == false) {
                        SettingsModal.setValidationError(
                            text.inputEl,
                            valid.message
                        );
                        return;
                    }

                    SettingsModal.removeValidationError(text.inputEl);
                    const ic = this.plugin.iconManager.getIconType(v);
                    this.icon = {
                        name: v as AdmonitionIconName,
                        type: ic as AdmonitionIconType
                    };

                    let iconEl = this.admonitionPreview.querySelector(
                        ".admonition-title-icon"
                    );

                    iconEl.innerHTML =
                        this.plugin.iconManager.getIconNode(this.icon)
                            ?.outerHTML ?? "";
                };

                const modal = new IconSuggestionModal(
                    this.plugin,
                    text,
                    this.plugin.iconManager.iconDefinitions
                );

                modal.onSelect((item) => {
                    text.inputEl.value = item.item.name;
                    validate();
                    modal.close();
                });

                text.inputEl.onblur = validate;
            })
            .addButton((b) => {
                b.setButtonText(t("Upload Image")).setIcon("image-file");
                b.buttonEl.addClass("admonition-file-upload");
                b.buttonEl.appendChild(input);
                b.onClick(() => input.click());
            });

        /** Image Uploader */
        input.onchange = async () => {
            const { files } = input;

            if (!files.length) return;

            const image = files[0];
            const reader = new FileReader();
            reader.onloadend = (evt) => {
                const image = new Image();
                image.onload = () => {
                    try {
                        const canvas = document.createElement("canvas"),
                            max_size = 24;
                        let width = image.width,
                            height = image.height;
                        if (width > height) {
                            if (width > max_size) {
                                height *= max_size / width;
                                width = max_size;
                            }
                        } else {
                            if (height > max_size) {
                                width *= max_size / height;
                                height = max_size;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        canvas
                            .getContext("2d")
                            .drawImage(image, 0, 0, width, height);

                        this.icon = {
                            name: canvas.toDataURL("image/png"),
                            type: "image"
                        };
                        this.display();
                    } catch (e) {
                        new Notice("There was an error parsing the image.");
                    }
                };
                image.src = evt.target.result.toString();
            };
            reader.readAsDataURL(image);

            input.value = null;
        };

        const color = settingDiv.createDiv("admonition-color-settings");
        this.createColor(color);

        let footerEl = contentEl.createDiv();
        let footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => {
            b.setTooltip(t("Save"))
                .setIcon("checkmark")
                .onClick(async () => {
                    const icon = { ...this.icon };
                    if (iconText.inputEl.value?.length) {
                        icon.name = iconText.inputEl.value;
                    }
                    const valid = AdmonitionValidator.validate(
                        this.plugin,
                        typeText.inputEl.value,
                        icon,
                        this.originalType
                    );
                    if (valid.success == false) {
                        SettingsModal.setValidationError(
                            valid.failed == "type"
                                ? typeText.inputEl
                                : iconText.inputEl,
                            valid.message
                        );
                        new Notice("Fix errors before saving.");
                        return;
                    }
                    this.saved = true;
                    this.close();
                });
            return b;
        });
        footerButtons.addExtraButton((b) => {
            b.setIcon("cross")
                .setTooltip("Cancel")
                .onClick(() => {
                    this.saved = false;
                    this.close();
                });
            return b;
        });
    }
    createColor(el: HTMLDivElement) {
        el.empty();
        const desc = this.injectColor
            ? "Set the callout color. Disable to set manually using CSS."
            : "Callout color is disabled and must be manually set using CSS.";
        new Setting(el)
            .setName(t("Color"))
            .setDesc(desc)
            .addText((t) => {
                t.inputEl.setAttribute("type", "color");

                if (!this.injectColor) {
                    t.inputEl.setAttribute("disabled", "true");
                }

                t.setValue(rgbToHex(this.color)).onChange((v) => {
                    let color = hexToRgb(v);
                    if (!color) return;
                    this.color = `${color.r}, ${color.g}, ${color.b}`;
                    this.admonitionPreview.setAttribute(
                        "style",
                        `--callout-color: ${this.color};`
                    );
                });
            })
            .addToggle((t) =>
                t
                    .setValue(this.injectColor)
                    .setTooltip(
                        `${
                            this.injectColor ? "Disable" : "Enable"
                        } Callout Color`
                    )
                    .onChange((v) => {
                        this.injectColor = v;

                        if (!v) {
                            this.admonitionPreview.removeAttribute("style");
                        } else {
                            this.admonitionPreview.setAttribute(
                                "style",
                                `--callout-color: ${this.color};`
                            );
                        }

                        this.createColor(el);
                    })
            );
    }

    onOpen() {
        this.display();
    }

    static setValidationError(textInput: HTMLInputElement, message?: string) {
        textInput.addClass("is-invalid");
        if (message) {
            textInput.parentElement.addClasses([
                "has-invalid-message",
                "unset-align-items"
            ]);
            textInput.parentElement.parentElement.addClass(
                ".unset-align-items"
            );
            let mDiv = textInput.parentElement.querySelector(
                ".invalid-feedback"
            ) as HTMLDivElement;

            if (!mDiv) {
                mDiv = textInput.parentElement.createDiv({
                    cls: "invalid-feedback"
                });
            }
            mDiv.setText(message);
        }
    }
    static removeValidationError(textInput: HTMLInputElement) {
        textInput.removeClass("is-invalid");
        textInput.parentElement.removeClasses([
            "has-invalid-message",
            "unset-align-items"
        ]);
        textInput.parentElement.parentElement.removeClass(".unset-align-items");

        if (textInput.parentElement.querySelector(".invalid-feedback")) {
            textInput.parentElement.removeChild(
                textInput.parentElement.querySelector(".invalid-feedback")
            );
        }
    }
}
