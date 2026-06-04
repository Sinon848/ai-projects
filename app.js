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

function bindEvents() {
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
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
    queueHint.textContent = "æ²¡æœ‰è¯†åˆ«åˆ°å›¾ç‰‡æ–‡ä»¶";
    return;
  }

  imageFiles.forEach((file) => {
    const id = `${Date.now()}-${++sequence}`;
    const entry = createItem(id, file);
    items.set(id, entry);
    list.appendChild(entry.node);
  });

  queueHint.textContent = `å½“å‰é˜Ÿåˆ— ${items.size} å¼ å›¾ç‰‡`;
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
  meta.textContent = `${file.type || "æœªçŸ¥æ ¼å¼"} Â· ${formatBytes(file.size)}`;
  originalSize.textContent = `åŽŸå§‹ï¼š${formatBytes(file.size)}`;

  removeBtn.addEventListener("click", () => removeItem(id));
  downloadBtn.addEventListener("click", () => downloadItem(id));

  const item = {
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

  return item;
}

async function processAll() {
  const entries = Array.from(items.values());

  if (entries.length === 0) {
    queueHint.textContent = "å…ˆæ·»åŠ å‡ å¼ å›¾ç‰‡ï¼Œå†å¼€å§‹åŽ‹ç¼©";
    return;
  }

  processBtn.disabled = true;
  queueHint.textContent = "æ­£åœ¨å¤„ç†å›¾ç‰‡...";

  let completed = 0;
  let saved = 0;

  for (const entry of entries) {
    await processItem(entry);
    completed += 1;

    if (entry.state === "done" && entry.file.size > entry.outputBlob.size) {
      saved += entry.file.size - entry.outputBlob.size;
    }

    updateCounters(completed, saved);
  }

  processBtn.disabled = false;
  queueHint.textContent = "å…¨éƒ¨å¤„ç†å®Œæˆ";
  updateCounters(entries.length, saved);
}

async function processItem(entry) {
  setStatus(entry, "å¤„ç†ä¸­", "working");
  setMeter(entry, 20);

  try {
    const image = await loadImage(entry.file);
    const sourceType = entry.file.type || "image/jpeg";
    const outputType = resolveOutputType(sourceType);
    const qualityValueNumber = Number(quality.value) / 100;
    const { width, height } = fitSize(image.width, image.height, Number(maxEdge.value));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: outputType !== "image/jpeg" });

    if (!context) {
      throw new Error("æµè§ˆå™¨ä¸æ”¯æŒ Canvas 2D");
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
      throw new Error("æ— æ³•ç”ŸæˆåŽ‹ç¼©å›¾ç‰‡");
    }

    if (entry.outputUrl) {
      URL.revokeObjectURL(entry.outputUrl);
    }

    entry.outputBlob = blob;
    entry.outputUrl = URL.createObjectURL(blob);
    entry.outputName = buildOutputName(entry.file.name, outputType);

    entry.compressedSize.textContent = `åŽ‹ç¼©åŽï¼š${formatBytes(blob.size)}`;
    entry.ratio.textContent = `èŠ‚çœï¼š${getSavingText(entry.file.size, blob.size)}`;
    entry.downloadBtn.disabled = false;
    entry.status.classList.remove("error");
    setStatus(entry, "å·²å®Œæˆ", "done");
    setMeter(entry, 100);
    updateCounters();
  } catch (error) {
    console.error(error);
    entry.compressedSize.textContent = "åŽ‹ç¼©åŽï¼šå¤±è´¥";
    entry.ratio.textContent = "èŠ‚çœï¼š-";
    entry.downloadBtn.disabled = true;
    setStatus(entry, "å¤±è´¥", "error");
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
      reject(new Error("æ— æ³•è¯»å–å›¾ç‰‡"));
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
      requestedType === "image/jpeg" ? safeQuality : safeQuality
    );
  });
}

