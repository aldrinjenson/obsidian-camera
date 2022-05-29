import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	FileManager,
	FileSystemAdapter,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		console.log("loaded obsidian camera");

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"camera",
			"Sample Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("This is a notice!");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		let fileLink = "";
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				// editor.replaceRange(fileLink, editor.getCursor());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		console.log("camera unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {

		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia()) {
			alert("getUserMedia() is not supported by your browser");
			return;
		}

		const { contentEl } = this;

		const webCamContainer = contentEl.createDiv();
		const videoEl = webCamContainer.createEl("video");
		const snapButton = webCamContainer.createEl("button", "snap");
		snapButton.innerText = "Snap photo";
		const recordVidButton = webCamContainer.createEl("button", "record");
		recordVidButton.innerText = "Record video";

		let videoStream: MediaStream;
		let chunks: BlobPart[] = [];
		let isRecording: Boolean = false;
		let chosenFolderPath = 'attachments/videos'

		let thisModal = this
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		snapButton.onclick = () => {
			isRecording = !isRecording;
			snapButton.innerText = "Recording..";

			const recorder = new MediaRecorder(videoStream, {
				mimeType: "video/webm",
			});

			recorder.onstop = function (e) {
				videoStream.getTracks().forEach((track) => {
					track.stop();
				})
				var blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
				blob.arrayBuffer()
					.then((b) => {
						const fileName = [
							"video_",
							(new Date() + "").slice(4, 28).split(' ').join('_').split(':').join('-'),
							".webm",
						].join("");
						const filePath = chosenFolderPath + '/' + fileName
						console.log({ filePath })
						console.log({ fileName })

						// app.vault.createFolder(chosenFolderPath)
						app.vault.createBinary(filePath, b)
						thisModal.close()

						if (view) {
							const cursor = view.editor.getCursor();
							view.editor.replaceRange(`\n![[${filePath}]]`, cursor);
							new Notice("Video Saved")
						}
					})
					.catch((e) => console.log("error in createion: " + e));
			};

			if (!videoStream) return;

			recorder.start();

			setTimeout(() => {
				snapButton.innerText = "Record";
				recorder.ondataavailable = (e) => chunks.push(e.data);

				recorder.stop();
				console.log("stopping recording");
			}, 3000);
		};

		videoEl.autoplay = true;
		videoEl.id = "videoEl";
		const constraints = {
			video: true,
			audio: true,
		};

		// const video = document.querySelector("video");

		navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
			console.log({ stream });
			videoStream = stream;
			videoEl.srcObject = stream;
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
