/**
 * cropper.js
 * Per-stage crop engine.
 * Each "stage" is an independent interactive crop area with its own zoom,
 * drag state, and source image reference.
 *
 * Exports: window.CropperEngine
 */

(function (global) {
    "use strict";

    /**
     * Create a CropperEngine for a single crop-stage element.
     *
     * @param {HTMLElement} stageEl  — the .crop-stage container
     * @param {HTMLImageElement} imgEl  — the .stage-image inside it
     * @param {number} aspectRatio  — width/height ratio (e.g. 0.8 for 4:5)
     * @param {object} [opts]
     * @param {Function} [opts.onUpdate]  — called after every position/zoom change
     */
    function CropperEngine(stageEl, imgEl, aspectRatio, opts) {
        this.stage      = stageEl;
        this.img        = imgEl;
        this.ratio      = aspectRatio;   // w/h
        this.opts       = opts || {};
        this.source     = null;          // the loaded Image object
        this.zoom       = 1;             // 1 = fit-cover at 100%
        this.imgX       = 0;             // left offset in px (stage-local)
        this.imgY       = 0;             // top  offset in px (stage-local)
        this.baseW      = 0;             // image width at zoom=1 (cover fit)
        this.baseH      = 0;

        // letterbox mode (only relevant for ig-portrait with landscape source)
        this.letterboxMode = false;

        // interaction state
        this._drag = null;    // { startX, startY, startImgX, startImgY }
        this._pinchDist = null;

        this._bindEvents();
    }

    /* ── public API ──────────────────────────────────────────── */

    /**
     * Load a new source image into this stage.
     * @param {Image} sourceImg  — fully loaded HTMLImageElement
     */
    CropperEngine.prototype.loadImage = function (sourceImg) {
        this.source = sourceImg;
        this.zoom   = 1;
        this.letterboxMode = false;
        this.img.src = sourceImg.src;
        this._recalcBase();
        this._centerImage();
        this._applyTransform();
        this._notify();
    };

    /**
     * Set zoom level (100–500 maps to 1–5).
     * zooms toward/from the stage center.
     */
    CropperEngine.prototype.setZoom = function (percent) {
        const newZoom = Math.max(1, Math.min(5, percent / 100));
        this._zoomAround(
            this.stage.offsetWidth  / 2,
            this.stage.offsetHeight / 2,
            newZoom
        );
        this._notify();
    };

    /**
     * Toggle letterbox mode for landscape images in portrait stages.
     * @param {boolean} enabled
     */
    CropperEngine.prototype.setLetterbox = function (enabled) {
        this.letterboxMode = enabled;
        this._recalcBase();
        this._centerImage();
        this._applyTransform();
        this._notify();
    };

    /**
     * Returns the current crop as { sx, sy, sw, sh } in source-image pixels.
     */
    CropperEngine.prototype.getCropRect = function () {
        if (!this.source) return null;
        const stageW = this.stage.offsetWidth;
        const stageH = this.stage.offsetHeight;
        const dispW  = this.baseW * this.zoom;
        const dispH  = this.baseH * this.zoom;
        const scaleX = this.source.naturalWidth  / dispW;
        const scaleY = this.source.naturalHeight / dispH;
        return {
            sx: -this.imgX * scaleX,
            sy: -this.imgY * scaleY,
            sw: stageW * scaleX,
            sh: stageH * scaleY,
        };
    };

    /**
     * Draw the current crop onto a new canvas and return it.
     */
    CropperEngine.prototype.toCanvas = function () {
        if (!this.source) return null;
        const r      = this.getCropRect();
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(r.sw);
        canvas.height = Math.round(r.sh);
        canvas.getContext("2d").drawImage(
            this.source,
            r.sx, r.sy, r.sw, r.sh,
            0,    0,    canvas.width, canvas.height
        );
        return canvas;
    };

    /* ── internal helpers ────────────────────────────────────── */

    CropperEngine.prototype._recalcBase = function () {
        if (!this.source) return;
        const stageW = this.stage.offsetWidth;
        const stageH = this.stage.offsetHeight;
        const imgRatio = this.source.naturalWidth / this.source.naturalHeight;

        if (this.letterboxMode) {
            // fit full width, bars top/bottom
            this.baseW = stageW;
            this.baseH = stageW / imgRatio;
        } else {
            // cover: fill the stage entirely
            if (imgRatio > stageW / stageH) {
                this.baseH = stageH;
                this.baseW = stageH * imgRatio;
            } else {
                this.baseW = stageW;
                this.baseH = stageW / imgRatio;
            }
        }
    };

    CropperEngine.prototype._centerImage = function () {
        const stageW = this.stage.offsetWidth;
        const stageH = this.stage.offsetHeight;
        const dispW  = this.baseW * this.zoom;
        const dispH  = this.baseH * this.zoom;
        this.imgX = (stageW - dispW) / 2;
        this.imgY = (stageH - dispH) / 2;
        this._clamp();
    };

    CropperEngine.prototype._clamp = function () {
        const stageW = this.stage.offsetWidth;
        const stageH = this.stage.offsetHeight;
        const dispW  = this.baseW * this.zoom;
        const dispH  = this.baseH * this.zoom;

        if (this.letterboxMode) {
            // lock x to 0; allow vertical movement only within bars
            this.imgX = 0;
            const minY = Math.min(0, stageH - dispH);
            const maxY = Math.max(0, stageH - dispH);
            this.imgY = Math.max(minY, Math.min(maxY, this.imgY));
        } else {
            const minX = Math.min(0, stageW - dispW);
            const minY = Math.min(0, stageH - dispH);
            this.imgX = Math.max(minX, Math.min(0, this.imgX));
            this.imgY = Math.max(minY, Math.min(0, this.imgY));
        }
    };

    CropperEngine.prototype._applyTransform = function () {
        if (!this.source) return;
        const dispW = this.baseW * this.zoom;
        const dispH = this.baseH * this.zoom;
        const s = this.img.style;
        s.width  = dispW + "px";
        s.height = dispH + "px";
        s.left   = this.imgX + "px";
        s.top    = this.imgY  + "px";

        // letterbox bars
        const stageH = this.stage.offsetHeight;
        const topBar = this.stage.querySelector(".letterbox-top");
        const botBar = this.stage.querySelector(".letterbox-bottom");
        if (topBar && botBar) {
            if (this.letterboxMode && dispH < stageH) {
                const barH = (stageH - dispH) / 2;
                topBar.style.height = barH + "px";
                botBar.style.height = barH + "px";
                topBar.classList.remove("hidden");
                botBar.classList.remove("hidden");
            } else {
                topBar.classList.add("hidden");
                botBar.classList.add("hidden");
            }
        }

        // update crop-dims label
        const stageW = this.stage.offsetWidth;
        const scaleX = (this.source.naturalWidth  / dispW);
        const scaleY = (this.source.naturalHeight / dispH);
        const cropW  = Math.round(stageW * scaleX);
        const cropH  = Math.round(stageH * scaleY);
        const dimEl  = document.getElementById("crop-dims-" + this.stage.dataset.format);
        if (dimEl) dimEl.textContent = cropW + " × " + cropH + " px";
    };

    CropperEngine.prototype._zoomAround = function (cx, cy, newZoom) {
        const oldZoom = this.zoom;
        const oldDispW = this.baseW * oldZoom;
        const oldDispH = this.baseH * oldZoom;
        // relative position of the focal point in the image
        const relX = (cx - this.imgX) / oldDispW;
        const relY = (cy - this.imgY) / oldDispH;
        this.zoom = newZoom;
        const newDispW = this.baseW * newZoom;
        const newDispH = this.baseH * newZoom;
        this.imgX = cx - relX * newDispW;
        this.imgY = cy - relY * newDispH;
        this._clamp();
        this._applyTransform();
    };

    CropperEngine.prototype._notify = function () {
        if (typeof this.opts.onUpdate === "function") {
            this.opts.onUpdate(this);
        }
    };

    /* ── event binding ───────────────────────────────────────── */

    CropperEngine.prototype._bindEvents = function () {
        const stage = this.stage;

        // Mouse drag
        stage.addEventListener("mousedown", (e) => {
            if (!this.source) return;
            this._drag = {
                startX:    e.clientX,
                startY:    e.clientY,
                startImgX: this.imgX,
                startImgY: this.imgY,
            };
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!this._drag) return;
            this.imgX = this._drag.startImgX + (e.clientX - this._drag.startX);
            this.imgY = this._drag.startImgY + (e.clientY - this._drag.startY);
            this._clamp();
            this._applyTransform();
            this._notify();
        });

        document.addEventListener("mouseup", () => {
            this._drag = null;
        });

        // Wheel zoom
        stage.addEventListener("wheel", (e) => {
            if (!this.source) return;
            e.preventDefault();
            const delta   = e.deltaY > 0 ? -0.08 : 0.08;
            const newZoom = Math.max(1, Math.min(5, this.zoom + delta));
            const rect    = stage.getBoundingClientRect();
            this._zoomAround(e.clientX - rect.left, e.clientY - rect.top, newZoom);
            this._notify();
            // sync slider
            const slider = document.getElementById("zoom-" + stage.dataset.format);
            const valEl  = document.getElementById("zval-" + stage.dataset.format);
            if (slider) slider.value = Math.round(this.zoom * 100);
            if (valEl)  valEl.textContent = Math.round(this.zoom * 100) + "%";
            _updateSliderTrack(slider);
        }, { passive: false });

        // Touch drag + pinch
        stage.addEventListener("touchstart", (e) => {
            if (!this.source) return;
            if (e.touches.length === 1) {
                const t = e.touches[0];
                this._drag = {
                    startX: t.clientX, startY: t.clientY,
                    startImgX: this.imgX, startImgY: this.imgY,
                };
            } else if (e.touches.length === 2) {
                this._pinchDist = _pinchDistance(e);
                this._drag = null;
            }
            e.preventDefault();
        }, { passive: false });

        document.addEventListener("touchmove", (e) => {
            if (!this.source) return;
            if (e.touches.length === 1 && this._drag) {
                const t = e.touches[0];
                this.imgX = this._drag.startImgX + (t.clientX - this._drag.startX);
                this.imgY = this._drag.startImgY + (t.clientY - this._drag.startY);
                this._clamp();
                this._applyTransform();
                this._notify();
            } else if (e.touches.length === 2 && this._pinchDist !== null) {
                const newDist = _pinchDistance(e);
                const delta   = (newDist - this._pinchDist) * 0.005;
                const rect    = stage.getBoundingClientRect();
                const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
                const newZoom = Math.max(1, Math.min(5, this.zoom + delta));
                this._zoomAround(cx, cy, newZoom);
                this._pinchDist = newDist;
                this._notify();
                const slider = document.getElementById("zoom-" + stage.dataset.format);
                const valEl  = document.getElementById("zval-" + stage.dataset.format);
                if (slider) slider.value = Math.round(this.zoom * 100);
                if (valEl)  valEl.textContent = Math.round(this.zoom * 100) + "%";
                _updateSliderTrack(slider);
            }
            e.preventDefault();
        }, { passive: false });

        document.addEventListener("touchend", () => {
            this._drag      = null;
            this._pinchDist = null;
        });
    };

    /* ── static utils ────────────────────────────────────────── */

    function _pinchDistance(e) {
        return Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }

    function _updateSliderTrack(slider) {
        if (!slider) return;
        const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.background =
            `linear-gradient(to right,
         rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.35) ${pct}%,
         rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`;
    }

    // Expose
    global.CropperEngine      = CropperEngine;
    global._updateSliderTrack = _updateSliderTrack;

})(window);