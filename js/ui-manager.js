import { STITCH_TYPE_NAMES, CURSOR_MAP } from './constants.js';
import { calculatePathLength, pixelsToCm, estimateSkeins } from './utils.js';

export class UIManager {
    constructor() {
        this.elements = this._cacheElements();
        this._handlers = null;
    }

    _cacheElements() {
        return {
            mainCanvas: document.getElementById('mainCanvas'),
            gridCanvas: document.getElementById('gridCanvas'),
            drawCanvas: document.getElementById('drawCanvas'),
            bgImage: document.getElementById('bgImage'),
            canvasWrapper: document.querySelector('.canvas-wrapper'),
            projectName: document.getElementById('projectName'),
            threadNumber: document.getElementById('threadNumber'),
            threadColor: document.getElementById('threadColor'),
            colorPreview: document.getElementById('colorPreview'),
            threadStrands: document.getElementById('threadStrands'),
            threadNote: document.getElementById('threadNote'),
            gridSize: document.getElementById('gridSize'),
            gridSizeValue: document.getElementById('gridSizeValue'),
            zoomLevel: document.getElementById('zoomLevel'),
            zoomValue: document.getElementById('zoomValue'),
            snapToGrid: document.getElementById('snapToGrid'),
            showGrid: document.getElementById('showGrid'),
            bgOpacity: document.getElementById('bgOpacity'),
            bgOpacityValue: document.getElementById('bgOpacityValue'),
            bgImageInput: document.getElementById('bgImageInput'),
            uploadBgBtn: document.getElementById('uploadBgBtn'),
            clearBgBtn: document.getElementById('clearBgBtn'),
            undoBtn: document.getElementById('undoBtn'),
            redoBtn: document.getElementById('redoBtn'),
            clearAllBtn: document.getElementById('clearAllBtn'),
            saveBtn: document.getElementById('saveBtn'),
            loadBtn: document.getElementById('loadBtn'),
            exportPngBtn: document.getElementById('exportPngBtn'),
            exportSvgBtn: document.getElementById('exportSvgBtn'),
            exportJsonBtn: document.getElementById('exportJsonBtn'),
            generateStepsBtn: document.getElementById('generateStepsBtn'),
            threadList: document.getElementById('threadList'),
            runningCount: document.getElementById('runningCount'),
            backstitchCount: document.getElementById('backstitchCount'),
            satinCount: document.getElementById('satinCount'),
            frenchKnotCount: document.getElementById('frenchKnotCount'),
            totalLength: document.getElementById('totalLength'),
            totalSkeins: document.getElementById('totalSkeins'),
            selectedPathInfo: document.getElementById('selectedPathInfo'),
            stepsModal: document.getElementById('stepsModal'),
            stepsContent: document.getElementById('stepsContent'),
            closeStepsModal: document.getElementById('closeStepsModal'),
            copyStepsBtn: document.getElementById('copyStepsBtn'),
            loadModal: document.getElementById('loadModal'),
            loadContent: document.getElementById('loadContent'),
            closeLoadModal: document.getElementById('closeLoadModal'),
            toolButtons: document.querySelectorAll('.tool-btn'),
            modals: document.querySelectorAll('.modal'),
        };
    }

    bindEvents(handlers) {
        this._handlers = handlers;
        this._bindToolButtons(handlers);
        this._bindCanvasMouse(handlers);
        this._bindThreadSettings(handlers);
        this._bindCanvasSettings(handlers);
        this._bindBgImageControls(handlers);
        this._bindActionButtons(handlers);
        this._bindKeyboard(handlers);
        this._bindModals();
        this._bindDynamicContent(handlers);
    }

    getProjectName() {
        return this.elements.projectName.value.trim() || '未命名方案';
    }

    getExportName() {
        return this.elements.projectName.value || 'embroidery';
    }

    updateCursor(tool) {
        this.elements.drawCanvas.style.cursor = CURSOR_MAP[tool] || 'crosshair';
    }

    updateThreadList(paths, gridSize) {
        const threadMap = new Map();

        paths.forEach(path => {
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
            threadMap.get(key).length += calculatePathLength(path);
        });

        if (threadMap.size === 0) {
            this.elements.threadList.innerHTML = '<p class="empty-text">暂无绣线</p>';
            return;
        }

        this.elements.threadList.innerHTML = Array.from(threadMap.values()).map(thread => `
            <div class="thread-item">
                <div class="thread-color" style="background: ${thread.color}"></div>
                <div class="thread-info">
                    <div class="thread-number">${thread.number}</div>
                    <div class="thread-details">${thread.strands}股 · ${pixelsToCm(thread.length).toFixed(1)}cm</div>
                </div>
            </div>
        `).join('');
    }

