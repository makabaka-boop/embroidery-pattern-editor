/**
 * 画布渲染器 - 负责所有画布绘制工作
 * 包含网格、针法、选中状态、预览绘制等
 */
class CanvasRenderer {
    constructor(stateManager) {
        this.state = stateManager;
        this.mainCanvas = null;
        this.gridCanvas = null;
        this.drawCanvas = null;
        this.bgImage = null;
        this.mainCtx = null;
        this.gridCtx = null;
        this.drawCtx = null;
        this.canvasWrapper = null;
    }

    init() {
        this.mainCanvas = document.getElementById('mainCanvas');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.drawCanvas = document.getElementById('drawCanvas');
        this.bgImage = document.getElementById('bgImage');
        this.canvasWrapper = document.querySelector('.canvas-wrapper');

        if (!this.mainCanvas || !this.gridCanvas || !this.drawCanvas) {
            console.error('Canvas elements not found');
            return false;
        }

        this.mainCtx = this.mainCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.drawCtx = this.drawCanvas.getContext('2d');

        this.setupCanvasSize();
        this.resizeCanvas();
        this.drawGrid();
        this.redrawAll();

        this.state.on('gridSizeChange', () => this.drawGrid());
        this.state.on('pathsChange', () => this.redrawAll());
        this.state.on('selectionChange', () => this.redrawAll());
        this.state.on('zoomChange', () => {
            this.resizeCanvas();
            this.drawGrid();
        });
        this.state.on('showGridChange', (show) => {
            this.gridCanvas.style.opacity = show ? '1' : '0';
        });
        this.state.on('bgOpacityChange', (opacity) => {
            this.bgImage.style.opacity = opacity;
        });
        this.state.on('bgImageChange', (bg) => this.updateBackgroundImage(bg));
        this.state.on('canvasSizeChange', () => {
            this.setupCanvasSize();
            this.resizeCanvas();
            this.drawGrid();
            this.redrawAll();
        });
        this.state.on('drawingUpdate', (data) => this.drawPreview(data.path));
        this.state.on('drawingEnd', () => this.clearPreview());
        this.state.on('drawingCancel', () => this.clearPreview());

        return true;
    }

    setupCanvasSize() {
        this.mainCanvas.width = this.state.canvasWidth;
        this.mainCanvas.height = this.state.canvasHeight;
        this.gridCanvas.width = this.state.canvasWidth;
        this.gridCanvas.height = this.state.canvasHeight;
        this.drawCanvas.width = this.state.canvasWidth;
        this.drawCanvas.height = this.state.canvasHeight;
    }

    resizeCanvas() {
        const scale = this.state.zoom;
        const transform = `scale(${scale})`;

        this.drawCanvas.style.transform = transform;
        this.gridCanvas.style.transform = transform;
        this.mainCanvas.style.transform = transform;
        this.bgImage.style.transform = transform;

        if (this.canvasWrapper) {
            this.canvasWrapper.style.width = `${this.state.canvasWidth * scale}px`;
            this.canvasWrapper.style.height = `${this.state.canvasHeight * scale}px`;
        }
    }

    updateBackgroundImage(bg) {
        if (!bg || !bg.data) {
            this.bgImage.src = '';
            this.bgImage.style.display = 'none';
            return;
        }

        this.bgImage.src = bg.data;
        this.bgImage.style.display = 'block';
        this.bgImage.style.opacity = this.state.bgOpacity;
        this.bgImage.width = bg.width || 0;
        this.bgImage.height = bg.height || 0;
    }

    drawGrid() {
        if (!this.gridCtx) return;

        this.gridCtx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
        this.gridCtx.strokeStyle = '#e5e7eb';
        this.gridCtx.lineWidth = 0.5;

        for (let x = 0; x <= this.state.canvasWidth; x += this.state.gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, this.state.canvasHeight);
            this.gridCtx.stroke();
        }

        for (let y = 0; y <= this.state.canvasHeight; y += this.state.gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(this.state.canvasWidth, y);
            this.gridCtx.stroke();
        }
    }

    redrawAll() {
        if (!this.mainCtx) return;

        this.mainCtx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

        this.state.paths.forEach((path, index) => {
            if (path.length === 0) return;

            this.drawStitch(this.mainCtx, path, path[0].type);

            if (index === this.state.selectedPathIndex) {
                this.drawSelectionBox(this.mainCtx, path);
            }
        });
    }

    drawSelectionBox(ctx, path) {
        const bounds = this.state.getPathBounds(path);

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

    drawPreview(path) {
        if (!this.drawCtx || !path || path.length === 0) return;

        this.drawCtx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

        this.drawCtx.save();
        this.drawCtx.strokeStyle = this.state.threadSettings.color;
        this.drawCtx.fillStyle = this.state.threadSettings.color;
        this.drawCtx.lineWidth = this.state.threadSettings.strands;
        this.drawCtx.lineCap = 'round';
        this.drawCtx.lineJoin = 'round';

        this.drawStitch(this.drawCtx, path, this.state.currentTool);
        this.drawCtx.restore();
    }

    clearPreview() {
        if (!this.drawCtx) return;
        this.drawCtx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
    }

    drawStitch(ctx, path, type) {
        if (!path || path.length === 0) return;

        const color = path[0].color;
        const strands = path[0].strands;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = strands;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (type) {
            case 'running':
                this.drawRunningStitch(ctx, path);
                break;
            case 'backstitch':
                this.drawBackstitch(ctx, path);
                break;
            case 'satin':
                this.drawSatinStitch(ctx, path);
                break;
            case 'frenchKnot':
                this.drawFrenchKnot(ctx, path);
                break;
            default:
                console.warn(`Unknown stitch type: ${type}`);
        }

        ctx.restore();
    }

    drawRunningStitch(ctx, path) {
        const stitchLength = this.state.gridSize;

        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
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

    drawBackstitch(ctx, path) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);

        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
    }

    drawSatinStitch(ctx, path) {
        const originalLineWidth = ctx.lineWidth;
        ctx.lineWidth = this.state.gridSize * 0.8;

        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);

        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();

        ctx.lineWidth = originalLineWidth;
    }

    drawFrenchKnot(ctx, path) {
        const radius = this.state.gridSize * 0.3;

        path.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    getCanvasCoords(clientX, clientY) {
        const rect = this.drawCanvas.getBoundingClientRect();
        const x = (clientX - rect.left) / this.state.zoom;
        const y = (clientY - rect.top) / this.state.zoom;
        return this.state.snapToGridCoords(x, y);
    }

    getDrawCanvas() {
        return this.drawCanvas;
    }
}
