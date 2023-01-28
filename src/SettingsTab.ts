import ObsidianCamera from "main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface CameraPluginSettings {
	chosenFolderPath: string;
}

export const DEFAULT_SETTINGS: CameraPluginSettings = {
	chosenFolderPath: "attachments/snaps",
};

export default class CameraSettingsTab extends PluginSettingTab {
	plugin: ObsidianCamera;

	constructor(app: App, plugin: ObsidianCamera) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Obsidian-Camera settings" });

		new Setting(containerEl)
			.setName("Folder Path")
			.setDesc("Folder where the videos and snaps should be saved")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.chosenFolderPath)
					.onChange(async (value) => {
						console.log("Chosen Folder Path: " + value);
						this.plugin.settings.chosenFolderPath = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
