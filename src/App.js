/**
 * 刺绣编辑器主应用入口
 * 整合所有模块，初始化应用程序
 */
class EmbroideryEditorApp {
    constructor() {
        this.state = null;
        this.renderer = null;
        this.tools = null;
        this.storage = null;
        this.exporter = null;
        this.stepsGenerator = null;
        this.ui = null;
    }

    init() {
        this.state = new StateManager();
        this.renderer = new CanvasRenderer(this.state);
        this.tools = new ToolController(this.state, this.renderer);
        this.storage = new StorageManager(this.state);
        this.exporter = new ExportManager(this.state, this.renderer);
        this.stepsGenerator = new StepsGenerator(this.state);
        this.ui = new UIController(this.state, this.storage, this.exporter, this.stepsGenerator);

        this.renderer.init();
        this.tools.init();
        this.ui.init();

        console.log('刺绣编辑器初始化完成');
        return this;
    }

    getState() {
        return this.state;
    }

    getRenderer() {
        return this.renderer;
    }

    getTools() {
        return this.tools;
    }

    getStorage() {
        return this.storage;
    }

    getExporter() {
        return this.exporter;
    }

    getStepsGenerator() {
        return this.stepsGenerator;
    }

    getUI() {
        return this.ui;
    }

    undo() {
        return this.state.undo();
    }

    redo() {
        return this.state.redo();
    }

    clearAll() {
        return this.state.clearAll();
    }

    deletePath(index) {
        return this.state.deletePath(index);
    }

    saveProject(name, overwrite) {
        return this.storage.saveProject(name, overwrite);
    }

    loadProject(id) {
        return this.storage.loadProject(id);
    }

    exportPNG(filename) {
        return this.exporter.exportPNG(filename);
    }

    exportSVG(filename) {
        return this.exporter.exportSVG(filename);
    }

    exportJSON(filename) {
        return this.exporter.exportJSON(filename);
    }

    generateSteps() {
        return this.stepsGenerator.generateSteps();
    }
}

let editor;

document.addEventListener('DOMContentLoaded', () => {
    editor = new EmbroideryEditorApp().init();
});
