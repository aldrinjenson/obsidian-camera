import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface ObsidianCameraSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ObsidianCameraSettings = {
	mySetting: "default",
};

export default class ObsidianCamera extends Plugin {
	settings: ObsidianCameraSettings;

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
			id: "Open camera modal",
			name: "Open camera modal",
			callback: () => {
				new SampleModal(this.app).open();
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

	async onOpen() {
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia()) {
			return new Notice("getUserMedia() is not supported by your system");
		}

		const { contentEl } = this;
		const webCamContainer = contentEl.createDiv();
		const videoEl = webCamContainer.createEl("video");
		const recordVideoButton = webCamContainer.createEl("button", "snap");
		const canvas = webCamContainer.createEl('canvas')
		canvas.style.display = 'none'
		recordVideoButton.innerText = "Start Recording";
		const snapPhotoButton = webCamContainer.createEl("button", "record");
		snapPhotoButton.innerText = "Take a snap";

		const chunks: BlobPart[] = [];
		let recorder: MediaRecorder = null;
		let chosenFolderPath = "attachments/videos";

		const thisModal = this;
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const width = 200, height = 100


		const saveFile = (fileName: string, file: ArrayBuffer, isImage = false) => {
			const filePath = chosenFolderPath + "/" + fileName;
			const folderExists = app.vault.getAbstractFileByPath(chosenFolderPath)
			if (!folderExists) app.vault.createFolder(chosenFolderPath)
			app.vault.createBinary(filePath, file);
			thisModal.close();

			if (view) {
				const cursor = view.editor.getCursor();

				view.editor.replaceRange(
					isImage ? `![${fileName}](${filePath})\n` :
						`\n![[${filePath}]]\n`,
					cursor
				);
			} else {
				new Notice(`Video Saved to ${filePath}`);
			}
		}

		const takepicture = () => {
			videoEl.style.display = "none";
			// canvas.style.display = "block";
			canvas.width = width;
			canvas.height = height;
			canvas.getContext('2d').drawImage(videoEl, 0, 0, width, height);
			canvas.toBlob(async (blob) => {
				const bufferFile = await blob.arrayBuffer()
				saveFile('tempImg1.png', bufferFile, true)
			}, 'image/png')
		}
		let videoStream: MediaStream = null;
		try {
			videoStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});
		} catch (error) {
			console.log(error);
		}

		if (!videoStream) return new Notice("Error in requesting video");
		videoEl.srcObject = videoStream;

		snapPhotoButton.onclick = takepicture

		recordVideoButton.onclick = async () => {
			let isRecording: Boolean = recorder && recorder.state === 'recording';
			if (isRecording) recorder.stop();
			isRecording = !isRecording;
			recordVideoButton.innerText = isRecording
				? "Stop Recording"
				: "Start Recording";

			if (!recorder) {
				recorder = new MediaRecorder(videoStream, {
					mimeType: "video/webm",
				});
			}


			recorder.ondataavailable = (e) => chunks.push(e.data);
			recorder.onstop = async (e) => {
				videoStream.getTracks().forEach((track) => {
					console.log(track)
					track.stop();
				});
				const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
				const bufferFile = await blob.arrayBuffer()
				const fileName = [
					"video_",
					(new Date() + "")
						.slice(4, 28)
						.split(" ")
						.join("_")
						.split(":")
						.join("-"),
					".webm",
				].join("");
				saveFile(fileName, bufferFile)
			};
			recorder.start();
		};

		videoEl.autoplay = true;
		videoEl.id = "videoEl";
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ObsidianCamera;

	constructor(app: App, plugin: ObsidianCamera) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Video Save Path")
			.setDesc("The folder path to which the videos will be saved")
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
