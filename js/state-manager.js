import { DEFAULT_CANVAS, DEFAULT_THREAD, UNDO, STITCH_TYPES } from './constants.js';

export class StateManager {
    constructor() {
        this.canvasWidth = DEFAULT_CANVAS.WIDTH;
        this.canvasHeight = DEFAULT_CANVAS.HEIGHT;
        this.gridSize = DEFAULT_CANVAS.GRID_SIZE;
        this.zoom = DEFAULT_CANVAS.ZOOM;
        this.snapToGrid = DEFAULT_CANVAS.SNAP_TO_GRID;
        this.showGrid = DEFAULT_CANVAS.SHOW_GRID;
        this.bgOpacity = DEFAULT_CANVAS.BG_OPACITY;

        this.bgImageData = null;
        this.bgImageWidth = 0;
        this.bgImageHeight = 0;

        this.currentTool = STITCH_TYPES.RUNNING;
        this.isDrawing = false;
        this.currentPath = [];
        this.paths = [];
        this.selectedPathIndex = -1;

        this.threadSettings = { ...DEFAULT_THREAD };

        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = UNDO.MAX_STEPS;

        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }

    setTool(tool) {
        this.currentTool = tool;
        this.emit('toolChanged', tool);
    }

    setThreadSettings(settings) {
        this.threadSettings = { ...this.threadSettings, ...settings };
        this.emit('threadSettingsChanged', this.threadSettings);
    }

    setCanvasSettings(settings) {
        if (settings.gridSize !== undefined) this.gridSize = settings.gridSize;
        if (settings.zoom !== undefined) this.zoom = settings.zoom;
        if (settings.snapToGrid !== undefined) this.snapToGrid = settings.snapToGrid;
        if (settings.showGrid !== undefined) this.showGrid = settings.showGrid;
        if (settings.bgOpacity !== undefined) this.bgOpacity = settings.bgOpacity;
        this.emit('canvasSettingsChanged', {
            gridSize: this.gridSize,
            zoom: this.zoom,
            snapToGrid: this.snapToGrid,
            showGrid: this.showGrid,
            bgOpacity: this.bgOpacity
        });
    }

    setBackgroundImage(dataUrl, naturalWidth, naturalHeight) {
        this.bgImageData = dataUrl;
        if (dataUrl) {
            const scale = Math.min(
                this.canvasWidth / naturalWidth,
                this.canvasHeight / naturalHeight
            );
            this.bgImageWidth = naturalWidth * scale;
            this.bgImageHeight = naturalHeight * scale;
        } else {
            this.bgImageWidth = 0;
            this.bgImageHeight = 0;
        }
        this.emit('backgroundChanged', {
            dataUrl: this.bgImageData,
            width: this.bgImageWidth,
            height: this.bgImageHeight
        });
    }

    clearBackgroundImage() {
        this.setBackgroundImage(null, 0, 0);
    }

    beginPath(x, y) {
        this.isDrawing = true;
        this.currentPath = [{
            x, y,
            ...this.threadSettings,
            type: this.currentTool
        }];
        this.emit('pathBegin', this.currentPath);
    }

    addPathPoint(x, y) {
        if (!this.isDrawing) return;
        const lastPoint = this.currentPath[this.currentPath.length - 1];
        if (lastPoint.x === x && lastPoint.y === y) return;

        this.currentPath.push({
            x, y,
            ...this.threadSettings,
            type: this.currentTool
        });
        this.emit('pathUpdated', this.currentPath);
    }

    endPath() {
        if (!this.isDrawing) return false;
        this.isDrawing = false;

        const isValid = this.currentPath.length >= 2 ||
            (this.currentTool === STITCH_TYPES.FRENCH_KNOT && this.currentPath.length >= 1);

        if (isValid) {
            this.saveUndoState();
            this.paths.push([...this.currentPath]);
            this.emit('pathsChanged', this.paths);
        }

        this.currentPath = [];
        return isValid;
    }

    cancelPath() {
        this.isDrawing = false;
        this.currentPath = [];
    }

    selectPath(index) {
        this.selectedPathIndex = index;
        this.emit('selectionChanged', index);
    }

    deletePath(index) {
        if (index < 0 || index >= this.paths.length) return false;
        this.saveUndoState();
        this.paths.splice(index, 1);
        if (this.selectedPathIndex === index || this.selectedPathIndex >= this.paths.length) {
            this.selectedPathIndex = -1;
        } else if (this.selectedPathIndex > index) {
            this.selectedPathIndex--;
        }
        this.emit('pathsChanged', this.paths);
        this.emit('selectionChanged', this.selectedPathIndex);
        return true;
    }

