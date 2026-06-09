import { StateManager } from './js/state-manager.js';
import { CanvasRenderer } from './js/canvas-renderer.js';
import { ToolController } from './js/tool-controller.js';
import { ProjectStorage } from './js/project-storage.js';
import { ExportManager } from './js/export-manager.js';
import { StepGenerator } from './js/step-generator.js';
import { UIController } from './js/ui-controller.js';

class EmbroideryEditorApp {
    constructor() {
        this.state = new StateManager();
        this.renderer = new CanvasRenderer(this.state);
        this.tools = new ToolController(this.state, this.renderer);
        this.storage = new ProjectStorage(this.state);
        this.exporter = new ExportManager(this.state, this.renderer);
        this.steps = new StepGenerator(this.state);
        this.ui = new UIController(this.state);

        this._bindStateEvents();
    }

    init() {
        this.renderer.init();
        this.ui.init();
        this.tools.init(document.getElementById('drawCanvas'));
        this._bindUIEvents();
        this.renderer.drawGrid();
        this.ui.updateAll();
    }

    _bindStateEvents() {
        this.state.on('toolChanged', () => {
            this.tools.updateCursor();
        });

        this.state.on('pathsChanged', () => {
            this.renderer.redrawAll(this.state.paths, this.state.selectedPathIndex);
            this.ui.updateAll();
        });

        this.state.on('selectionChanged', () => {
            this.renderer.redrawAll(this.state.paths, this.state.selectedPathIndex);
            this.ui.updateSelectedPathInfo();
        });

        this.state.on('undoRedoChanged', ({ canUndo, canRedo }) => {
            this.ui.el.undoBtn.disabled = !canUndo;
            this.ui.el.redoBtn.disabled = !canRedo;
        });

        this.state.on('canvasSettingsChanged', (settings) => {
            if (settings.zoom !== undefined) this.renderer.applyZoom();
            if (settings.gridSize !== undefined) {
                this.renderer.drawGrid();
                this.renderer.redrawAll(this.state.paths, this.state.selectedPathIndex);
            }
            if (settings.showGrid !== undefined) {
                this.renderer.setGridVisible(settings.showGrid);
            }
        });

        this.state.on('backgroundChanged', ({ dataUrl, width, height }) => {
            this.ui.applyBackground(dataUrl, width, height);
        });

        this.state.on('pathUpdated', (path) => {
            this.renderer.drawPreviewPath(path);
        });

        this.state.on('stateLoaded', (settings) => {
            this.renderer.setCanvasSize(settings.canvasWidth, settings.canvasHeight);
            this.renderer.applyZoom();
            this.renderer.drawGrid();
            this.renderer.setGridVisible(settings.showGrid);
            this.ui.applyBackground(settings.bgImageData, settings.bgImageWidth, settings.bgImageHeight);
            if (this.ui.el.bgImage && settings.bgImageData) {
                this.ui.el.bgImage.style.opacity = settings.bgOpacity;
            }
            this.ui._syncInputsFromState();
        });
    }

    _bindUIEvents() {
        this.ui.bindEvents();

        this.ui.on('toolSelected', (tool) => {
            this.state.setTool(tool);
        });

        this.ui.on('threadSettingsChanged', (settings) => {
            this.state.setThreadSettings(settings);
        });

        this.ui.on('gridSizeChanged', (val) => {
            this.state.setCanvasSettings({ gridSize: val });
        });

        this.ui.on('zoomChanged', (val) => {
            this.state.setCanvasSettings({ zoom: val });
        });

        this.ui.on('snapToGridChanged', (val) => {
            this.state.setCanvasSettings({ snapToGrid: val });
        });

        this.ui.on('showGridChanged', (val) => {
            this.state.setCanvasSettings({ showGrid: val });
        });

        this.ui.on('bgOpacityChanged', (val) => {
            this.state.setCanvasSettings({ bgOpacity: val });
            if (this.ui.el.bgImage) {
                this.ui.el.bgImage.style.opacity = val;
            }
        });

        this.ui.on('backgroundUploaded', ({ dataUrl, naturalWidth, naturalHeight }) => {
            this.state.setBackgroundImage(dataUrl, naturalWidth, naturalHeight);
        });

        this.ui.on('backgroundCleared', () => {
            this.state.clearBackgroundImage();
        });

        this.ui.on('undo', () => this.state.undo());
        this.ui.on('redo', () => this.state.redo());
        this.ui.on('clearAll', () => this.state.clearAll());
        this.ui.on('deleteSelectedPath', () => {
            if (this.state.selectedPathIndex >= 0) {
                this.state.deletePath(this.state.selectedPathIndex);
            }
        });

        this.ui.on('saveProject', () => this._handleSaveProject());
        this.ui.on('showLoadModal', () => this._handleShowLoadModal());
        this.ui.on('exportPNG', () => this.exporter.exportPNG(this.ui.getProjectName()));
        this.ui.on('exportSVG', () => this.exporter.exportSVG(this.ui.getProjectName()));
        this.ui.on('exportJSON', () => this.exporter.exportJSON(this.ui.getProjectName()));
        this.ui.on('generateSteps', () => this._handleGenerateSteps());
    }

    _handleSaveProject() {
        const result = this.storage.saveProject(this.ui.getProjectName(), (action, name) => {
            if (action === 'overwrite') {
                return this.ui.confirm('已存在同名方案，是否覆盖？');
            }
            return true;
        });
        if (result.success) {
            this.ui.showAlert('保存成功！');
        }
    }

    _handleShowLoadModal() {
        const projects = this.storage.listProjects();
        this.ui.renderLoadList(projects,
            (id) => this._handleLoadProject(id),
            (id) => this._handleDeleteProject(id)
        );
        this.ui.el.loadModal.classList.add('show');
    }

    _handleLoadProject(id) {
        const project = this.storage.loadProject(id);
        if (!project) return;
        this.ui.setProjectName(project.name);
        this.state.loadState(project);
        this.renderer.redrawAll(this.state.paths, -1);
        this.ui.updateAll();
        this.ui.hideLoadModal();
    }

    _handleDeleteProject(id) {
        this.storage.deleteProject(id);
        this._handleShowLoadModal();
    }

    _handleGenerateSteps() {
        const steps = this.steps.generate();
        const html = this.steps.renderToHTML(steps);
        this.ui.showStepsModal(html);
    }
}

const editor = new EmbroideryEditorApp();
window.editor = editor;
document.addEventListener('DOMContentLoaded', () => editor.init());
