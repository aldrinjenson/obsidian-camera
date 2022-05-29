import {
	App,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
} from "obsidian";

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
			"Obsidian Camera",
			(evt: MouseEvent) => {
				new SampleModal(this.app).open()
			}
		);
		ribbonIconEl.addClass("my-plugin-ribbon-class"); // for css

		this.addCommand({
			id: "Open camera modal",
			name: "Open camera modal",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	// onunload() {
	// 	console.log("camera unloaded");
	// }

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
		const recordVideoButton = webCamContainer.createEl("button");
		const switchCameraButton = webCamContainer.createEl("button")
		const snapPhotoButton = webCamContainer.createEl("button");
		const canvas = webCamContainer.createEl("canvas");
		canvas.style.display = "none";
		recordVideoButton.innerText = "Start Recording";
		// switchCameraButton.innerText = "Switch Camera";
		snapPhotoButton.innerText = "Take a snap";

		const chunks: BlobPart[] = [];
		let recorder: MediaRecorder = null;
		const chosenFolderPath = "attachments/snaps";



		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const width = 500,
			height = 100;

		const saveFile = async (file: ArrayBuffer, isImage = false) => {
			const dateString = (new Date() + "")
				.slice(4, 28)
				.split(" ")
				.join("_")
				.split(":")
				.join("-");
			const fileName = isImage
				? `image_${dateString}.png`
				: `video_${dateString}.webm`;

			const filePath = chosenFolderPath + "/" + fileName;
			const folderExists =
				app.vault.getAbstractFileByPath(chosenFolderPath);
			if (!folderExists) app.vault.createFolder(chosenFolderPath);
			await app.vault.createBinary(filePath, file)


			if (!view) return new Notice(`Video Saved to ${filePath}`);

			const cursor = view.editor.getCursor();
			view.editor.replaceRange(
				isImage
					? `![${fileName}](${filePath})\n`
					: `\n![[${filePath}]]\n`,
				cursor
			);
			videoStream.getTracks().forEach((track) => {
				track.stop();
			});
			this.close(); // closing the modal
		};

		const getVideoStream = async () => {
			try {
				return await navigator.mediaDevices.getUserMedia({
					video: { deviceId: cameras[cameraIndex].deviceId },
					// video: true,
					audio: true,
				});
			} catch (error) {
				console.log(error);
				new Notice(error)
				return null
			}

		}

		const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput')
		if (cameras.length <= 1) switchCameraButton.style.display = 'none'
		let cameraIndex = 0
		switchCameraButton.onclick = async () => {
			cameraIndex = (cameraIndex + 1) % cameras.length
			console.log(cameras[cameraIndex])
			videoStream = await getVideoStream()
		}

		// console.log(cameras)
		const takepicture = () => {
			videoEl.style.display = "none";
			canvas.getContext("2d").drawImage(videoEl, 0, 0, width, height);
			canvas.toBlob(async (blob) => {
				const bufferFile = await blob.arrayBuffer();
				saveFile(bufferFile, true);
			}, "image/png");
		};
		let videoStream: MediaStream = null;

		videoStream = await getVideoStream()

		// if (!videoStream) return new Notice("Error in requesting video");
		videoEl.srcObject = videoStream;

		snapPhotoButton.onclick = takepicture;
		recordVideoButton.onclick = async () => {
			// switchCameraButton.disabled = true
			let isRecording: boolean =
				recorder && recorder.state === "recording";
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
				const blob = new Blob(chunks, {
					type: "audio/ogg; codecs=opus",
				});
				const bufferFile = await blob.arrayBuffer();
				saveFile(bufferFile, false);
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

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: ObsidianCamera;

// 	constructor(app: App, plugin: ObsidianCamera) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const { containerEl } = this;
// 		containerEl.empty();
// 		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

// 		new Setting(containerEl)
// 			.setName("Video Save Path")
// 			.setDesc("The folder path to which the videos will be saved")
// 			.addText((text) =>
// 				text
// 					.setPlaceholder("Enter your secret")
// 					.setValue(this.plugin.settings.mySetting)
// 					.onChange(async (value) => {
// 						console.log("save path: " + value);
// 						this.plugin.settings.mySetting = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);
// 	}
// }
