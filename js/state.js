// 应用状态容器：集中维护画布、绣线、路径、底图等数据。
// 仅负责数据结构与简单的数据语义，不涉及 DOM 操作。
import { DEFAULT_STATE, DEFAULT_THREAD } from './constants.js';

export class EditorState {
    constructor() {
        // 画布与显示
        this.canvasWidth = DEFAULT_STATE.canvasWidth;
        this.canvasHeight = DEFAULT_STATE.canvasHeight;
        this.gridSize = DEFAULT_STATE.gridSize;
        this.zoom = DEFAULT_STATE.zoom;
        this.snapToGrid = DEFAULT_STATE.snapToGrid;
        this.showGrid = DEFAULT_STATE.showGrid;
        this.bgOpacity = DEFAULT_STATE.bgOpacity;

        // 底图
        this.bgImageData = null;
        this.bgImageWidth = 0;
        this.bgImageHeight = 0;

        // 绘制状态
        this.currentTool = 'running';
        this.isDrawing = false;
        this.currentPath = [];
        this.paths = [];
        this.selectedPathIndex = -1;

        // 绣线设置
        this.threadSettings = { ...DEFAULT_THREAD };
    }

    /**
     * 是否存在选中路径。
     */
    hasSelection() {
        return this.selectedPathIndex >= 0 && this.selectedPathIndex < this.paths.length;
    }

    /**
     * 获取选中路径，未选中时返回 null。
     */
    getSelectedPath() {
        return this.hasSelection() ? this.paths[this.selectedPathIndex] : null;
    }

    /**
     * 重置选中状态。
     */
    clearSelection() {
        this.selectedPathIndex = -1;
    }

    /**
     * 应用从持久化层加载的方案数据。
     * 缺失字段使用默认值兜底，避免出现 undefined。
     */
    applyProject(project) {
        this.canvasWidth = project.canvasWidth ?? DEFAULT_STATE.canvasWidth;
        this.canvasHeight = project.canvasHeight ?? DEFAULT_STATE.canvasHeight;
        this.gridSize = project.gridSize ?? DEFAULT_STATE.gridSize;
        this.zoom = project.zoom ?? DEFAULT_STATE.zoom;
        this.snapToGrid = project.snapToGrid ?? DEFAULT_STATE.snapToGrid;
        this.showGrid = project.showGrid ?? DEFAULT_STATE.showGrid;
        this.bgOpacity = project.bgOpacity ?? DEFAULT_STATE.bgOpacity;
        this.bgImageData = project.bgImageData ?? null;
        this.bgImageWidth = project.bgImageWidth ?? 0;
        this.bgImageHeight = project.bgImageHeight ?? 0;
        this.paths = Array.isArray(project.paths) ? project.paths : [];
        this.clearSelection();
    }
}