    updateStitchStats(paths) {
        const stats = { running: 0, backstitch: 0, satin: 0, frenchKnot: 0 };
        paths.forEach(path => {
            if (path.length > 0) {
                const type = path[0].type;
                if (type in stats) {
                    stats[type]++;
                }
            }
        });

        this.elements.runningCount.textContent = stats.running;
        this.elements.backstitchCount.textContent = stats.backstitch;
        this.elements.satinCount.textContent = stats.satin;
        this.elements.frenchKnotCount.textContent = stats.frenchKnot;
    }

    updateLengthEstimate(paths) {
        let totalLength = 0;
        paths.forEach(path => {
            totalLength += calculatePathLength(path);
        });

        const totalCm = pixelsToCm(totalLength);
        const estimatedSkeins = estimateSkeins(totalCm);

        this.elements.totalLength.textContent = `${totalCm.toFixed(1)} cm`;
        this.elements.totalSkeins.textContent = estimatedSkeins;
    }

    updateSelectedPathInfo(paths, selectedIndex) {
        if (selectedIndex < 0 || selectedIndex >= paths.length) {
            this.elements.selectedPathInfo.innerHTML = '<p class="empty-text">未选中任何路径</p>';
            return;
        }

        const path = paths[selectedIndex];
        if (!path || path.length === 0) {
            this.elements.selectedPathInfo.innerHTML = '<p class="empty-text">未选中任何路径</p>';
            return;
        }

        const length = calculatePathLength(path);
        const typeName = STITCH_TYPE_NAMES[path[0].type] || path[0].type;

        this.elements.selectedPathInfo.innerHTML = `
            <div class="selected-path-details">
                <div class="detail-row">
                    <span class="detail-label">针法类型</span>
                    <span class="detail-value">${typeName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">线号</span>
                    <span class="detail-value">${path[0].number}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">颜色</span>
                    <span class="detail-value" style="color: ${path[0].color}">${path[0].color}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">股数</span>
                    <span class="detail-value">${path[0].strands}股</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">点数</span>
                    <span class="detail-value">${path.length}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">长度</span>
                    <span class="detail-value">${pixelsToCm(length).toFixed(1)} cm</span>
                </div>
                ${path[0].note ? `
                <div class="detail-row">
                    <span class="detail-label">备注</span>
                    <span class="detail-value">${path[0].note}</span>
                </div>
                ` : ''}
            </div>
            <div class="selected-path-actions">
                <button class="btn btn-danger" data-action="delete-path" data-index="${selectedIndex}">删除</button>
            </div>
        `;
    }

    updateUndoRedoButtons(canUndo, canRedo) {
        this.elements.undoBtn.disabled = !canUndo;
        this.elements.redoBtn.disabled = !canRedo;
    }

    updateAll(paths, selectedPathIndex, gridSize, canUndo, canRedo) {
        this.updateThreadList(paths, gridSize);
        this.updateStitchStats(paths);
        this.updateLengthEstimate(paths);
        this.updateSelectedPathInfo(paths, selectedPathIndex);
        this.updateUndoRedoButtons(canUndo, canRedo);
    }

    showStepsModal(stepsHTML) {
        this.elements.stepsContent.innerHTML = `<div class="steps-content">${stepsHTML}</div>`;
        this.elements.stepsModal.classList.add('show');
    }

    closeStepsModal() {
        this.elements.stepsModal.classList.remove('show');
    }

    showLoadModal(projects) {
        if (projects.length === 0) {
            this.elements.loadContent.innerHTML = '<p class="empty-text">暂无保存的方案</p>';
        } else {
            this.elements.loadContent.innerHTML = projects.map(project => `
                <div class="save-item">
                    <div class="save-info">
                        <div class="save-name">${project.name}</div>
                        <div class="save-date">${project.date}</div>
                    </div>
                    <div class="save-actions">
                        <button class="btn btn-primary" data-action="load-project" data-id="${project.id}">加载</button>
                        <button class="btn btn-danger" data-action="delete-project" data-id="${project.id}">删除</button>
                    </div>
                </div>
            `).join('');
        }
        this.elements.loadModal.classList.add('show');
    }

    closeLoadModal() {
        this.elements.loadModal.classList.remove('show');
    }

    syncSettingsToUI(settings) {
        this.elements.gridSize.value = settings.gridSize;
        this.elements.gridSizeValue.textContent = `${settings.gridSize}px`;
        this.elements.zoomLevel.value = Math.round(settings.zoom * 100);
        this.elements.zoomValue.textContent = `${Math.round(settings.zoom * 100)}%`;
        this.elements.snapToGrid.checked = settings.snapToGrid;
        this.elements.showGrid.checked = settings.showGrid;
        this.elements.bgOpacity.value = Math.round(settings.bgOpacity * 100);
        this.elements.bgOpacityValue.textContent = `${Math.round(settings.bgOpacity * 100)}%`;
    }

