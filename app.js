const videoInput = document.getElementById("videoInput");
const videoName = document.getElementById("videoName");
const frameInfo = document.getElementById("frameInfo");
const video = document.getElementById("video");
const seekBar = document.getElementById("seekBar");
const timeLabel = document.getElementById("timeLabel");

const prevFrameBtn = document.getElementById("prevFrameBtn");
const nextFrameBtn = document.getElementById("nextFrameBtn");
const captureBtn = document.getElementById("captureBtn");
const resetViewBtn = document.getElementById("resetViewBtn");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cropBtn = document.getElementById("cropBtn");
const downloadFrameBtn = document.getElementById("downloadFrameBtn");
const downloadCropBtn = document.getElementById("downloadCropBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const selectionInfo = document.getElementById("selectionInfo");

const brightnessRange = document.getElementById("brightnessRange");
const contrastRange = document.getElementById("contrastRange");
const zoomRange = document.getElementById("zoomRange");
const brightnessValue = document.getElementById("brightnessValue");
const contrastValue = document.getElementById("contrastValue");
const zoomValue = document.getElementById("zoomValue");

const FPS_ASSUMED = 30;

let capturedImage = null;
let selection = null;
let isDragging = false;
let dragStart = null;
let currentCropCanvas = null;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateTimeUI() {
  const current = video.currentTime || 0;
  const duration = video.duration || 0;
  timeLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  seekBar.value = duration ? (current / duration) * 100 : 0;
  frameInfo.textContent = `Frame: ${Math.round(current * FPS_ASSUMED)}`;
}

video.addEventListener("loadedmetadata", () => {
  updateTimeUI();
});

video.addEventListener("timeupdate", updateTimeUI);

seekBar.addEventListener("input", () => {
  if (!video.duration) return;
  video.currentTime = (Number(seekBar.value) / 100) * video.duration;
});

videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  video.src = url;
  videoName.textContent = file.name;
  selection = null;
  currentCropCanvas = null;
  selectionInfo.textContent = "Selección: ninguna";
});

prevFrameBtn.addEventListener("click", () => {
  if (!video.src) return;
  video.pause();
  video.currentTime = Math.max(0, video.currentTime - 1 / FPS_ASSUMED);
});

nextFrameBtn.addEventListener("click", () => {
  if (!video.src) return;
  video.pause();
  const maxTime = video.duration || Number.MAX_SAFE_INTEGER;
  video.currentTime = Math.min(maxTime, video.currentTime + 1 / FPS_ASSUMED);
});

captureBtn.addEventListener("click", () => {
  if (!video.videoWidth || !video.videoHeight) return;

  capturedImage = document.createElement("canvas");
  capturedImage.width = video.videoWidth;
  capturedImage.height = video.videoHeight;
  const cctx = capturedImage.getContext("2d");
  cctx.drawImage(video, 0, 0, capturedImage.width, capturedImage.height);

  selection = null;
  currentCropCanvas = null;
  selectionInfo.textContent = "Selección: ninguna";
  redrawCanvas();
});

resetViewBtn.addEventListener("click", () => {
  brightnessRange.value = "1";
  contrastRange.value = "1";
  zoomRange.value = "1";
  brightnessValue.textContent = "1.0";
  contrastValue.textContent = "1.0";
  zoomValue.textContent = "1.0x";
  redrawCanvas();
});

brightnessRange.addEventListener("input", () => {
  brightnessValue.textContent = Number(brightnessRange.value).toFixed(1);
  redrawCanvas();
});

contrastRange.addEventListener("input", () => {
  contrastValue.textContent = Number(contrastRange.value).toFixed(1);
  redrawCanvas();
});

