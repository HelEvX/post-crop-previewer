# Social Post Previewer

**Preview how your image will appear as a post on Instagram, LinkedIn, and Facebook — before you upload it.**

---

## About

Posting an image to social media and then discovering it's cropped wrong, or the focal point ended up in the wrong place, is frustrating. This tool lets you see exactly how your image will appear in each platform's feed — including the correct aspect ratios for the grid and feed — before you post.

This project is based on the excellent **[Square Image Cropper for PFP](https://github.com/sheetau/pfpcropper)** by [Sheeta](https://linktr.ee/sheetau), which solves the same problem for profile picture icons. The drag/zoom interaction model, canvas crop export approach, and overall spirit of this tool are directly inspired by their work. Thank you, Sheeta.

---

## Supported Formats

| Platform | Format | Aspect Ratio | Notes |
|---|---|---|---|
| Instagram | Post (portrait) | 4:5 | Crop or letterbox for landscape originals |
| Instagram | Grid thumbnail | 3:4 | 2025 grid update |
| LinkedIn | Feed post | 1.91:1 | Standard link/image post |
| Facebook | Group post | 1.91:1 | Feed image post |
| Facebook | Album thumbnail | 1:1 | Square crop |

> Instagram Stories are excluded intentionally — the platform already provides its own intuitive positioning UI.

---

## How to Use

1. **Open the page** in your browser (see *Running* below).
2. **Drop or click** to upload your image (JPG, PNG, WEBP — any size).
3. **Drag** within any preview panel to reposition the crop.
4. **Scroll / pinch** or use the **Zoom slider** to scale the image within each frame independently.
5. For landscape images in the **Instagram Post** panel, toggle between **Crop to 4:5** and **Letterbox**.
6. Click any **Download** button at the bottom to save the cropped image.

Download notes:
- PNG source images are saved as `.png`.
- All other formats (JPG, WEBP, etc.) are saved as `.jpg`.
- Each crop is exported at the original source image's resolution — no quality is lost from zooming.
- Filenames include the format name and a timestamp, e.g. `photo-ig-portrait-260409143022.jpg`.

---

## Running the Page

### Locally (WebStorm)

No build step, no package manager, no dependencies. This project is pure HTML + CSS + JS.

1. Clone or download this repository.
2. Open the folder in **WebStorm**.
3. Right-click `index.html` → **Open In → Browser**, or click the browser icon in the top-right corner of the editor.
4. WebStorm's built-in server handles everything — no `npm install` needed.

> ⚠️ Do **not** open `index.html` by double-clicking it in Finder/Explorer (i.e. `file://` protocol). The Google Fonts import will be blocked by some browsers in that context. Always use a local server — WebStorm's built-in one is perfect.

### GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Your page will be live at `https://<your-username>.github.io/<repo-name>/`.

No build step is needed — GitHub Pages serves static files directly.

---

## File Structure

```
social-post-previewer/
├── index.html    — markup and layout
├── style.css     — all styles
├── cropper.js    — per-stage crop engine (drag, zoom, canvas export)
├── main.js       — app orchestration (upload, stage init, sliders, download)
└── README.md     — this file
```

---

## Credits

- **Original concept & code:** [Sheeta](https://linktr.ee/sheetau) — [Square Image Cropper for PFP](https://github.com/sheetau/pfpcropper)
- **Fonts:** [DM Mono & DM Sans](https://fonts.google.com/specimen/DM+Mono) via Google Fonts

---

## License

MIT — do whatever you like with this, but please credit Sheeta's original work if you build on it further.