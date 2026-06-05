const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const list = document.getElementById("list");
const template = document.getElementById("itemTemplate");
const processBtn = document.getElementById("processBtn");
const clearBtn = document.getElementById("clearBtn");
const removeDoneBtn = document.getElementById("removeDoneBtn");
const pendingCount = document.getElementById("pendingCount");
const doneCount = document.getElementById("doneCount");
const savedSize = document.getElementById("savedSize");
const queueHint = document.getElementById("queueHint");
const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const maxEdge = document.getElementById("maxEdge");
const maxEdgeValue = document.getElementById("maxEdgeValue");
const format = document.getElementById("format");
const background = document.getElementById("background");
const presetButtons = document.querySelectorAll(".preset");

const items = new Map();
let sequence = 0;

const presetConfig = {
  light: { quality: 84, maxEdge: 4096 },
  balanced: { quality: 72, maxEdge: 2560 },
  strong: { quality: 58, maxEdge: 1600 },
  max: { quality: 45, maxEdge: 1280 }
};

const supportedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

bindEvents();
renderEmptyState();
syncLabels();
updateCounters();

function bindEvents() {
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  dropzone.addEventListener("click", () => {
    fileInput.click();
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    addFiles(event.dataTransfer?.files ?? []);
  });

  processBtn.addEventListener("click", processAll);
  clearBtn.addEventListener("click", clearAll);
  removeDoneBtn.addEventListener("click", removeDone);

  quality.addEventListener("input", () => {
    clearPreset();
    syncLabels();
  });

  maxEdge.addEventListener("input", () => {
    clearPreset();
    syncLabels();
  });

  format.addEventListener("change", syncLabels);
  presetButtons.forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });
}

function addFiles(fileList) {
  const files = Array.from(fileList ?? []);
  const imageFiles = files.filter((file) => isImageFile(file));

  if (imageFiles.length === 0) {
    queueHint.textContent = "没有识别到图片文件";
    return;
  }

  imageFiles.forEach((file) => {
    const id = `${Date.now()}-${++sequence}`;
    const entry = createItem(id, file);
    items.set(id, entry);
    list.appendChild(entry.node);
  });

  queueHint.textContent = `当前队列 ${items.size} 张图片`;
  renderEmptyState();
  updateCounters();
}

function createItem(id, file) {
  const fragment = template.content.cloneNode(true);
  const node = fragment.querySelector(".file-card");
  const preview = fragment.querySelector("img");
  const name = fragment.querySelector(".file-name");
  const meta = fragment.querySelector(".file-meta");
  const status = fragment.querySelector(".status");
  const meter = fragment.querySelector(".meter-fill");
  const originalSize = fragment.querySelector(".original-size");
  const compressedSize = fragment.querySelector(".compressed-size");
  const ratio = fragment.querySelector(".ratio");
  const downloadBtn = fragment.querySelector(".download-btn");
  const removeBtn = fragment.querySelector(".remove-btn");
  const sourceUrl = URL.createObjectURL(file);

  preview.src = sourceUrl;
  preview.alt = file.name;
  name.textContent = file.name;
  meta.textContent = `${file.type || "未知格式"} · ${formatBytes(file.size)}`;
  originalSize.textContent = `原始：${formatBytes(file.size)}`;

  removeBtn.addEventListener("click", () => removeItem(id));
  downloadBtn.addEventListener("click", () => downloadItem(id));

  return {
    id,
    file,
    node,
    preview,
    name,
    meta,
    status,
    meter,
    originalSize,
    compressedSize,
    ratio,
    downloadBtn,
    removeBtn,
    sourceUrl,
    outputUrl: null,
    outputBlob: null,
    outputName: null,
    state: "pending"
  };
}

async function processAll() {
  const entries = Array.from(items.values()).filter((entry) => entry.state !== "done");

  if (items.size === 0) {
    queueHint.textContent = "先添加几张图片，再开始压缩";
    return;
  }

  if (entries.length === 0) {
    queueHint.textContent = "队列里的图片都已处理完成";
    return;
  }

  processBtn.disabled = true;
  queueHint.textContent = "正在处理图片...";
  updateCounters();

  try {
    for (const entry of entries) {
      await processItem(entry);
      updateCounters();
    }
  } finally {
    processBtn.disabled = false;
    queueHint.textContent = "处理完成";
    updateCounters();
  }
}

async function processItem(entry) {
  setStatus(entry, "处理中", "working");
  setMeter(entry, 20);

  try {
    const image = await loadImage(entry.file);
    const outputType = resolveOutputType();
    const qualityValueNumber = Number(quality.value) / 100;
    const { width, height } = fitSize(image.width, image.height, Number(maxEdge.value));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: outputType !== "image/jpeg" });

    if (!context) {
      throw new Error("浏览器不支持 Canvas 2D");
    }

    if (outputType === "image/jpeg") {
      context.fillStyle = background.value;
      context.fillRect(0, 0, width, height);
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    if (typeof image.close === "function") {
      image.close();
    }
    setMeter(entry, 60);

    const blob = await canvasToBlob(canvas, outputType, qualityValueNumber);

    if (!blob) {
      throw new Error("无法生成压缩图片");
    }

    if (entry.outputUrl) {
      URL.revokeObjectURL(entry.outputUrl);
    }

    entry.outputBlob = blob;
    entry.outputUrl = URL.createObjectURL(blob);
    entry.outputName = buildOutputName(entry.file.name, outputType);

    entry.compressedSize.textContent = `压缩后：${formatBytes(blob.size)}`;
    entry.ratio.textContent = `节省：${getSavingText(entry.file.size, blob.size)}`;
    entry.downloadBtn.disabled = false;
    setStatus(entry, "已完成", "done");
    setMeter(entry, 100);
  } catch (error) {
    console.error(error);
    entry.compressedSize.textContent = "压缩后：失败";
    entry.ratio.textContent = "节省：-";
    entry.downloadBtn.disabled = true;
    setStatus(entry, "失败", "error");
    setMeter(entry, 100);
  }
}

