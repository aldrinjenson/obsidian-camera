import { App, MarkdownView, Modal, Notice, Plugin } from "obsidian";

export default class ObsidianCamera extends Plugin {
	async onload() {
		this.addRibbonIcon("camera", "Obsidian Camera", (evt: MouseEvent) => {
			new CameraModal(this.app).open();
		});

		this.addCommand({
			id: "Open camera modal",
			name: "Open camera modal / File Picker",
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
		const { contentEl } = this;
		const webCamContainer = contentEl.createDiv();
		// const pText = webCamContainer.createEl('p', { text: 'getVideoStream not yet supported on this device.' });
		// pText.style.display = 'none'
		const videoEl = webCamContainer.createEl("video");
		videoEl.autoplay = true;
		videoEl.muted = true
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
		filePicker.accept = "image/*,video/*";
		filePicker.capture = "camera"; // back camera by default for mobile screens

		const filePicker2 = webCamContainer.createEl("input", {
			placeholder: "Choose image file from system",
			type: "file",
		});
		filePicker2.accept = "image/*";
		filePicker2.capture = "camera"; // back camera by default for mobile screens
		// filePicker2.style.display = 'none'


		const chosenFolderPath = "attachments/snaps";
		const chunks: BlobPart[] = [];
		let recorder: MediaRecorder = null;
		let videoStream: MediaStream = null;

		const cameras = (
			await navigator.mediaDevices.enumerateDevices()
		).filter((d) => d.kind === "videoinput");

		if (cameras.length <= 1) switchCameraButton.style.display = "none";
		let cameraIndex = 0;

		const getVideoStream = async () => {
			try {
				return await navigator.mediaDevices.getUserMedia({
					video: { deviceId: cameras[cameraIndex].deviceId },
					audio: true,
				});
			} catch (error) {
				console.log(error);
				return null;
			}
		};

		videoStream = await getVideoStream();
		if (!videoStream) {
			videoEl.style.display = 'none'
			// pText.style.display = 'block'
			snapPhotoButton.style.display = 'none'
			recordVideoButton.style.display = 'none'
			switchCameraButton.style.display = 'none'
			filePicker2.style.display = 'block'
		}

		const handleImageSelectChange = async (file: File) => {
			const chosenFile = file;
			const bufferFile = await chosenFile.arrayBuffer();
			saveFile(bufferFile, false, chosenFile.name.split(' ').join('-'));
		};
		filePicker.onchange = () => handleImageSelectChange(filePicker.files[0])
		filePicker2.onchange = () => handleImageSelectChange(filePicker2.files[0])


		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		const saveFile = async (file: ArrayBuffer, isImage = false, fileName = '') => {
			if (!fileName) {
				const dateString = (new Date() + "")
					.slice(4, 28)
					.split(" ")
					.join("_")
					.split(":")
					.join("-");
				fileName = isImage
					? `image_${dateString}.png`
					: `video_${dateString}.webm`;
			}
			if (!isImage) new Notice("Adding video to vault...")

			const filePath = chosenFolderPath + "/" + fileName;
			const folderExists =
				app.vault.getAbstractFileByPath(chosenFolderPath);
			if (!folderExists) await app.vault.createFolder(chosenFolderPath);
			const fileExists =
				app.vault.getAbstractFileByPath(filePath);
			if (!fileExists)
				await app.vault.createBinary(filePath, file);

			if (!view) return new Notice(`Saved to ${filePath}`);

			const cursor = view.editor.getCursor();
			view.editor.replaceRange(
				isImage
					? `![${fileName}](${filePath})\n`
					: `\n![[${filePath}]]\n`,
				cursor
			);
			videoStream && videoStream.getTracks().forEach((track) => {
				track.stop();
			});
			this.close(); // closing the modal
		};


		switchCameraButton.onclick = async () => {
			cameraIndex = (cameraIndex + 1) % cameras.length;
			videoStream = await getVideoStream();
		};

		snapPhotoButton.onclick = () => {
			const canvas = webCamContainer.createEl("canvas");
			canvas.style.display = "none";
			const { videoHeight, videoWidth } = videoEl
			canvas.height = videoHeight;
			canvas.width = videoWidth;

			canvas.getContext("2d").drawImage(videoEl, 0, 0, videoWidth, videoHeight);
			canvas.toBlob(async (blob) => {
				const bufferFile = await blob.arrayBuffer();
				saveFile(bufferFile, true);
			}, "image/png");
		};

		videoEl.srcObject = videoStream;

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


	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

