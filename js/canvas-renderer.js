// 画布渲染模块：负责管理三层 Canvas、底图与所有绘制操作。
// 不感知 UI 控件，只接受 EditorState 的引用作为绘制依据。
import { getPathBounds } from './geometry.js';

export class CanvasRenderer {
    /**
     * @param {EditorState} state 共享的状态对象
     */
    constructor(state) {
        this.state = state;

        this.mainCanvas = document.getElementById('mainCanvas');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.drawCanvas = document.getElementById('drawCanvas');
        this.bgImage = document.getElementById('bgImage');
        this.wrapper = document.querySelector('.canvas-wrapper');

        this.mainCtx = this.mainCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.drawCtx = this.drawCanvas.getContext('2d');

        this.applyCanvasSize();
    }

    /**
     * 同步画布元素的像素尺寸与 zoom 缩放。
     */
    applyCanvasSize() {
        const { canvasWidth, canvasHeight } = this.state;
        [this.mainCanvas, this.gridCanvas, this.drawCanvas].forEach(canvas => {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
        });
        this.applyZoom();
    }

    /**
     * 应用缩放至所有画布与底图，并刷新外层容器尺寸。
     */
    applyZoom() {
        const scale = this.state.zoom;
        const transform = `scale(${scale})`;

        this.drawCanvas.style.transform = transform;
        this.gridCanvas.style.transform = transform;
        this.mainCanvas.style.transform = transform;
        this.bgImage.style.transform = transform;

        this.wrapper.style.width = `${this.state.canvasWidth * scale}px`;
        this.wrapper.style.height = `${this.state.canvasHeight * scale}px`;
    }

    /**
     * 切换网格显示。
     */
    setGridVisible(visible) {
        this.gridCanvas.style.opacity = visible ? '1' : '0';
    }

    /**
     * 设置底图透明度。
     */
    setBgOpacity(opacity) {
        this.bgImage.style.opacity = opacity;
    }

    /**
     * 显示底图（使用已存在于 state 的底图数据），并按画布尺寸自适应。
     */
    showBgImage() {
        const { bgImageData, bgOpacity, bgImageWidth, bgImageHeight } = this.state;
        if (!bgImageData) return;

        this.bgImage.src = bgImageData;
        this.bgImage.style.display = 'block';
        this.bgImage.style.opacity = bgOpacity;
        if (bgImageWidth && bgImageHeight) {
            this.bgImage.width = bgImageWidth;
            this.bgImage.height = bgImageHeight;
        }
    }

    /**
     * 隐藏底图。
     */
    hideBgImage() {
        this.bgImage.src = '';
        this.bgImage.style.display = 'none';
    }

    /**
     * 加载并展示新底图，按画布尺寸保持长宽比缩放。
     * @param {string} dataUrl base64 数据地址
     */
    loadBgImage(dataUrl) {
        this.state.bgImageData = dataUrl;
        this.bgImage.src = dataUrl;
        this.bgImage.style.display = 'block';
        this.bgImage.style.opacity = this.state.bgOpacity;
        this.bgImage.onload = () => {
            const { canvasWidth, canvasHeight } = this.state;
            const scale = Math.min(
                canvasWidth / this.bgImage.naturalWidth,
                canvasHeight / this.bgImage.naturalHeight
            );
            this.state.bgImageWidth = this.bgImage.naturalWidth * scale;
            this.state.bgImageHeight = this.bgImage.naturalHeight * scale;
            this.bgImage.width = this.state.bgImageWidth;
            this.bgImage.height = this.state.bgImageHeight;
        };
    }

    /**
     * 清除底图。
     */
    clearBgImage() {
        this.state.bgImageData = null;
        this.state.bgImageWidth = 0;
        this.state.bgImageHeight = 0;
        this.hideBgImage();
    }

    /**
     * 绘制网格线。
     */
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

    /**
     * 清空预览层。
     */
    clearPreview() {
        const { canvasWidth, canvasHeight } = this.state;
        this.drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    /**
     * 在预览层渲染当前正在绘制的临时路径。
     */
    drawPreview() {
        this.clearPreview();
        const { currentPath, currentTool, threadSettings, canvasWidth, canvasHeight } = this.state;
        if (currentPath.length === 0) return;

        // 预览路径首点尚未带 thread 信息时，使用当前 threadSettings
        this.drawCtx.strokeStyle = threadSettings.color;
        this.drawCtx.fillStyle = threadSettings.color;
        this.drawCtx.lineWidth = threadSettings.strands;
        this.drawCtx.lineCap = 'round';
        this.drawCtx.lineJoin = 'round';

        this.drawStitch(this.drawCtx, currentPath, currentTool);
        // 防御性：避免预览意外影响其它绘制（实际 drawStitch 中已 set，但确保一致）
        void canvasWidth; void canvasHeight;
    }

    /**
     * 重绘主画布上的所有已保存路径，并标记选中路径包围盒。
     */
    redrawAll() {
        const { canvasWidth, canvasHeight, paths, selectedPathIndex } = this.state;
        this.mainCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        paths.forEach((path, index) => {
            if (path.length === 0) return;

            this.drawStitch(this.mainCtx, path, path[0].type);

            if (index === selectedPathIndex) {
                this.drawSelectionOutline(path);
            }
        });
    }

    /**
     * 绘制选中路径的虚线包围盒。
     */
    drawSelectionOutline(path) {
        const ctx = this.mainCtx;
        const bounds = getPathBounds(path);
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
        ctx.setLineDash([]);
    }

    /**
     * 通用针法绘制入口，按 type 分发到具体实现。
     */
    drawStitch(ctx, path, type) {
        if (!path || path.length === 0) return;

        const { color, strands } = path[0];
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
                // 未知类型不绘制，避免异常
                break;
        }
    }

    /**
     * 平针：交替段绘制虚线效果。
     */
    drawRunningStitch(ctx, path) {
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

    /**
     * 回针：连续直线，无间隔。
     */
    drawBackstitch(ctx, path) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
    }

    /**
     * 缎面针：以网格 0.8 倍宽度绘制粗线，结束后还原 lineWidth。
     */
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

    /**
     * 结粒针：在每个控制点绘制实心圆。
     */
    drawFrenchKnot(ctx, path) {
        const radius = this.state.gridSize * 0.3;
        path.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
