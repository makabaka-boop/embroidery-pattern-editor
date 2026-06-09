/**
 * 工具控制器 - 处理工具切换和鼠标交互事件
 * 负责不同工具（平针、回针、选择、橡皮擦等）的行为
 */
class ToolController {
    constructor(stateManager, canvasRenderer) {
        this.state = stateManager;
        this.renderer = canvasRenderer;
        this.drawCanvas = null;

        this.cursors = {
            running: 'crosshair',
            backstitch: 'crosshair',
            satin: 'crosshair',
            frenchKnot: 'crosshair',
            select: 'pointer',
            eraser: 'not-allowed'
        };
    }

    init() {
        this.drawCanvas = this.renderer.getDrawCanvas();
        if (!this.drawCanvas) {
            console.error('Draw canvas not found');
            return false;
        }

        this.bindEvents();
        this.updateCursor();

        this.state.on('toolChange', () => this.updateCursor());

        return true;
    }

    bindEvents() {
        this.drawCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.drawCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.drawCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.drawCanvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
    }

    handleMouseDown(e) {
        if (e.button !== 0) return;

        const coords = this.renderer.getCanvasCoords(e.clientX, e.clientY);
        const tool = this.state.currentTool;

        switch (tool) {
            case 'select':
                this.handleSelectTool(coords);
                break;
            case 'eraser':
                this.handleEraserTool(coords);
                break;
            default:
                this.handleDrawingStart(coords);
        }
    }

    handleMouseMove(e) {
        if (!this.state.isDrawing) return;

        const coords = this.renderer.getCanvasCoords(e.clientX, e.clientY);
        const point = this.state.createPathPoint(coords.x, coords.y);
        this.state.addDrawingPoint(point);
    }

    handleMouseUp(e) {
        if (this.state.isDrawing) {
            this.state.finishDrawing();
        }
    }

    handleMouseLeave(e) {
        if (this.state.isDrawing) {
            this.state.finishDrawing();
        }
    }

    handleSelectTool(coords) {
        this.state.selectPathAt(coords.x, coords.y);
    }

    handleEraserTool(coords) {
        this.state.eraseAt(coords.x, coords.y);
    }

    handleDrawingStart(coords) {
        const point = this.state.createPathPoint(coords.x, coords.y);
        this.state.startDrawing(point);
    }

    updateCursor() {
        if (!this.drawCanvas) return;
        const cursor = this.cursors[this.state.currentTool] || 'crosshair';
        this.drawCanvas.style.cursor = cursor;
    }

    getAvailableTools() {
        return Object.keys(this.cursors);
    }

    isDrawingTool(tool) {
        return ['running', 'backstitch', 'satin', 'frenchKnot'].includes(tool);
    }

    isSelectionTool(tool) {
        return tool === 'select';
    }

    isEraserTool(tool) {
        return tool === 'eraser';
    }
}
