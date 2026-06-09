import {
    DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, DEFAULT_GRID_SIZE,
    DEFAULT_ZOOM, DEFAULT_SNAP_TO_GRID, DEFAULT_SHOW_GRID, DEFAULT_BG_OPACITY,
    SELECTION_THRESHOLD
} from './js/constants.js';
import { distanceBetween } from './js/utils.js';
import { CanvasRenderer } from './js/canvas-renderer.js';
import { HistoryManager } from './js/history-manager.js';
import { ProjectStore } from './js/project-store.js';
import { ExportManager } from './js/export-manager.js';
import { StepGenerator } from './js/step-generator.js';
import { UIManager } from './js/ui-manager.js';

class EmbroideryEditor {
    constructor() {
        this.canvasWidth = DEFAULT_CANVAS_WIDTH;
        this.canvasHeight = DEFAULT_CANVAS_HEIGHT;
        this.gridSize = DEFAULT_GRID_SIZE;
        this.zoom = DEFAULT_ZOOM;
        this.snapToGrid = DEFAULT_SNAP_TO_GRID;
        this.showGrid = DEFAULT_SHOW_GRID;
        this.bgOpacity = DEFAULT_BG_OPACITY;
        this.bgImageData = null;
        this.bgImageWidth = 0;
        this.bgImageHeight = 0;

        this.currentTool = 'running';
        this.isDrawing = false;
        this.currentPath = [];
        this.paths = [];
        this.selectedPathIndex = -1;

        this.threadSettings = {
            number: 'DMC 666',
            color: '#ff0000',
            strands: 2,
            note: ''
        };

        this.renderer = new CanvasRenderer();
        this.history = new HistoryManager();
        this.store = new ProjectStore();
        this.exporter = new ExportManager();
        this.stepGenerator = new StepGenerator();
        this.ui = new UIManager();

        this.init();
    }

    init() {
        this.renderer.setupCanvas(this.ui.elements, this.canvasWidth, this.canvasHeight);
        this.renderer.resizeCanvas(this.zoom, this.canvasWidth, this.canvasHeight);
        this.renderer.drawGrid(this.canvasWidth, this.canvasHeight, this.gridSize);

        this.ui.bindEvents({
            onToolChange: (tool) => this.setTool(tool),
            onThreadNumberChange: (value) => { this.threadSettings.number = value; },
            onThreadColorChange: (value) => { this.threadSettings.color = value; },
            onThreadStrandsChange: (value) => { this.threadSettings.strands = parseInt(value); },
            onThreadNoteChange: (value) => { this.threadSettings.note = value; },
            onGridSizeChange: (value) => this.handleGridSizeChange(value),
            onZoomChange: (value) => this.handleZoomChange(value),
            onSnapToGridChange: (checked) => { this.snapToGrid = checked; },
            onShowGridChange: (checked) => this.handleShowGridChange(checked),
            onBgOpacityChange: (value) => this.handleBgOpacityChange(value),
            onBgImageChange: (file) => this.handleBgImageUpload(file),
            onClearBg: () => this.clearBgImage(),
            onUndo: () => this.undo(),
            onRedo: () => this.redo(),
            onClearAll: () => this.clearAll(),
            onSave: () => this.saveProject(),
            onLoad: () => this.showLoadModal(),
            onExportPNG: () => this.exportPNG(),
            onExportSVG: () => this.exportSVG(),
            onExportJSON: () => this.exportJSON(),
            onGenerateSteps: () => this.generateSteps(),
            onDeletePath: (index) => this.deletePath(index),
            onLoadProject: (id) => this.loadProject(id),
            onDeleteProject: (id) => this.deleteProject(id),
            onMouseDown: (e) => this.handleMouseDown(e),
            onMouseMove: (e) => this.handleMouseMove(e),
            onMouseUp: (e) => this.handleMouseUp(e),
            onKeyDown: (e) => this.handleKeyDown(e),
        });

        this.updateUI();
    }

    setTool(tool) {
        this.currentTool = tool;
        this.ui.updateCursor(tool);
    }

    handleGridSizeChange(value) {
        this.gridSize = parseInt(value);
        this.ui.elements.gridSizeValue.textContent = `${this.gridSize}px`;
        this.renderer.drawGrid(this.canvasWidth, this.canvasHeight, this.gridSize);
    }

    handleZoomChange(value) {
        this.zoom = parseInt(value) / 100;
        this.ui.elements.zoomValue.textContent = `${Math.round(this.zoom * 100)}%`;
        this.renderer.resizeCanvas(this.zoom, this.canvasWidth, this.canvasHeight);
        this.renderer.drawGrid(this.canvasWidth, this.canvasHeight, this.gridSize);
    }

    handleShowGridChange(checked) {
        this.showGrid = checked;
        this.ui.elements.gridCanvas.style.opacity = checked ? '1' : '0';
    }

