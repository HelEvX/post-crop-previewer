/**
 * main.js
 * Orchestrates the Social Post Previewer:
 * - file upload / drag-drop
 * - initialises a CropperEngine per stage
 * - wires zoom sliders, landscape toggle, download buttons
 *
 * Depends on: cropper.js (must be loaded first)
 */

(function () {
    "use strict";

    /* ── Stage definitions ────────────────────────────────────
       ratio = width / height of the crop frame
     ─────────────────────────────────────────────────────────── */
    const STAGES = [
        { id: "ig-portrait", ratio: 4 / 5,    hasLetterbox: true  },
        { id: "ig-grid",     ratio: 3 / 4,    hasLetterbox: false },
        { id: "ig-story",    ratio: 9 / 16,   hasLetterbox: false },
        { id: "linkedin",    ratio: 1.91 / 1, hasLetterbox: false },
        { id: "fb-post",     ratio: 1.91 / 1, hasLetterbox: false },
        { id: "fb-album",    ratio: 1 / 1,    hasLetterbox: false },
    ];

    /* ── State ────────────────────────────────────────────────── */
    const engines   = {};   // keyed by stage id
    let sourceImage = null;
    let sourceFile  = null;

    /* ── DOM refs ─────────────────────────────────────────────── */
    const uploadZone   = document.getElementById("upload-zone");
    const fileInput    = document.getElementById("file-input");
    const workspace    = document.getElementById("workspace");
    const metaFilename = document.getElementById("meta-filename");
    const metaDims     = document.getElementById("meta-dims");
    const metaSize     = document.getElementById("meta-size");
    const btnNewFile   = document.getElementById("btn-new-file");

    /* ── Init engines ─────────────────────────────────────────── */

    STAGES.forEach(({ id, ratio }) => {
        const stageEl = document.getElementById("stage-" + id);
        const imgEl   = document.getElementById("img-" + id);
        if (!stageEl || !imgEl) return;

        const engine = new CropperEngine(stageEl, imgEl, ratio, {
            onUpdate: () => { /* could do cross-stage linking here */ },
        });
        engines[id] = engine;

        // Zoom slider
        const slider = document.getElementById("zoom-" + id);
        const valEl  = document.getElementById("zval-" + id);
        if (slider) {
            _updateSliderTrack(slider);
            slider.addEventListener("input", () => {
                engine.setZoom(parseInt(slider.value, 10));
                if (valEl) valEl.textContent = slider.value + "%";
                _updateSliderTrack(slider);
            });
        }
    });

    /* ── Landscape toggle (Instagram portrait only) ────────────── */
    const igPortraitToggle = document.getElementById("toggle-ig-portrait");
    if (igPortraitToggle) {
        igPortraitToggle.querySelectorAll(".toggle-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                igPortraitToggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                const mode = btn.dataset.mode;
                const eng  = engines["ig-portrait"];
                if (eng) {
                    eng.setLetterbox(mode === "letterbox");
                    // reset zoom to 100 when switching mode
                    eng.setZoom(100);
                    const slider = document.getElementById("zoom-ig-portrait");
                    const valEl  = document.getElementById("zval-ig-portrait");
                    if (slider) { slider.value = 100; _updateSliderTrack(slider); }
                    if (valEl)  valEl.textContent = "100%";
                }
            });
        });
    }

    /* ── Download buttons ─────────────────────────────────────── */
    document.querySelectorAll(".btn-download").forEach((btn) => {
        btn.addEventListener("click", () => {
            const format = btn.dataset.format;
            const engine = engines[format];
            if (!engine || !engine.source) return;

            const canvas = engine.toCanvas();
            if (!canvas) return;

            const isPNG  = sourceImage.src.startsWith("data:image/png");
            const ext    = isPNG ? "png" : "jpg";
            const mime   = isPNG ? "image/png" : "image/jpeg";
            const ts     = _timestamp();
            const base   = (sourceFile ? sourceFile.name : "image").replace(/\.[^/.]+$/, "");
            const link   = document.createElement("a");
            link.download = `${base}-${format}-${ts}.${ext}`;
            link.href     = canvas.toDataURL(mime);
            link.click();
        });
    });

    /* ── New file button ─────────────────────────────────────── */
    btnNewFile.addEventListener("click", () => fileInput.click());

    /* ── Upload zone interactions ────────────────────────────── */

    uploadZone.addEventListener("click", () => fileInput.click());
    uploadZone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") fileInput.click();
    });

    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("drag-over");
    });
    uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("drag-over");
    });
    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("drag-over");
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files[0]) {
            handleFile(fileInput.files[0]);
        }
    });

    /* ── File handling ────────────────────────────────────────── */

    function handleFile(file) {
        if (!file.type.match("image.*")) {
            alert("Please select an image file.");
            return;
        }
        sourceFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                sourceImage = img;
                updateMeta(file, img);
                showWorkspace();                      // make workspace visible first
                requestAnimationFrame(() => {         // wait one frame for display:block to apply
                    requestAnimationFrame(() => {       // second frame ensures offsetWidth is populated
                        loadAllStages(img);
                    });
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function loadAllStages(img) {
        const isLandscape = img.naturalWidth > img.naturalHeight;

        STAGES.forEach(({ id }) => {
            const engine = engines[id];
            if (!engine) return;

            // Reset letterbox mode before loading
            engine.letterboxMode = false;
            engine.loadImage(img);

            // reset zoom slider
            const slider = document.getElementById("zoom-" + id);
            const valEl  = document.getElementById("zval-" + id);
            if (slider) { slider.value = 100; _updateSliderTrack(slider); }
            if (valEl)  valEl.textContent = "100%";
        });

        // Show/hide landscape toggle for ig-portrait
        const toggle = document.getElementById("toggle-ig-portrait");
        if (toggle) {
            if (isLandscape) {
                toggle.classList.remove("hidden");
                // reset to crop mode
                toggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
                const cropBtn = toggle.querySelector('[data-mode="crop"]');
                if (cropBtn) cropBtn.classList.add("active");
            } else {
                toggle.classList.add("hidden");
            }
        }
    }

    function updateMeta(file, img) {
        metaFilename.textContent = file.name;
        metaDims.textContent     = img.naturalWidth + " × " + img.naturalHeight + " px";
        const mb = file.size / (1024 * 1024);
        metaSize.textContent = mb >= 1
            ? mb.toFixed(2) + " MB"
            : (file.size / 1024).toFixed(2) + " KB";
    }

    function showWorkspace() {
        uploadZone.style.display = "none";
        workspace.classList.remove("hidden");
    }

    /* ── Utils ────────────────────────────────────────────────── */

    function _timestamp() {
        const d = new Date();
        return [
            d.getFullYear().toString().slice(2),
            _pad(d.getMonth() + 1),
            _pad(d.getDate()),
            _pad(d.getHours()),
            _pad(d.getMinutes()),
            _pad(d.getSeconds()),
        ].join("");
    }

    function _pad(n) { return String(n).padStart(2, "0"); }

})();