# Image Compression Workshop

A lightweight browser-based image compression app for quick local use.

## Features

- Drag and drop or select multiple images for batch compression
- Four presets: Light, Balanced, Strong, and Max
- Manual control over compression quality and maximum edge length
- Default output is JPG, with PNG, WebP, and AVIF available
- Download each compressed image individually

## How To Use

1. Open `index.html` in a browser, or run `launch-local.bat` for a local launcher.
2. Add one or more images.
3. Choose a preset or adjust the settings manually.
4. Click Start Compression.
5. Download each finished result separately.

## Notes

- Supported source formats depend on what the browser can decode.
- If you export JPG, transparent areas are filled with the background color you choose.
- The local launcher creates or updates a desktop shortcut and uses the bundled icon in `assets/shortcut-icon.ico`.