    erasePathAt(x, y, threshold) {
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (const point of path) {
                const dist = Math.sqrt(
                    Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
                );
                if (dist < threshold) {
                    this.saveUndoState();
                    this.paths.splice(i, 1);
                    if (this.selectedPathIndex === i || this.selectedPathIndex >= this.paths.length) {
                        this.selectedPathIndex = -1;
                    } else if (this.selectedPathIndex > i) {
                        this.selectedPathIndex--;
                    }
                    this.emit('pathsChanged', this.paths);
                    this.emit('selectionChanged', this.selectedPathIndex);
                    return true;
                }
            }
        }
        return false;
    }

    findPathAt(x, y, threshold) {
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (const point of path) {
                const dist = Math.sqrt(
                    Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
                );
                if (dist < threshold) {
                    return i;
                }
            }
        }
        return -1;
    }

    clearAll() {
        this.saveUndoState();
        this.paths = [];
        this.selectedPathIndex = -1;
        this.emit('pathsChanged', this.paths);
        this.emit('selectionChanged', -1);
    }

    saveUndoState() {
        this.undoStack.push(JSON.stringify(this.paths));
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.emit('undoRedoChanged', {
            canUndo: this.undoStack.length > 0,
            canRedo: false
        });
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        this.redoStack.push(JSON.stringify(this.paths));
        this.paths = JSON.parse(this.undoStack.pop());
        this.selectedPathIndex = -1;
        this.emit('pathsChanged', this.paths);
        this.emit('selectionChanged', -1);
        this.emit('undoRedoChanged', {
            canUndo: this.undoStack.length > 0,
            canRedo: this.redoStack.length > 0
        });
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        this.undoStack.push(JSON.stringify(this.paths));
        this.paths = JSON.parse(this.redoStack.pop());
        this.selectedPathIndex = -1;
        this.emit('pathsChanged', this.paths);
        this.emit('selectionChanged', -1);
        this.emit('undoRedoChanged', {
            canUndo: this.undoStack.length > 0,
            canRedo: this.redoStack.length > 0
        });
        return true;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    setPaths(paths, options = {}) {
        this.paths = paths || [];
        this.selectedPathIndex = -1;
        if (options.recordUndo) {
            this.saveUndoState();
        } else {
            this.undoStack = [];
            this.redoStack = [];
        }
        this.emit('pathsChanged', this.paths);
        this.emit('selectionChanged', -1);
    }

    getSerializableState() {
        return {
            id: Date.now(),
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
    }

    loadState(state) {
        this.canvasWidth = state.canvasWidth || DEFAULT_CANVAS.WIDTH;
        this.canvasHeight = state.canvasHeight || DEFAULT_CANVAS.HEIGHT;
        this.gridSize = state.gridSize || DEFAULT_CANVAS.GRID_SIZE;
        this.zoom = state.zoom !== undefined ? state.zoom : DEFAULT_CANVAS.ZOOM;
        this.snapToGrid = state.snapToGrid !== undefined ? state.snapToGrid : DEFAULT_CANVAS.SNAP_TO_GRID;
        this.showGrid = state.showGrid !== undefined ? state.showGrid : DEFAULT_CANVAS.SHOW_GRID;
        this.bgOpacity = state.bgOpacity !== undefined ? state.bgOpacity : DEFAULT_CANVAS.BG_OPACITY;
        this.bgImageData = state.bgImageData || null;
        this.bgImageWidth = state.bgImageWidth || 0;
        this.bgImageHeight = state.bgImageHeight || 0;
        this.paths = state.paths || [];
        this.selectedPathIndex = -1;
        this.undoStack = [];
        this.redoStack = [];

        this.emit('stateLoaded', {
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            gridSize: this.gridSize,
            zoom: this.zoom,
            snapToGrid: this.snapToGrid,
            showGrid: this.showGrid,
            bgOpacity: this.bgOpacity,
            bgImageData: this.bgImageData,
            bgImageWidth: this.bgImageWidth,
            bgImageHeight: this.bgImageHeight
        });
        this.emit('pathsChanged', this.paths);
        this.emit('selectionChanged', -1);
        this.emit('undoRedoChanged', { canUndo: false, canRedo: false });
    }

    snapPoint(x, y) {
        if (!this.snapToGrid) return { x, y };
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }
}
