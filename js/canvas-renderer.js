import { getPathBounds } from './utils.js';

export class CanvasRenderer {
    constructor() {
        this.mainCanvas = null;
        this.gridCanvas = null;
        this.drawCanvas = null;
        this.bgImage = null;
        this.canvasWrapper = null;
        this.mainCtx = null;
        this.gridCtx = null;
        this.drawCtx = null;
    }

    setupCanvas(elements, canvasWidth, canvasHeight) {
        this.mainCanvas = elements.mainCanvas;
        this.gridCanvas = elements.gridCanvas;
        this.drawCanvas = elements.drawCanvas;
        this.bgImage = elements.bgImage;
        this.canvasWrapper = elements.canvasWrapper;

        this.mainCanvas.width = canvasWidth;
        this.mainCanvas.height = canvasHeight;
        this.gridCanvas.width = canvasWidth;
        this.gridCanvas.height = canvasHeight;
        this.drawCanvas.width = canvasWidth;
        this.drawCanvas.height = canvasHeight;

        this.mainCtx = this.mainCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.drawCtx = this.drawCanvas.getContext('2d');
    }

    updateCanvasDimensions(canvasWidth, canvasHeight) {
        this.mainCanvas.width = canvasWidth;
        this.mainCanvas.height = canvasHeight;
        this.gridCanvas.width = canvasWidth;
        this.gridCanvas.height = canvasHeight;
        this.drawCanvas.width = canvasWidth;
        this.drawCanvas.height = canvasHeight;
    }

    resizeCanvas(zoom, canvasWidth, canvasHeight) {
        this.drawCanvas.style.transform = `scale(${zoom})`;
        this.gridCanvas.style.transform = `scale(${zoom})`;
        this.mainCanvas.style.transform = `scale(${zoom})`;
        this.bgImage.style.transform = `scale(${zoom})`;

        if (this.canvasWrapper) {
            this.canvasWrapper.style.width = `${canvasWidth * zoom}px`;
            this.canvasWrapper.style.height = `${canvasHeight * zoom}px`;
        }
    }

    drawGrid(canvasWidth, canvasHeight, gridSize) {
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

    drawPreview(currentPath, threadSettings, currentTool, canvasWidth, canvasHeight, gridSize) {
        this.drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (currentPath.length === 0) return;

        this.renderStitch(this.drawCtx, currentPath, currentTool, gridSize);
    }

    clearPreview(canvasWidth, canvasHeight) {
        this.drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    renderStitch(ctx, path, type, gridSize) {
        if (path.length === 0) return;

        ctx.strokeStyle = path[0].color;
        ctx.fillStyle = path[0].color;
        ctx.lineWidth = path[0].strands;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (type) {
            case 'running':
                this._drawRunningStitch(ctx, path, gridSize);
                break;
            case 'backstitch':
                this._drawBackstitch(ctx, path);
                break;
            case 'satin':
                this._drawSatinStitch(ctx, path, gridSize);
                break;
            case 'frenchKnot':
                this._drawFrenchKnot(ctx, path, gridSize);
                break;
        }
    }

    redrawAll(paths, selectedPathIndex, canvasWidth, canvasHeight, gridSize) {
        this.mainCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        paths.forEach((path, index) => {
            if (path.length > 0) {
                this.renderStitch(this.mainCtx, path, path[0].type, gridSize);

                if (index === selectedPathIndex) {
                    this._drawSelectionHighlight(this.mainCtx, path);
                }
            }
        });
    }

    renderToOffscreen(paths, canvasWidth, canvasHeight, gridSize) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const ctx = tempCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        paths.forEach(path => {
            if (path.length > 0) {
                this.renderStitch(ctx, path, path[0].type, gridSize);
            }
        });

        return tempCanvas;
    }

    _drawRunningStitch(ctx, path, gridSize) {
        const stitchLength = gridSize;

        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
            const steps = Math.max(1, Math.floor(dist / stitchLength));

            for (let s = 0; s < steps; s += 2) {
                const t1 = s / steps;
                const t2 = Math.min((s + 1) / steps, 1);

                ctx.beginPath();
                ctx.moveTo(
                    p1.x + (p2.x - p1.x) * t1,
                    p1.y + (p2.y - p1.y) * t1
                );
                ctx.lineTo(
                    p1.x + (p2.x - p1.x) * t2,
                    p1.y + (p2.y - p1.y) * t2
                );
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

    _drawSatinStitch(ctx, path, gridSize) {
        ctx.save();
        ctx.lineWidth = gridSize * 0.8;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }

    _drawFrenchKnot(ctx, path, gridSize) {
        const radius = gridSize * 0.3;
        path.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    _drawSelectionHighlight(ctx, path) {
        const bounds = getPathBounds(path);
        ctx.save();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.rect(
            bounds.minX - 5,
            bounds.minY - 5,
            bounds.maxX - bounds.minX + 10,
            bounds.maxY - bounds.minY + 10
        );
        ctx.stroke();
        ctx.restore();
    }
}
