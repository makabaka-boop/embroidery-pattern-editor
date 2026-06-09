import { STITCH_TYPES, EXPORT, TOOL_CURSORS } from './constants.js';

export class ToolController {
    constructor(state, renderer) {
        this.state = state;
        this.renderer = renderer;
        this.canvas = null;
        this._onMouseDown = this._handleMouseDown.bind(this);
        this._onMouseMove = this._handleMouseMove.bind(this);
        this._onMouseUp = this._handleMouseUp.bind(this);
        this._onMouseLeave = this._handleMouseUp.bind(this);
    }

    init(canvasEl) {
        this.canvas = canvasEl;
        this.canvas.addEventListener('mousedown', this._onMouseDown);
        this.canvas.addEventListener('mousemove', this._onMouseMove);
        this.canvas.addEventListener('mouseup', this._onMouseUp);
        this.canvas.addEventListener('mouseleave', this._onMouseLeave);
        this.updateCursor();
    }

    updateCursor() {
        const cursor = TOOL_CURSORS[this.state.currentTool] || 'crosshair';
        this.renderer.setCursor(cursor);
    }

    _handleMouseDown(e) {
        const coords = this.renderer.getCanvasCoords(e);

        switch (this.state.currentTool) {
            case STITCH_TYPES.SELECT:
                this._handleSelect(coords.x, coords.y);
                break;
            case STITCH_TYPES.ERASER:
                this._handleErase(coords.x, coords.y);
                break;
            default:
                this._handleDrawStart(coords.x, coords.y);
                break;
        }
    }

    _handleMouseMove(e) {
        if (!this.state.isDrawing) return;
        const coords = this.renderer.getCanvasCoords(e);
        this.state.addPathPoint(coords.x, coords.y);
        this.renderer.drawPreviewPath(this.state.currentPath);
    }

    _handleMouseUp() {
        if (!this.state.isDrawing) return;
        this.state.endPath();
        this.renderer.clearPreview();
    }

    _handleSelect(x, y) {
        const hitIndex = this.state.findPathAt(x, y, EXPORT.SELECTION_THRESHOLD);
        this.state.selectPath(hitIndex);
    }

    _handleErase(x, y) {
        this.state.erasePathAt(x, y, EXPORT.HIT_TEST_THRESHOLD);
    }

    _handleDrawStart(x, y) {
        this.state.beginPath(x, y);
        this.renderer.drawPreviewPath(this.state.currentPath);
    }

    destroy() {
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this._onMouseDown);
            this.canvas.removeEventListener('mousemove', this._onMouseMove);
            this.canvas.removeEventListener('mouseup', this._onMouseUp);
            this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
        }
    }
}
