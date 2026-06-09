/**
 * 状态管理器 - 管理应用所有状态及撤销重做
 * 采用发布订阅模式，状态变化时通知监听者
 */
class StateManager {
    constructor() {
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.gridSize = 20;
        this.zoom = 1;
        this.snapToGrid = true;
        this.showGrid = true;
        this.bgOpacity = 0.3;
        this.bgImageData = null;
        this.bgImageWidth = 0;
        this.bgImageHeight = 0;

        this.currentTool = 'running';
        this.isDrawing = false;
        this.currentPath = [];
        this.paths = [];
        this.selectedPathIndex = -1;

        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;

        this.threadSettings = {
            number: 'DMC 666',
            color: '#ff0000',
            strands: 2,
            note: ''
        };

        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`StateManager event listener error for ${event}:`, e);
            }
        });
    }

    setTool(tool) {
        if (this.currentTool === tool) return;
        this.currentTool = tool;
        this.emit('toolChange', tool);
    }

    setThreadSetting(key, value) {
        if (this.threadSettings[key] === value) return;
        this.threadSettings[key] = value;
        this.emit('threadSettingsChange', { ...this.threadSettings });
    }

    setThreadSettings(settings) {
        this.threadSettings = { ...this.threadSettings, ...settings };
        this.emit('threadSettingsChange', { ...this.threadSettings });
    }

    setGridSize(size) {
        size = Math.max(10, Math.min(50, parseInt(size) || 20));
        if (this.gridSize === size) return;
        this.gridSize = size;
        this.emit('gridSizeChange', size);
    }

    setZoom(zoom) {
        zoom = Math.max(0.5, Math.min(3, zoom));
        if (this.zoom === zoom) return;
        this.zoom = zoom;
        this.emit('zoomChange', zoom);
    }

    setSnapToGrid(enabled) {
        if (this.snapToGrid === enabled) return;
        this.snapToGrid = enabled;
        this.emit('snapToGridChange', enabled);
    }

    setShowGrid(enabled) {
        if (this.showGrid === enabled) return;
        this.showGrid = enabled;
        this.emit('showGridChange', enabled);
    }

    setBgOpacity(opacity) {
        opacity = Math.max(0, Math.min(1, opacity));
        if (this.bgOpacity === opacity) return;
        this.bgOpacity = opacity;
        this.emit('bgOpacityChange', opacity);
    }

    setBackgroundImage(imageData, width, height) {
        this.bgImageData = imageData || null;
        this.bgImageWidth = width || 0;
        this.bgImageHeight = height || 0;
        this.emit('bgImageChange', {
            data: this.bgImageData,
            width: this.bgImageWidth,
            height: this.bgImageHeight
        });
    }

    startDrawing(point) {
        this.isDrawing = true;
        this.currentPath = [point];
        this.emit('drawingStart', { path: this.currentPath });
    }

    addDrawingPoint(point) {
        if (!this.isDrawing) return false;
        const lastPoint = this.currentPath[this.currentPath.length - 1];
        if (lastPoint && lastPoint.x === point.x && lastPoint.y === point.y) {
            return false;
        }
        this.currentPath.push(point);
        this.emit('drawingUpdate', { path: this.currentPath });
        return true;
    }

    finishDrawing() {
        if (!this.isDrawing) return;
        const path = [...this.currentPath];
        this.isDrawing = false;
        this.currentPath = [];

        if (path.length >= 2 || (this.currentTool === 'frenchKnot' && path.length >= 1)) {
            this.saveState();
            this.paths.push(path);
            this.emit('pathsChange', this.paths);
        }

        this.emit('drawingEnd', { path, committed: path.length >= 1 });
    }

    cancelDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.currentPath = [];
        this.emit('drawingCancel');
    }

    selectPath(index) {
        const validIndex = (index >= 0 && index < this.paths.length) ? index : -1;
        if (this.selectedPathIndex === validIndex) return;
        this.selectedPathIndex = validIndex;
        this.emit('selectionChange', this.selectedPathIndex);
    }

    selectPathAt(x, y, threshold = 15) {
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (const point of path) {
                const dist = Math.sqrt(
                    Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
                );
                if (dist < threshold) {
                    this.selectPath(i);
                    return i;
                }
            }
        }
        this.selectPath(-1);
        return -1;
    }

    deletePath(index) {
        if (index < 0 || index >= this.paths.length) return false;
        this.saveState();
        this.paths.splice(index, 1);
        if (this.selectedPathIndex === index || this.selectedPathIndex >= this.paths.length) {
            this.selectedPathIndex = -1;
        } else if (this.selectedPathIndex > index) {
            this.selectedPathIndex--;
        }
        this.emit('pathsChange', this.paths);
        this.emit('selectionChange', this.selectedPathIndex);
        return true;
    }

    eraseAt(x, y, threshold = 15) {
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (const point of path) {
                const dist = Math.sqrt(
                    Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
                );
                if (dist < threshold) {
                    this.deletePath(i);
                    return i;
                }
            }
        }
        return -1;
    }

    clearAll() {
        if (this.paths.length === 0) return false;
        this.saveState();
        this.paths = [];
        this.selectedPathIndex = -1;
        this.emit('pathsChange', this.paths);
        this.emit('selectionChange', this.selectedPathIndex);
        return true;
    }

    saveState() {
        this.undoStack.push(JSON.stringify(this.paths));
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.emit('undoRedoChange', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        this.redoStack.push(JSON.stringify(this.paths));
        this.paths = JSON.parse(this.undoStack.pop());
        this.selectedPathIndex = -1;
        this.emit('pathsChange', this.paths);
        this.emit('selectionChange', this.selectedPathIndex);
        this.emit('undoRedoChange', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        this.undoStack.push(JSON.stringify(this.paths));
        this.paths = JSON.parse(this.redoStack.pop());
        this.selectedPathIndex = -1;
        this.emit('pathsChange', this.paths);
        this.emit('selectionChange', this.selectedPathIndex);
        this.emit('undoRedoChange', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });
        return true;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    getSelectedPath() {
        if (this.selectedPathIndex < 0 || this.selectedPathIndex >= this.paths.length) {
            return null;
        }
        return this.paths[this.selectedPathIndex];
    }

    getPathBounds(path) {
        if (!path || path.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        path.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        return { minX, minY, maxX, maxY };
    }

    getPathLength(path) {
        if (!path || path.length < 2) return 0;
        let length = 0;
        for (let i = 1; i < path.length; i++) {
            length += Math.sqrt(
                Math.pow(path[i].x - path[i - 1].x, 2) +
                Math.pow(path[i].y - path[i - 1].y, 2)
            );
        }
        return length;
    }

    pixelsToCm(pixels, dpi = 96) {
        return (pixels / dpi) * 2.54;
    }

    getThreadStats() {
        const threadMap = new Map();

        this.paths.forEach(path => {
            if (path.length === 0) return;
            const key = `${path[0].number}-${path[0].color}-${path[0].strands}`;
            if (!threadMap.has(key)) {
                threadMap.set(key, {
                    number: path[0].number,
                    color: path[0].color,
                    strands: path[0].strands,
                    note: path[0].note,
                    length: 0
                });
            }
            threadMap.get(key).length += this.getPathLength(path);
        });

        return Array.from(threadMap.values());
    }

    getStitchStats() {
        const stats = { running: 0, backstitch: 0, satin: 0, frenchKnot: 0 };

        this.paths.forEach(path => {
            if (path.length > 0) {
                stats[path[0].type]++;
            }
        });

        return stats;
    }

    getTotalLength() {
        let totalLength = 0;
        this.paths.forEach(path => {
            totalLength += this.getPathLength(path);
        });
        return totalLength;
    }

    getEstimatedSkeins(skeinLengthCm = 800, wasteFactor = 1.3) {
        const totalCm = this.pixelsToCm(this.getTotalLength());
        return Math.ceil((totalCm * wasteFactor) / skeinLengthCm);
    }

    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.emit('canvasSizeChange', { width, height });
    }

    loadProject(projectData) {
        if (!projectData) return false;

        this.canvasWidth = projectData.canvasWidth || 800;
        this.canvasHeight = projectData.canvasHeight || 600;
        this.gridSize = projectData.gridSize || 20;
        this.zoom = projectData.zoom !== undefined ? projectData.zoom : 1;
        this.snapToGrid = projectData.snapToGrid !== undefined ? projectData.snapToGrid : true;
        this.showGrid = projectData.showGrid !== undefined ? projectData.showGrid : true;
        this.bgOpacity = projectData.bgOpacity !== undefined ? projectData.bgOpacity : 0.3;
        this.bgImageData = projectData.bgImageData || null;
        this.bgImageWidth = projectData.bgImageWidth || 0;
        this.bgImageHeight = projectData.bgImageHeight || 0;
        this.paths = projectData.paths || [];

        this.selectedPathIndex = -1;
        this.undoStack = [];
        this.redoStack = [];

        this.emit('projectLoaded', {
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            gridSize: this.gridSize,
            zoom: this.zoom,
            snapToGrid: this.snapToGrid,
            showGrid: this.showGrid,
            bgOpacity: this.bgOpacity,
            bgImage: {
                data: this.bgImageData,
                width: this.bgImageWidth,
                height: this.bgImageHeight
            },
            paths: this.paths
        });

        this.emit('pathsChange', this.paths);
        this.emit('gridSizeChange', this.gridSize);
        this.emit('zoomChange', this.zoom);
        this.emit('snapToGridChange', this.snapToGrid);
        this.emit('showGridChange', this.showGrid);
        this.emit('bgOpacityChange', this.bgOpacity);
        this.emit('bgImageChange', {
            data: this.bgImageData,
            width: this.bgImageWidth,
            height: this.bgImageHeight
        });
        this.emit('canvasSizeChange', { width: this.canvasWidth, height: this.canvasHeight });
        this.emit('undoRedoChange', { canUndo: false, canRedo: false });

        return true;
    }

    getProjectData(name) {
        return {
            id: Date.now(),
            name: name || '未命名方案',
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
            paths: [...this.paths]
        };
    }

    snapToGridCoords(x, y) {
        if (!this.snapToGrid) return { x, y };
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    createPathPoint(x, y) {
        const snapped = this.snapToGridCoords(x, y);
        return {
            x: snapped.x,
            y: snapped.y,
            ...this.threadSettings,
            type: this.currentTool
        };
    }
}
