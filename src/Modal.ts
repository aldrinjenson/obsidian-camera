import { App, MarkdownView, Modal, Notice } from 'obsidian'
import { CameraPluginSettings } from './SettingsTab';

class CameraModal extends Modal {
  chosenFolderPath: string;
  videoStream: MediaStream = null;
  constructor(app: App, cameraSettings: CameraPluginSettings) {
    super(app);
    this.chosenFolderPath = cameraSettings.chosenFolderPath
  }

  async onOpen() {
    const { contentEl } = this;
    const webCamContainer = contentEl.createDiv();

    const statusMsg = webCamContainer.createEl('span', { text: "Loading.." })
    const videoEl = webCamContainer.createEl("video");
    const buttonsDiv = webCamContainer.createDiv();
    const firstRow = buttonsDiv.createDiv();
    const secondRow = buttonsDiv.createDiv();
    const recordVideoButton = firstRow.createEl("button", {
      text: "Start recording",
    });
    const switchCameraButton = firstRow.createEl("button", {
      text: "Switch Camera",
    });
    const snapPhotoButton = firstRow.createEl("button", {
      text: "Take a snap",
    });
    firstRow.style.display = 'none';
    secondRow.style.display = 'none';

    const filePicker = secondRow.createEl("input", {
      placeholder: "Choose image file from system",
      type: "file",
    });
    filePicker.accept = "image/*,video/*";
    filePicker.capture = "camera"; // back camera by default for mobile screens

    const filePicker2 = secondRow.createEl("input", {
      placeholder: "Choose image file from system",
      type: "file",
    });
    filePicker2.accept = "image/*";
    filePicker2.capture = "camera"; // back camera by default for mobile screens


    videoEl.autoplay = true;
    videoEl.muted = true
    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder = null;
    this.videoStream = null;

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

    this.videoStream = await getVideoStream();
    if (this.videoStream) {
      firstRow.style.display = 'block'
      secondRow.style.display = 'block'
      statusMsg.style.display = "none"
    } else {
      secondRow.style.display = 'block'
      statusMsg.textContent = "Error in loading videostream in your device.."
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

      const filePath = this.chosenFolderPath + "/" + fileName;
      const folderExists =
        app.vault.getAbstractFileByPath(this.chosenFolderPath);
      if (!folderExists) await app.vault.createFolder(this.chosenFolderPath);
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
      this.close(); // closing the modal
    };


    switchCameraButton.onclick = async () => {
    	cameraIndex = (cameraIndex + 1) % cameras.length;
		this.videoStream = null;
        this.videoStream = await navigator.mediaDevices.getUserMedia({video: { deviceId: cameras[cameraIndex].deviceId }, audio: true});
		videoEl.srcObject = this.videoStream;
		videoEl.play();
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

    videoEl.srcObject = this.videoStream;

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
        recorder = new MediaRecorder(this.videoStream, {
          mimeType: "video/webm",
        });
      }

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async (_) => {
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
    this.videoStream?.getTracks().forEach(track => {
      track.stop()
    })
    contentEl.empty();
  }
}

export default CameraModal