function resolveOutputType(sourceType) {
  const selected = format.value;

  if (selected !== "auto") {
    return selected;
  }

  if (supportedMime.has("image/webp")) {
    return "image/webp";
  }

  return sourceType === "image/png" ? "image/png" : "image/jpeg";
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

function updateCounters(completed = countDone(), saved = calculateSaved()) {
  pendingCount.textContent = `${Math.max(items.size - completed, 0)}`;
  doneCount.textContent = `${completed}`;
  savedSize.textContent = formatBytes(saved);
}

function countDone() {
  let total = 0;
  items.forEach((entry) => {
    if (entry.state === "done") {
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
  if (kind) {
    entry.status.classList.add(kind);
  }
  entry.state = kind === "done" ? "done" : kind === "error" ? "working";
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
  queueHint.textContent = items.size ? ``{items.size} å¼ å›¾ç‰‡`, : "çº·å¾…æ·»åŠ å›¾ç‰‡";
  renderEmptyState();
  updateCounters();
}

function clearAll() {
  Array.from(items.keys()).forEach((id) => removeItem(id));
  queueHint.textContent = "ç®¶'–úšÞï–*ƒ–nûž&ˆì(€É•¹‘•ÉµÁÑåMÑ…Ñ” ¤ì)ô()™Õ¹Ñ¥½¸É•µ½Ù•½¹” ¤ì(€ÉÉ…ä¹™É½´¡¥Ñ•µÌ¹Ù…±Õ•Ì ¤¤(€€€€¹™¥±Ñ•È ¡•¹ÑÉä¤€ôø•¹ÑÉä¹ÍÑ…Ñ”€ôôô€‰‘½¹”ˆ¤(€€€€¹™½É…  ¡•¹ÑÉä¤€ôøÉ•µ½Ù•%Ñ•´¡•¹ÑÉä¹¥¤¤ì)ô()™Õ¹Ñ¥½¸É•¹‘•ÉµÁÑåMÑ…Ñ” ¤ì(€½¹ÍÐ¡…Í%Ñ•µÌ€ô¥Ñ•µÌ¹Í¥é”€ø€Àì(€½¹ÍÐÕÉÉ•¹Ð€ô±¥ÍÐ¹ÅÕ•ÉåM•±•Ñ½È ˆ¹•µÁÑäµÍÑ…Ñ”ˆ¤ì((€¥˜€ …¡…Í%Ñ•µÌ€˜˜€…ÕÉÉ•¹Ð¤ì(€€€½¹ÍÐ•µÁÑä€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‘¥Øˆ¤ì(€€€•µÁÑä¹±…ÍÍ9…µ”€ô€‰•µÁÑäµÍÑ…Ñ”ˆì(€€€•µÁÑä¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹’úšÊ‡šr'¢¾–"¯–"Ã–nûž&šZ’îØ»’â·’ösžR£žj–nûž&¾ò3–7–ò–ž/–:/žò¤»’ú³¢þg’â«–:/žò¤¹àˆ°(€€€±¥ÍÐ¹…ÁÁ•¹‘¡¥±¡•µÁÑä¤ì(€ô((€¥˜€¡¡…Í%Ñ•µÌ€˜˜ÕÉÉ•¹Ð¤ì(€€€ÕÉÉ•¹Ð¹É•µ½Ù” ¤ì(€ô((€ÕÁ‘…Ñ•½Õ¹Ñ•ÉÌ ¤ì)ô()™Õ¹Ñ¥½¸…ÁÁ±åAÉ•Í•Ð¡¹…µ”¤ì(€½¹ÍÐ½¹™¥œ€ôÁÉ•Í•Ñ½¹™¥m¹…µ•tì(€¥˜€ …½¹™¥œ¤ì(€€€É•ÑÕÉ¸ì(€ô((€ÅÕ…±¥Ñä¹Ù…±Õ”€ôMÑÉ¥¹œ¡½¹™¥œ¹ÅÕ…±¥Ñä¤ì(€µ…á‘”¹Ù…±Õ”€ôMÑÉ¥¹œ¡½¹™¥œ¹µ…á‘”¤ì((€ÁÉ•Í•Ñ	ÕÑÑ½¹Ì¹™½É…  ¡‰ÕÑÑ½¸¤€ôøì(€€€‰ÕÑÑ½¸¹±…ÍÍ1¥ÍÐ¹Ñ½±” ‰…Ñ¥Ù”ˆ°‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹ÁÉ•Í•Ð€ôôô¹…µ”¤ì(€ô¤ì((€Íå¹1…‰•±Ì ¤ì)ô()™Õ¹Ñ¥½¸±•…ÉAÉ•Í•Ð ¤ì(€ÁÉ•Í•Ñ	ÕÑÑ½¹Ì¹™½É…  ¡‰ÕÑÑ½¸¤€ôø‰ÕÑÑ½¸¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” ‰…Ñ¥Ù”ˆ¤¤ì)ô()™Õ¹Ñ¥½¸Íå¹1…‰•±Ì ¤ì(€ÅÕ…±¥ÑåY…±Õ”¹Ñ•áÑ½¹Ñ•¹Ð€ôÅÕ…±¥Ñä¹Ù…±Õ”ì(€µ…á‘•Y…±Õ”¹Ñ•áÑ½¹Ñ•¹Ð€ô€‘íµ…á‘”¹Ù…±Õ•ôÁá€ì)ô()™Õ¹Ñ¥½¸¥Í%µ…•¥±”¡™¥±”¤ì(€¥˜€ …™¥±”¤ì(€€€É•ÑÕÉ¸™…±Í”ì(€ô((€¥˜€¡™¥±”¹ÑåÁ”ü¹ÍÑ…ÉÑÍ]¥Ñ  ‰¥µ…”¼ˆ¤¤ì(€€€É•ÑÕÉ¸ÑÉÕ”ì(€ô((€É•ÑÕÉ¸€½p¸¡Á¹ñ©Á”ýñÝ•‰Áñ¥™ñ…Ù¥™ñ‰µÁñ¡•¥ñ¡•¥™ñÑ¥™ñÑ¥™˜¤½¤¹Ñ•ÍÐ¡™¥±”¹¹…µ”¤ì)ô