function loadImage(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => fallbackLoadImage(file));
  }

  return fallbackLoadImage(file);
}

function fallbackLoadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取图片"));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas, type, qualityLevel) {
  return new Promise((resolve) => {
    const requestedType = supportedMime.has(type) ? type : "image/jpeg";
    const safeQuality = Math.min(0.95, Math.max(0.45, qualityLevel));

    canvas.toBlob(
      (blob) => {
        if (blob || requestedType === "image/jpeg") {
          resolve(blob);
          return;
        }

        canvas.toBlob((fallback) => resolve(fallback), "image/jpeg", safeQuality);
      },
      requestedType,
      safeQuality
    );
  });
}

function resolveOutputType() {
  const selected = format.value || "image/jpeg";

  if (supportedMime.has(selected)) {
    return selected;
  }

  return "image/jpeg";
}

function fitSize(width, height, maxEdgeLength) {
  const longest = Math.max(width, height);
  if (longest <= maxEdgeLength) {
    return { width, height };
  }

  const scale = maxEdgeLength / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function buildOutputName(name, type) {
  const base = name.replace(/\.[^.]+$/, "");
  const ext = mimeToExtension(type);
  return `${base}-compressed.${ext}`;
}

function mimeToExtension(type) {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function getSavingText(original, compressed) {
  if (!compressed || compressed >= original) {
    return "0%";
  }

  const percent = ((original - compressed) / original) * 100;
  return `${percent.toFixed(1)}%`;
}

function updateCounters() {
  const done = countByState("done");
  pendingCount.textContent = `${Math.max(items.size - done, 0)}`;
  doneCount.textContent = `${done}`;
  savedSize.textContent = formatBytes(calculateSaved());
}

function countByState(state) {
  let total = 0;
  items.forEach((entry) => {
    if (entry.state === state) {
      total += 1;
    }
  });
  return total;
}

function calculateSaved() {
  let total = 0;
  items.forEach((entry) => {
    if (entry.state === "done" && entry.outputBlob && entry.file.size > entry.outputBlob.size) {
      total += entry.file.size - entry.outputBlob.size;
    }
  });
  return total;
}

function setStatus(entry, text, kind) {
  entry.status.textContent = text;
  entry.status.classList.remove("done", "error");
  if (kind === "done" || kind === "error") {
    entry.status.classList.add(kind);
  }
  entry.state = kind ?? "pending";
}

function setMeter(entry, value) {
  entry.meter.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function downloadItem(id) {
  const entry = items.get(id);
  if (!entry?.outputUrl) {
    return;
  }

  const link = document.createElement("a");
  link.href = entry.outputUrl;
  link.download = entry.outputName ?? "compressed-image.jpg";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function removeItem(id) {
  const entry = items.get(id);
  if (!entry) {
    return;
  }

  if (entry.sourceUrl) {
    URL.revokeObjectURL(entry.sourceUrl);
  }

  if (entry.outputUrl) {
    URL.revokeObjectURL(entry.outputUrl);
  }

  entry.node.remove();
  items.delete(id);
  queueHint.textContent = items.size ? `当前队列 ${items.size} 张图片` : "等待添加图片";
  renderEmptyState();
  updateCounters();
}

function clearAll() {
  Array.from(items.keys()).forEach((id) => removeItem(id));
  queueHint.textContent = "等待添加图片";
  renderEmptyState();
  updateCounters();
}

function removeDone() {
  Array.from(items.entries()).forEach(([id, entry]) => {
    if (entry.state === "done") {
      removeItem(id);
    }
  });
  queueHint.textContent = items.size ? `当前队列 ${items.size} 张图片` : "等待添加图片";
  renderEmptyState();
  updateCounters();
}

function renderEmptyState() {
  const empty = list.querySelector(".empty-state");

  if (items.size > 0) {
    empty?.remove();
    return;
  }

  if (empty) {
    return;
  }

  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = "还没有图片，先添加一张试试。";
  list.appendChild(node);
}

function applyPreset(name) {
  const config = presetConfig[name];
  if (!config) {
    return;
  }

  quality.value = config.quality;
  maxEdge.value = config.maxEdge;
  presetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === name);
  });
  syncLabels();
}

function clearPreset() {
  presetButtons.forEach((button) => button.classList.remove("active"));
}

function syncLabels() {
  qualityValue.textContent = quality.value;
  maxEdgeValue.textContent = `${maxEdge.value} px`;
}

function isImageFile(file) {
  return file.type.startsWith("image/");
}
