import { Plugin } from "obsidian";
import CameraModal from "./Modal";
import SampleSettingTab, { DEFAULT_SETTINGS, MyPluginSettings } from "./SettingsTab";

export default class ObsidianCamera extends Plugin {
  settings: MyPluginSettings;
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("camera", "Obsidian Camera", (evt: MouseEvent) => {
      new CameraModal(this.app).open();
    });
    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.addCommand({
      id: "Open camera modal",
      name: "Open camera modal / File Picker",
      callback: () => {
        new CameraModal(this.app).open();
      },
    });
  }


  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
