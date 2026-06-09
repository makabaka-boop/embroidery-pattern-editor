// 应用入口：组合各模块并完成初始化。
// 业务逻辑分布在 js/ 目录下的独立模块中，本文件仅负责装配。
import { EditorState } from './js/state.js';
import { CanvasRenderer } from './js/canvas-renderer.js';
import { HistoryManager } from './js/history-manager.js';
import { ToolController } from './js/tool-controller.js';
import { UIManager } from './js/ui-manager.js';

class EmbroideryEditor {
    constructor() {
        this.state = new EditorState();
        this.renderer = new CanvasRenderer(this.state);
        this.history = new HistoryManager(this.state);
        this.tools = new ToolController(this.state, this.renderer, this.history, {
            onPathsChanged: () => this.ui.updateUI(),
            onSelectionChanged: () => this.ui.updateSelectedPathInfo()
        });
        this.ui = new UIManager(this.state, this.renderer, this.history, this.tools);
    }

    init() {
        this.renderer.drawGrid();
        this.ui.init();
    }
}

const editor = new EmbroideryEditor();
editor.init();

// 暴露到 window 仅用于调试，UI 不再依赖全局变量
window.__embroideryEditor = editor;
