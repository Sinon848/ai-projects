# 图片压缩工坊 / Image Compression Workshop

一个轻量级、基于浏览器的图片压缩工具，适合本地快速处理图片、批量导出不同格式的压缩结果。

## 中文说明

### 功能

- 支持拖拽或选择多张图片进行批量压缩
- 提供轻压缩、均衡、强压缩、极致四档预设
- 可手动调整压缩质量与最长边长度
- 默认导出格式为 JPG，同时支持 PNG、WebP、AVIF
- 每张压缩后的图片都可以单独下载

### 使用方法

1. 在浏览器中直接打开 `index.html`，或者运行 `launch-local.bat` 使用本地启动器。
2. 添加一张或多张图片。
3. 选择预设或手动调整参数。
4. 点击开始压缩。
5. 分别下载每个处理完成的结果。

### 说明

- 支持的源图片格式取决于浏览器本身能否解码。
- 如果导出 JPG，透明区域会使用你选择的背景色填充。
- 本地启动器会保留一个桌面快捷方式，名称为 `图片压缩工坊`，并使用 `assets/shortcut-icon.ico` 作为图标。
- 如果未安装 Node.js，本地启动器会直接打开 `index.html`。

---

## English

A lightweight browser-based image compression app for quick local use.

### Features

- Drag and drop or select multiple images for batch compression
- Four presets: Light, Balanced, Strong, and Max
- Manual control over compression quality and maximum edge length
- Default output is JPG, with PNG, WebP, and AVIF available
- Download each compressed image individually

### How To Use

1. Open `index.html` in a browser, or run `launch-local.bat` for a local launcher.
2. Add one or more images.
3. Choose a preset or adjust the settings manually.
4. Click Start Compression.
5. Download each finished result separately.

### Notes

- Supported source formats depend on what the browser can decode.
- If you export JPG, transparent areas are filled with the background color you choose.
- The local launcher keeps one desktop shortcut named `图片压缩工坊` and uses the bundled icon in `assets/shortcut-icon.ico`.
- If Node.js is not installed, the launcher falls back to opening `index.html` directly.