    handleBgOpacityChange(value) {
        this.bgOpacity = parseInt(value) / 100;
        this.ui.elements.bgOpacityValue.textContent = `${Math.round(this.bgOpacity * 100)}%`;
        this.ui.elements.bgImage.style.opacity = this.bgOpacity;
    }

    handleBgImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            this.bgImageData = event.target.result;
            const bgImage = this.ui.elements.bgImage;
            bgImage.src = this.bgImageData;
            bgImage.style.display = 'block';
            bgImage.style.opacity = this.bgOpacity;
            bgImage.onload = () => {
                const scale = Math.min(
                    this.canvasWidth / bgImage.naturalWidth,
                    this.canvasHeight / bgImage.naturalHeight
                );
                this.bgImageWidth = bgImage.naturalWidth * scale;
                this.bgImageHeight = bgImage.naturalHeight * scale;
                bgImage.width = this.bgImageWidth;
                bgImage.height = this.bgImageHeight;
            };
        };
        reader.readAsDataURL(file);
    }

    clearBgImage() {
        this.bgImageData = null;
        this.bgImageWidth = 0;
        this.bgImageHeight = 0;
        const bgImage = this.ui.elements.bgImage;
        bgImage.src = '';
        bgImage.style.display = 'none';
        this.ui.elements.bgImageInput.value = '';
    }

    getCanvasCoords(e) {
        const rect = this.ui.elements.drawCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;

        if (this.snapToGrid) {
            return {
                x: Math.round(x / this.gridSize) * this.gridSize,
                y: Math.round(y / this.gridSize) * this.gridSize
            };
        }
        return { x, y };
    }

    handleMouseDown(e) {
        const coords = this.getCanvasCoords(e);

        if (this.currentTool === 'select') {
            this.selectPathAt(coords.x, coords.y);
            return;
        }

        if (this.currentTool === 'eraser') {
            this.eraseAt(coords.x, coords.y);
            return;
        }

        this.isDrawing = true;
        this.currentPath = [{
            x: coords.x,
            y: coords.y,
            ...this.threadSettings,
            type: this.currentTool
        }];

        this.renderer.drawPreview(
            this.currentPath, this.threadSettings, this.currentTool,
            this.canvasWidth, this.canvasHeight, this.gridSize
        );
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;

        const coords = this.getCanvasCoords(e);
        const lastPoint = this.currentPath[this.currentPath.length - 1];

        if (lastPoint.x !== coords.x || lastPoint.y !== coords.y) {
            this.currentPath.push({
                x: coords.x,
                y: coords.y,
                ...this.threadSettings,
                type: this.currentTool
            });
            this.renderer.drawPreview(
                this.currentPath, this.threadSettings, this.currentTool,
                this.canvasWidth, this.canvasHeight, this.gridSize
            );
        }
    }

    handleMouseUp() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentPath.length >= 2 || (this.currentTool === 'frenchKnot' && this.currentPath.length >= 1)) {
            this.history.push(this.paths);
            this.paths.push([...this.currentPath]);
            this.redrawAll();
            this.updateUI();
        }

        this.currentPath = [];
        this.renderer.clearPreview(this.canvasWidth, this.canvasHeight);
    }

    selectPathAt(x, y) {
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (const point of path) {
                if (distanceBetween(point.x, point.y, x, y) < SELECTION_THRESHOLD) {
                    this.selectedPathIndex = i;
                    this.redrawAll();
                    this.updateUI();
                    return;
                }
            }
        }

        this.selectedPathIndex = -1;
        this.redrawAll();
        this.updateUI();
    }

    eraseAt(x, y) {
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (const point of path) {
                if (distanceBetween(point.x, point.y, x, y) < SELECTION_THRESHOLD) {
                    this.history.push(this.paths);
                    this.paths.splice(i, 1);
                    this.selectedPathIndex = -1;
                    this.redrawAll();
                    this.updateUI();
                    return;
                }
            }
        }
    }

    deletePath(index) {
        if (index >= 0 && index < this.paths.length) {
            this.history.push(this.paths);
            this.paths.splice(index, 1);
            this.selectedPathIndex = -1;
            this.redrawAll();
            this.updateUI();
        }
    }

    undo() {
        const newPaths = this.history.undo(this.paths);
        if (newPaths !== null) {
            this.paths = newPaths;
            this.selectedPathIndex = -1;
            this.redrawAll();
            this.updateUI();
        }
    }

    redo() {
        const newPaths = this.history.redo(this.paths);
        if (newPaths !== null) {
            this.paths = newPaths;
            this.selectedPathIndex = -1;
            this.redrawAll();
            this.updateUI();
        }
    }

    clearAll() {
        if (this.paths.length === 0) return;
        if (!confirm('确定要清空所有针法吗？')) return;
        this.history.push(this.paths);
        this.paths = [];
        this.selectedPathIndex = -1;
        this.redrawAll();
        this.updateUI();
    }

    handleKeyDown(e) {
        const tag = e.target.tagName.toLowerCase();
        const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !inInput) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            } else if (e.key === 's' && !inInput) {
                e.preventDefault();
                this.saveProject();
            }
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
            if (this.selectedPathIndex >= 0) {
                this.deletePath(this.selectedPathIndex);
            }
        }
    }

    saveProject() {
        const projectName = this.ui.getProjectName();
        const project = {
            id: Date.now(),
            name: projectName,
            date: new Date().toLocaleString(),
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            gridSize: this.gridSize,
            zoom: this.zoom,
            snapToGrid: this.snapToGrid,
            showGrid: this.showGrid,
            bgOpacity: this.bgOpacity,
            bgImageData: this.bgImageData,
            bgImageWidth: this.bgImageWidth,
            bgImageHeight: this.bgImageHeight,
            paths: this.paths
        };

        if (this.store.save(project)) {
            alert('保存成功！');
        }
    }

    showLoadModal() {
        const projects = this.store.list();
        this.ui.showLoadModal(projects);
    }

    loadProject(id) {
        const project = this.store.load(id);
        if (!project) return;

        this.ui.elements.projectName.value = project.name;
        this.canvasWidth = project.canvasWidth || DEFAULT_CANVAS_WIDTH;
        this.canvasHeight = project.canvasHeight || DEFAULT_CANVAS_HEIGHT;
        this.gridSize = project.gridSize || DEFAULT_GRID_SIZE;
        this.zoom = project.zoom !== undefined ? project.zoom : DEFAULT_ZOOM;
        this.snapToGrid = project.snapToGrid !== undefined ? project.snapToGrid : DEFAULT_SNAP_TO_GRID;
        this.showGrid = project.showGrid !== undefined ? project.showGrid : DEFAULT_SHOW_GRID;
        this.bgOpacity = project.bgOpacity !== undefined ? project.bgOpacity : DEFAULT_BG_OPACITY;
        this.bgImageData = project.bgImageData || null;
        this.bgImageWidth = project.bgImageWidth || 0;
        this.bgImageHeight = project.bgImageHeight || 0;
        this.paths = project.paths || [];

        this.history = new HistoryManager();

        this.ui.syncSettingsToUI({
            gridSize: this.gridSize,
            zoom: this.zoom,
            snapToGrid: this.snapToGrid,
            showGrid: this.showGrid,
            bgOpacity: this.bgOpacity
        });

        const bgImage = this.ui.elements.bgImage;
        if (this.bgImageData) {
            bgImage.src = this.bgImageData;
            bgImage.style.display = 'block';
            bgImage.style.opacity = this.bgOpacity;
            bgImage.width = this.bgImageWidth;
            bgImage.height = this.bgImageHeight;
        } else {
            bgImage.src = '';
            bgImage.style.display = 'none';
        }

        this.ui.elements.gridCanvas.style.opacity = this.showGrid ? '1' : '0';

        this.renderer.updateCanvasDimensions(this.canvasWidth, this.canvasHeight);
        this.renderer.resizeCanvas(this.zoom, this.canvasWidth, this.canvasHeight);
        this.renderer.drawGrid(this.canvasWidth, this.canvasHeight, this.gridSize);
        this.redrawAll();
        this.updateUI();

        this.ui.closeLoadModal();
    }

    deleteProject(id) {
        if (this.store.delete(id)) {
            this.showLoadModal();
        }
    }

    exportPNG() {
        const offscreen = this.renderer.renderToOffscreen(
            this.paths, this.canvasWidth, this.canvasHeight, this.gridSize
        );
        this.exporter.exportPNG(offscreen, this.ui.getExportName());
    }

    exportSVG() {
        this.exporter.exportSVG(
            this.paths, this.canvasWidth, this.canvasHeight, this.gridSize,
            this.ui.getExportName()
        );
    }

    exportJSON() {
        this.exporter.exportJSON(
            this.paths, this.canvasWidth, this.canvasHeight, this.gridSize,
            this.ui.getExportName()
        );
    }

    generateSteps() {
        const steps = this.stepGenerator.generate(this.paths, this.gridSize);
        const html = this.stepGenerator.renderToHTML(steps);
        this.ui.showStepsModal(html);
    }

    redrawAll() {
        this.renderer.redrawAll(
            this.paths, this.selectedPathIndex,
            this.canvasWidth, this.canvasHeight, this.gridSize
        );
    }

    updateUI() {
        this.ui.updateAll(
            this.paths, this.selectedPathIndex, this.gridSize,
            this.history.canUndo(), this.history.canRedo()
        );
    }
}

window.editor = new EmbroideryEditor();
