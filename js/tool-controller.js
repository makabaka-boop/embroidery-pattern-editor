// 工具控制器：处理鼠标事件 -> 路径数据，包含选择 / 橡皮擦 / 绘制三类逻辑。
import { isPathHit, distance } from './geometry.js';
import { SELECT_THRESHOLD } from './constants.js';

export class ToolController {
    /**
     * @param {EditorState} state
     * @param {CanvasRenderer} renderer
     * @param {HistoryManager} history
     * @param {{ onPathsChanged: Function, onSelectionChanged: Function }} callbacks
     */
    constructor(state, renderer, history, callbacks = {}) {
        this.state = state;
        this.renderer = renderer;
        this.history = history;
        this.callbacks = callbacks;
    }

    /**
     * 将鼠标事件坐标转换为画布坐标，必要时吸附到网格。
     */
    getCanvasCoords(event) {
        const rect = this.renderer.drawCanvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / this.state.zoom;
        const y = (event.clientY - rect.top) / this.state.zoom;

        if (this.state.snapToGrid) {
            const { gridSize } = this.state;
            return {
                x: Math.round(x / gridSize) * gridSize,
                y: Math.round(y / gridSize) * gridSize
            };
        }
        return { x, y };
    }

    handleMouseDown(event) {
        const coords = this.getCanvasCoords(event);

        if (this.state.currentTool === 'select') {
            this.selectPathAt(coords.x, coords.y);
            return;
        }

        if (this.state.currentTool === 'eraser') {
            this.eraseAt(coords.x, coords.y);
            return;
        }

        // 进入绘制模式，创建临时路径首点
        this.state.isDrawing = true;
        this.state.currentPath = [this.makePoint(coords)];
        this.renderer.drawPreview();
    }

    handleMouseMove(event) {
        if (!this.state.isDrawing) return;

        const coords = this.getCanvasCoords(event);
        const path = this.state.currentPath;
        const last = path[path.length - 1];

        // 仅在坐标变化时追加新点，避免重复绘制
        if (last.x !== coords.x || last.y !== coords.y) {
            path.push(this.makePoint(coords));
            this.renderer.drawPreview();
        }
    }

    handleMouseUp() {
        if (!this.state.isDrawing) return;
        this.state.isDrawing = false;

        const path = this.state.currentPath;
        const isFrenchKnot = this.state.currentTool === 'frenchKnot';
        const isValid = path.length >= 2 || (isFrenchKnot && path.length >= 1);

        if (isValid) {
            this.history.saveState();
            this.state.paths.push([...path]);
            this.renderer.redrawAll();
            this.notifyPathsChanged();
        }

        this.state.currentPath = [];
        this.renderer.clearPreview();
    }

    /**
     * 创建路径上的一个点，组合坐标 + 当前绣线设置 + 工具类型。
     */
    makePoint(coords) {
        return {
            x: coords.x,
            y: coords.y,
            ...this.state.threadSettings,
            type: this.state.currentTool
        };
    }

    /**
     * 在指定坐标查找最靠近的路径并选中。
     * 命中规则：路径中存在距离 (x, y) 小于阈值的控制点。
     */
    selectPathAt(x, y) {
        for (let i = this.state.paths.length - 1; i >= 0; i--) {
            if (isPathHit(this.state.paths[i], x, y, SELECT_THRESHOLD)) {
                this.state.selectedPathIndex = i;
                this.renderer.redrawAll();
                this.notifySelectionChanged();
                return;
            }
        }

        this.state.clearSelection();
        this.renderer.redrawAll();
        this.notifySelectionChanged();
    }

    /**
     * 在指定坐标命中的路径上执行删除（橡皮擦）。
     */
    eraseAt(x, y) {
        for (let i = this.state.paths.length - 1; i >= 0; i--) {
            if (isPathHit(this.state.paths[i], x, y, SELECT_THRESHOLD)) {
                this.history.saveState();
                this.state.paths.splice(i, 1);
                this.state.clearSelection();
                this.renderer.redrawAll();
                this.notifyPathsChanged();
                return;
            }
        }
    }

    /**
     * 删除指定索引的路径。
     */
    deletePath(index) {
        if (index < 0 || index >= this.state.paths.length) return;
        this.history.saveState();
        this.state.paths.splice(index, 1);
        this.state.clearSelection();
        this.renderer.redrawAll();
        this.notifyPathsChanged();
    }

    /**
     * 清空全部路径。
     */
    clearAll() {
        if (this.state.paths.length === 0) return;
        this.history.saveState();
        this.state.paths = [];
        this.state.clearSelection();
        this.renderer.redrawAll();
        this.notifyPathsChanged();
    }

    /**
     * 删除当前选中路径（如有）。
     */
    deleteSelected() {
        if (this.state.hasSelection()) {
            this.deletePath(this.state.selectedPathIndex);
        }
    }

    notifyPathsChanged() {
        this.callbacks.onPathsChanged?.();
    }

    notifySelectionChanged() {
        this.callbacks.onSelectionChanged?.();
    }

    // 暴露给外部使用的几何辅助（保留扩展点）
    static distance(a, b) {
        return distance(a, b);
    }
}
