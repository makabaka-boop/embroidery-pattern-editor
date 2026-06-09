import { STITCH_TYPES } from './constants.js';

export class CanvasRenderer {
    constructor(state) {
        this.state = state;
        this.mainCanvas = null;
        this.gridCanvas = null;
        this.drawCanvas = null;
        this.bgImage = null;
        this.mainCtx = null;
        this.gridCtx = null;
        this.drawCtx = null;
        this.wrapper = null;
    }

    init() {
        this.mainCanvas = document.getElementById('mainCanvas');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.drawCanvas = document.getElementById('drawCanvas');
        this.bgImage = document.getElementById('bgImage');
        this.wrapper = document.querySelector('.canvas-wrapper');

        this._resizeCanvases();
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.drawCtx = this.drawCanvas.getContext('2d');

        this.applyZoom();
        this.drawGrid();
    }

    _resizeCanvases() {
        const { canvasWidth, canvasHeight } = this.state;
        this.mainCanvas.width = canvasWidth;
        this.mainCanvas.height = canvasHeight;
        this.gridCanvas.width = canvasWidth;
        this.gridCanvas.height = canvasHeight;
        this.drawCanvas.width = canvasWidth;
        this.drawCanvas.height = canvasHeight;
    }

    applyZoom() {
        const scale = this.state.zoom;
        this.drawCanvas.style.transform = `scale(${scale})`;
        this.gridCanvas.style.transform = `scale(${scale})`;
        this.mainCanvas.style.transform = `scale(${scale})`;
        this.bgImage.style.transform = `scale(${scale})`;
        this.wrapper.style.width = `${this.state.canvasWidth * scale}px`;
        this.wrapper.style.height = `${this.state.canvasHeight * scale}px`;
    }

    setCanvasSize(width, height) {
        this.state.canvasWidth = width;
        this.state.canvasHeight = height;
        this._resizeCanvases();
    }

    drawGrid() {
        const { canvasWidth, canvasHeight, gridSize } = this.state;
        this.gridCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.gridCtx.strokeStyle = '#e5e7eb';
        this.gridCtx.lineWidth = 0.5;

        for (let x = 0; x <= canvasWidth; x += gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, canvasHeight);
            this.gridCtx.stroke();
        }

        for (let y = 0; y <= canvasHeight; y += gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(canvasWidth, y);
            this.gridCtx.stroke();
        }
    }

    setGridVisible(visible) {
        this.gridCanvas.style.opacity = visible ? '1' : '0';
    }

    clearPreview() {
        this.drawCtx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
    }

    drawPreviewPath(path) {
        this.clearPreview();
        if (!path || path.length === 0) return;
        this._applyPathStyle(this.drawCtx, path[0]);
        this._drawStitch(this.drawCtx, path, path[0].type);
    }

    _applyPathStyle(ctx, point) {
        ctx.strokeStyle = point.color;
        ctx.fillStyle = point.color;
        ctx.lineWidth = point.strands;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    _drawStitch(ctx, path, type) {
        if (!path || path.length === 0) return;
        this._applyPathStyle(ctx, path[0]);

        switch (type) {
            case STITCH_TYPES.RUNNING:
                this._drawRunningStitch(ctx, path);
                break;
            case STITCH_TYPES.BACKSTITCH:
                this._drawBackstitch(ctx, path);
                break;
            case STITCH_TYPES.SATIN:
                this._drawSatinStitch(ctx, path);
                break;
            case STITCH_TYPES.FRENCH_KNOT:
                this._drawFrenchKnot(ctx, path);
                break;
        }
    }

    _drawRunningStitch(ctx, path) {
        const stitchLength = this.state.gridSize;
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.max(1, Math.floor(dist / stitchLength));

            for (let s = 0; s < steps; s += 2) {
                const t1 = s / steps;
                const t2 = Math.min((s + 1) / steps, 1);
                ctx.beginPath();
                ctx.moveTo(p1.x + dx * t1, p1.y + dy * t1);
                ctx.lineTo(p1.x + dx * t2, p1.y + dy * t2);
                ctx.stroke();
            }
        }
    }

    _drawBackstitch(ctx, path) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
    }

    _drawSatinStitch(ctx, path) {
        const originalWidth = ctx.lineWidth;
        ctx.lineWidth = this.state.gridSize * 0.8;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
        ctx.lineWidth = originalWidth;
    }

    _drawFrenchKnot(ctx, path) {
        const radius = this.state.gridSize * 0.3;
        path.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    getPathBounds(path) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of path) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return { minX, minY, maxX, maxY };
    }

    redrawAll(paths, selectedIndex) {
        const { canvasWidth, canvasHeight } = this.state;
        this.mainCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        paths.forEach((path, index) => {
            if (path && path.length > 0) {
                this._drawStitch(this.mainCtx, path, path[0].type);
                if (index === selectedIndex) {
                    this._drawSelectionBox(path);
                }
            }
        });
    }

    _drawSelectionBox(path) {
        const bounds = this.getPathBounds(path);
        this.mainCtx.save();
        this.mainCtx.strokeStyle = '#667eea';
        this.mainCtx.lineWidth = 2;
        this.mainCtx.setLineDash([5, 5]);
        this.mainCtx.beginPath();
        this.mainCtx.rect(
            bounds.minX - 5,
            bounds.minY - 5,
            bounds.maxX - bounds.minX + 10,
            bounds.maxY - bounds.minY + 10
        );
        this.mainCtx.stroke();
        this.mainCtx.restore();
    }

    renderToContext(ctx, paths, bgColor) {
        const { canvasWidth, canvasHeight } = this.state;
        if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        paths.forEach(path => {
            if (path && path.length > 0) {
                this._drawStitch(ctx, path, path[0].type);
            }
        });
    }

    setCursor(cursor) {
        this.drawCanvas.style.cursor = cursor;
    }

    getCanvasCoords(e) {
        const rect = this.drawCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.state.zoom;
        const y = (e.clientY - rect.top) / this.state.zoom;
        return this.state.snapPoint(x, y);
    }
}
