import { App, PluginSettingTab, Setting } from "obsidian";
import { t } from "../utils/i18n";
import type SlugifyPlugin from "./main";

export class SlugifySettingTab extends PluginSettingTab {
	private plugin: SlugifyPlugin;

	constructor(app: App, plugin: SlugifyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(t.settingsExcludedFoldersName)
			.setDesc(t.settingsExcludedFoldersDesc)
			.addTextArea((textArea) => {
				textArea
					.setPlaceholder(t.settingsExcludedFoldersPlaceholder)
					.setValue(this.plugin.settings.excludedFolders.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value
							.split("\n")
							.map((line) => line.trim())
							.filter((line) => line.length > 0);
						await this.plugin.saveSettings();
					});
				textArea.inputEl.rows = 6;
				textArea.inputEl.addClass("slugify-settings-textarea");
			});

		new Setting(containerEl)
			.setName(t.settingsSeparatorName)
			.setDesc(t.settingsSeparatorDesc)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("-", "-")
					.addOption("_", "_")
					.setValue(this.plugin.settings.separator)
					.onChange(async (value) => {
						this.plugin.settings.separator = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t.settingsIncludeAttachmentsName)
			.setDesc(t.settingsIncludeAttachmentsDesc)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeAttachments).onChange(async (value) => {
					this.plugin.settings.includeAttachments = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