zoomRange.addEventListener("input", () => {
  zoomValue.textContent = `${Number(zoomRange.value).toFixed(1)}x`;
  redrawCanvas();
});

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!capturedImage) {
    ctx.fillStyle = "#0a1120";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const brightness = Number(brightnessRange.value);
  const contrast = Number(contrastRange.value);
  const zoom = Number(zoomRange.value);

  ctx.save();
  ctx.fillStyle = "#02050d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.filter = `brightness(${brightness}) contrast(${contrast})`;

  const sourceWidth = capturedImage.width / zoom;
  const sourceHeight = capturedImage.height / zoom;
  const sourceX = (capturedImage.width - sourceWidth) / 2;
  const sourceY = (capturedImage.height - sourceHeight) / 2;

  ctx.drawImage(
    capturedImage,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  ctx.restore();

  if (selection) {
    ctx.save();
    ctx.strokeStyle = "#ff5f5f";
    ctx.lineWidth = 2;
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    ctx.restore();
  }
}

function getCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener("mousedown", (event) => {
  if (!capturedImage) return;
  isDragging = true;
  dragStart = getCanvasCoords(event);
  selection = {
    x: dragStart.x,
    y: dragStart.y,
    width: 0,
    height: 0
  };
  redrawCanvas();
});

canvas.addEventListener("mousemove", (event) => {
  if (!isDragging || !dragStart) return;

  const current = getCanvasCoords(event);
  const x = Math.min(dragStart.x, current.x);
  const y = Math.min(dragStart.y, current.y);
  const width = Math.abs(current.x - dragStart.x);
  const height = Math.abs(current.y - dragStart.y);

  selection = { x, y, width, height };
  redrawCanvas();
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  dragStart = null;

  if (selection && selection.width > 2 && selection.height > 2) {
    selectionInfo.textContent =
      `Selección: ${Math.round(selection.width)} x ${Math.round(selection.height)} px`;
  } else {
    selection = null;
    selectionInfo.textContent = "Selección: ninguna";
  }

  redrawCanvas();
});

clearSelectionBtn.addEventListener("click", () => {
  selection = null;
  currentCropCanvas = null;
  selectionInfo.textContent = "Selección: ninguna";
  redrawCanvas();
});

function selectionToImageSpace() {
  if (!capturedImage || !selection) return null;

  const zoom = Number(zoomRange.value);
  const sourceWidth = capturedImage.width / zoom;
  const sourceHeight = capturedImage.height / zoom;
  const sourceX = (capturedImage.width - sourceWidth) / 2;
  const sourceY = (capturedImage.height - sourceHeight) / 2;

  const scaleX = sourceWidth / canvas.width;
  const scaleY = sourceHeight / canvas.height;

  const imgX = sourceX + selection.x * scaleX;
  const imgY = sourceY + selection.y * scaleY;
  const imgW = selection.width * scaleX;
  const imgH = selection.height * scaleY;

  return {
    x: Math.max(0, Math.round(imgX)),
    y: Math.max(0, Math.round(imgY)),
    width: Math.max(1, Math.round(imgW)),
    height: Math.max(1, Math.round(imgH))
  };
}

cropBtn.addEventListener("click", () => {
  if (!capturedImage || !selection) return;

  const cropArea = selectionToImageSpace();
  if (!cropArea) return;

  const temp = document.createElement("canvas");
  temp.width = cropArea.width;
  temp.height = cropArea.height;
  const tctx = temp.getContext("2d");

  tctx.drawImage(
    capturedImage,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    temp.width,
    temp.height
  );

  currentCropCanvas = temp;
  selectionInfo.textContent =
    `Recorte listo: ${cropArea.width} x ${cropArea.height} px`;
});

function downloadCanvasData(sourceCanvas, filename) {
  if (!sourceCanvas) return;
  const link = document.createElement("a");
  link.href = sourceCanvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

downloadFrameBtn.addEventListener("click", () => {
  if (!capturedImage) return;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ectx = exportCanvas.getContext("2d");

  ectx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);
  downloadCanvasData(exportCanvas, "captura_frame_viewer.png");
});

downloadCropBtn.addEventListener("click", () => {
  if (!currentCropCanvas) return;
  downloadCanvasData(currentCropCanvas, "recorte_frame_viewer.png");
});

redrawCanvas();