    _bindToolButtons(handlers) {
        this.elements.toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.toolButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                handlers.onToolChange?.(e.currentTarget.dataset.tool);
            });
        });
    }

    _bindCanvasMouse(handlers) {
        this.elements.drawCanvas.addEventListener('mousedown', (e) => handlers.onMouseDown?.(e));
        this.elements.drawCanvas.addEventListener('mousemove', (e) => handlers.onMouseMove?.(e));
        this.elements.drawCanvas.addEventListener('mouseup', (e) => handlers.onMouseUp?.(e));
        this.elements.drawCanvas.addEventListener('mouseleave', (e) => handlers.onMouseUp?.(e));
    }

    _bindThreadSettings(handlers) {
        this.elements.threadNumber.addEventListener('input', (e) => {
            handlers.onThreadNumberChange?.(e.target.value);
        });
        this.elements.threadColor.addEventListener('input', (e) => {
            handlers.onThreadColorChange?.(e.target.value);
            this.elements.colorPreview.style.background = e.target.value;
        });
        this.elements.threadStrands.addEventListener('change', (e) => {
            handlers.onThreadStrandsChange?.(e.target.value);
        });
        this.elements.threadNote.addEventListener('input', (e) => {
            handlers.onThreadNoteChange?.(e.target.value);
        });
    }

    _bindCanvasSettings(handlers) {
        this.elements.gridSize.addEventListener('input', (e) => {
            handlers.onGridSizeChange?.(e.target.value);
        });
        this.elements.zoomLevel.addEventListener('input', (e) => {
            handlers.onZoomChange?.(e.target.value);
        });
        this.elements.snapToGrid.addEventListener('change', (e) => {
            handlers.onSnapToGridChange?.(e.target.checked);
        });
        this.elements.showGrid.addEventListener('change', (e) => {
            handlers.onShowGridChange?.(e.target.checked);
        });
        this.elements.bgOpacity.addEventListener('input', (e) => {
            handlers.onBgOpacityChange?.(e.target.value);
        });
    }

    _bindBgImageControls(handlers) {
        this.elements.uploadBgBtn.addEventListener('click', () => {
            this.elements.bgImageInput.click();
        });
        this.elements.bgImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handlers.onBgImageChange?.(file);
            }
        });
        this.elements.clearBgBtn.addEventListener('click', () => {
            handlers.onClearBg?.();
        });
    }

    _bindActionButtons(handlers) {
        this.elements.undoBtn.addEventListener('click', () => handlers.onUndo?.());
        this.elements.redoBtn.addEventListener('click', () => handlers.onRedo?.());
        this.elements.clearAllBtn.addEventListener('click', () => handlers.onClearAll?.());
        this.elements.saveBtn.addEventListener('click', () => handlers.onSave?.());
        this.elements.loadBtn.addEventListener('click', () => handlers.onLoad?.());
        this.elements.exportPngBtn.addEventListener('click', () => handlers.onExportPNG?.());
        this.elements.exportSvgBtn.addEventListener('click', () => handlers.onExportSVG?.());
        this.elements.exportJsonBtn.addEventListener('click', () => handlers.onExportJSON?.());
        this.elements.generateStepsBtn.addEventListener('click', () => handlers.onGenerateSteps?.());
    }

    _bindKeyboard(handlers) {
        document.addEventListener('keydown', (e) => {
            handlers.onKeyDown?.(e);
        });
    }

    _bindModals() {
        this.elements.closeStepsModal.addEventListener('click', () => {
            this.closeStepsModal();
        });
        this.elements.closeLoadModal.addEventListener('click', () => {
            this.closeLoadModal();
        });
        this.elements.copyStepsBtn.addEventListener('click', () => {
            const content = this.elements.stepsContent.innerText;
            navigator.clipboard.writeText(content).then(() => {
                alert('已复制到剪贴板！');
            });
        });
        this.elements.modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }

    _bindDynamicContent(handlers) {
        this.elements.selectedPathInfo.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="delete-path"]');
            if (btn) {
                handlers.onDeletePath?.(parseInt(btn.dataset.index));
            }
        });

        this.elements.loadContent.addEventListener('click', (e) => {
            const loadBtn = e.target.closest('[data-action="load-project"]');
            if (loadBtn) {
                handlers.onLoadProject?.(parseInt(loadBtn.dataset.id));
                return;
            }
            const deleteBtn = e.target.closest('[data-action="delete-project"]');
            if (deleteBtn) {
                handlers.onDeleteProject?.(parseInt(deleteBtn.dataset.id));
            }
        });
    }
}
