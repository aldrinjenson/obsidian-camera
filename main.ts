import { App, MarkdownView, Modal, Notice, Plugin } from "obsidian";

export default class ObsidianCamera extends Plugin {
	async onload() {
		console.log("loaded obsidian camera");

		this.addRibbonIcon("camera", "Obsidian Camera", (evt: MouseEvent) => {
			new CameraModal(this.app).open();
		});

		this.addCommand({
			id: "Open camera modal",
			name: "Open camera modal",
			callback: () => {
				new CameraModal(this.app).open();
			},
		});
	}
}

class CameraModal extends Modal {
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
		const recordVideoButton = webCamContainer.createEl("button", {
			text: "Start recording",
		});
		const switchCameraButton = webCamContainer.createEl("button", {
			text: "Switch Camera",
		});
		const snapPhotoButton = webCamContainer.createEl("button", {
			text: "Take a snap",
		});

		const filePicker = webCamContainer.createEl("input", {
			placeholder: "Choose image file from system",
			type: "file",
		});
		filePicker.accept = "image/*";
		filePicker.capture = "camera";
		filePicker.onchange = async () => {
			new Notice(filePicker.files[0].name); // to be removed
			const chosenFile = filePicker.files[0];
			const bufferFile = await chosenFile.arrayBuffer();
			saveFile(bufferFile, true);
		};

		const chunks: BlobPart[] = [];
		let recorder: MediaRecorder = null;
		const chosenFolderPath = "attachments/snaps";

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

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
			await app.vault.createBinary(filePath, file);

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
					audio: true,
				});
			} catch (error) {
				console.log(error);
				new Notice(error);
				return null;
			}
		};

		const cameras = (
			await navigator.mediaDevices.enumerateDevices()
		).filter((d) => d.kind === "videoinput");

		if (cameras.length <= 1) switchCameraButton.style.display = "none";
		let cameraIndex = 0;
		switchCameraButton.onclick = async () => {
			cameraIndex = (cameraIndex + 1) % cameras.length;
			videoStream = await getVideoStream();
		};

		const takepicture = () => {
			const canvas = webCamContainer.createEl("canvas");
			canvas.style.display = "none";
			let width = videoEl.videoWidth;
			let height = videoEl.videoHeight;
			canvas.height = height;
			canvas.width = width;

			canvas.getContext("2d").drawImage(videoEl, 0, 0, width, height);
			canvas.toBlob(async (blob) => {
				const bufferFile = await blob.arrayBuffer();
				saveFile(bufferFile, true);
			}, "image/png");
		};
		let videoStream: MediaStream = null;

		videoStream = await getVideoStream();

		// if (!videoStream) return new Notice("Error in requesting video");
		videoEl.srcObject = videoStream;

		snapPhotoButton.onclick = takepicture;
		recordVideoButton.onclick = async () => {
			switchCameraButton.disabled = true;
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

