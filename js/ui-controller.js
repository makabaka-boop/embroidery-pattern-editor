import { STITCH_TYPE_NAMES, EXPORT, DEFAULT_CANVAS, DEFAULT_THREAD } from './constants.js';

export class UIController {
    constructor(state) {
        this.state = state;
        this.el = {};
        this.handlers = {};
        this._toolButtons = [];
    }

    init() {
        this._cacheElements();
        this._syncInputsFromState();
    }

    _cacheElements() {
        const ids = [
            'projectName', 'saveBtn', 'loadBtn',
            'exportPngBtn', 'exportSvgBtn', 'exportJsonBtn', 'generateStepsBtn',
            'threadNumber', 'threadColor', 'threadStrands', 'threadNote', 'colorPreview',
            'gridSize', 'gridSizeValue', 'zoomLevel', 'zoomValue',
            'snapToGrid', 'showGrid', 'bgOpacity', 'bgOpacityValue',
            'bgImageInput', 'uploadBgBtn', 'clearBgBtn',
            'undoBtn', 'redoBtn', 'clearAllBtn',
            'threadList', 'stitchStats', 'runningCount', 'backstitchCount',
            'satinCount', 'frenchKnotCount',
            'totalLength', 'totalSkeins',
            'selectedPathInfo',
            'stepsModal', 'stepsContent', 'closeStepsModal', 'copyStepsBtn',
            'loadModal', 'loadContent', 'closeLoadModal'
        ];

        ids.forEach(id => {
            this.el[id] = document.getElementById(id);
        });

        this.el.toolButtons = document.querySelectorAll('.tool-btn');
        this.el.modals = document.querySelectorAll('.modal');
        this.el.bgImage = document.getElementById('bgImage');
        this.el.drawCanvas = document.getElementById('drawCanvas');
        this._toolButtons = Array.from(this.el.toolButtons);
    }

    _syncInputsFromState() {
        const s = this.state;
        this.el.threadNumber.value = s.threadSettings.number;
        this.el.threadColor.value = s.threadSettings.color;
        this.el.threadStrands.value = String(s.threadSettings.strands);
        this.el.threadNote.value = s.threadSettings.note;
        this.el.colorPreview.style.background = s.threadSettings.color;

        this.el.gridSize.value = s.gridSize;
        this.el.gridSizeValue.textContent = `${s.gridSize}px`;
        this.el.zoomLevel.value = Math.round(s.zoom * 100);
        this.el.zoomValue.textContent = `${Math.round(s.zoom * 100)}%`;
        this.el.snapToGrid.checked = s.snapToGrid;
        this.el.showGrid.checked = s.showGrid;
        this.el.bgOpacity.value = Math.round(s.bgOpacity * 100);
        this.el.bgOpacityValue.textContent = `${Math.round(s.bgOpacity * 100)}%`;

        this._setActiveTool(s.currentTool);
    }

    _setActiveTool(tool) {
        this._toolButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }

    on(event, handler) {
        this.handlers[event] = handler;
    }

    _emit(event, ...args) {
        if (typeof this.handlers[event] === 'function') {
            this.handlers[event](...args);
        }
    }

    bindEvents() {
        this.el.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this._setActiveTool(tool);
                this._emit('toolSelected', tool);
            });
        });

        this.el.threadNumber.addEventListener('input', (e) => {
            this._emit('threadSettingsChanged', { number: e.target.value });
        });

        this.el.threadColor.addEventListener('input', (e) => {
            this.el.colorPreview.style.background = e.target.value;
            this._emit('threadSettingsChanged', { color: e.target.value });
        });

        this.el.threadStrands.addEventListener('change', (e) => {
            this._emit('threadSettingsChanged', { strands: parseInt(e.target.value, 10) });
        });

        this.el.threadNote.addEventListener('input', (e) => {
            this._emit('threadSettingsChanged', { note: e.target.value });
        });

        this.el.gridSize.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            this.el.gridSizeValue.textContent = `${val}px`;
            this._emit('gridSizeChanged', val);
        });

        this.el.zoomLevel.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10) / 100;
            this.el.zoomValue.textContent = `${Math.round(val * 100)}%`;
            this._emit('zoomChanged', val);
        });

        this.el.snapToGrid.addEventListener('change', (e) => {
            this._emit('snapToGridChanged', e.target.checked);
        });

        this.el.showGrid.addEventListener('change', (e) => {
            this._emit('showGridChanged', e.target.checked);
        });

        this.el.bgOpacity.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10) / 100;
            this.el.bgOpacityValue.textContent = `${Math.round(val * 100)}%`;
            this._emit('bgOpacityChanged', val);
        });

        this.el.uploadBgBtn.addEventListener('click', () => {
            this.el.bgImageInput.click();
        });

        this.el.bgImageInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                const img = new Image();
                img.onload = () => {
                    this._emit('backgroundUploaded', {
                        dataUrl,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight
                    });
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        });

        this.el.clearBgBtn.addEventListener('click', () => {
            this.el.bgImageInput.value = '';
            this._emit('backgroundCleared');
        });

        this.el.undoBtn.addEventListener('click', () => this._emit('undo'));
        this.el.redoBtn.addEventListener('click', () => this._emit('redo'));
        this.el.clearAllBtn.addEventListener('click', () => {
            if (this.state.paths.length === 0 || confirm('确定要清空所有针法吗？')) {
                this._emit('clearAll');
            }
        });

        this.el.saveBtn.addEventListener('click', () => this._emit('saveProject'));
        this.el.loadBtn.addEventListener('click', () => this._emit('showLoadModal'));
        this.el.exportPngBtn.addEventListener('click', () => this._emit('exportPNG'));
        this.el.exportSvgBtn.addEventListener('click', () => this._emit('exportSVG'));
        this.el.exportJsonBtn.addEventListener('click', () => this._emit('exportJSON'));
        this.el.generateStepsBtn.addEventListener('click', () => this._emit('generateSteps'));

        this.el.closeStepsModal.addEventListener('click', () => this.hideStepsModal());
        this.el.closeLoadModal.addEventListener('click', () => this.hideLoadModal());
        this.el.copyStepsBtn.addEventListener('click', () => this._copySteps());

        this.el.modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('show');
            });
        });

        document.addEventListener('keydown', (e) => this._handleKeydown(e));
    }

    _handleKeydown(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this._emit('redo');
                } else {
                    this._emit('undo');
                }
            } else if (e.key === 's') {
                e.preventDefault();
                this._emit('saveProject');
            }
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.state.selectedPathIndex >= 0) {
            const tag = (e.target && e.target.tagName) || '';
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
                e.preventDefault();
                this._emit('deleteSelectedPath');
            }
        }
    }

    _copySteps() {
        const content = this.el.stepsContent.innerText;
        if (navigator.clipboard && content) {
            navigator.clipboard.writeText(content).then(() => {
                alert('已复制到剪贴板！');
            });
        }
    }

    updateAll() {
        this.updateThreadList();
        this.updateStitchStats();
        this.updateLengthEstimate();
        this.updateSelectedPathInfo();
        this.updateUndoRedoButtons();
    }

    updateUndoRedoButtons() {
        this.el.undoBtn.disabled = !this.state.canUndo();
        this.el.redoBtn.disabled = !this.state.canRedo();
    }

    updateThreadList() {
        const container = this.el.threadList;
        const threadMap = new Map();
        const { paths } = this.state;

        paths.forEach(path => {
            if (!path || path.length === 0) return;
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
            let length = 0;
            for (let i = 1; i < path.length; i++) {
                const dx = path[i].x - path[i - 1].x;
                const dy = path[i].y - path[i - 1].y;
                length += Math.sqrt(dx * dx + dy * dy);
            }
            threadMap.get(key).length += length;
        });

        if (threadMap.size === 0) {
            container.innerHTML = '<p class="empty-text">暂无绣线</p>';
            return;
        }

        container.innerHTML = Array.from(threadMap.values()).map(thread => `
            <div class="thread-item">
                <div class="thread-color" style="background: ${thread.color}"></div>
                <div class="thread-info">
                    <div class="thread-number">${thread.number}</div>
                    <div class="thread-details">${thread.strands}股 · ${this._pixelsToCm(thread.length).toFixed(1)}cm</div>
                </div>
            </div>
        `).join('');
    }

    updateStitchStats() {
        const stats = { running: 0, backstitch: 0, satin: 0, frenchKnot: 0 };
        this.state.paths.forEach(path => {
            if (path && path.length > 0) stats[path[0].type]++;
        });
        this.el.runningCount.textContent = stats.running;
        this.el.backstitchCount.textContent = stats.backstitch;
        this.el.satinCount.textContent = stats.satin;
        this.el.frenchKnotCount.textContent = stats.frenchKnot;
    }

    _pixelsToCm(pixels) {
        return (pixels / EXPORT.DPI) * EXPORT.CM_PER_INCH;
    }

    updateLengthEstimate() {
        let totalLength = 0;
        this.state.paths.forEach(path => {
            for (let i = 1; i < path.length; i++) {
                const dx = path[i].x - path[i - 1].x;
                const dy = path[i].y - path[i - 1].y;
                totalLength += Math.sqrt(dx * dx + dy * dy);
            }
        });

        const totalCm = this._pixelsToCm(totalLength);
        const estimatedSkeins = Math.ceil((totalCm * EXPORT.WASTE_FACTOR) / EXPORT.SKEIN_LENGTH_CM);

        this.el.totalLength.textContent = `${totalCm.toFixed(1)} cm`;
        this.el.totalSkeins.textContent = estimatedSkeins;
    }

    updateSelectedPathInfo() {
        const info = this.el.selectedPathInfo;
        const { selectedPathIndex, paths } = this.state;

        if (selectedPathIndex < 0 || selectedPathIndex >= paths.length) {
            info.innerHTML = '<p class="empty-text">未选中任何路径</p>';
            return;
        }

        const path = paths[selectedPathIndex];
        if (!path || path.length === 0) {
            info.innerHTML = '<p class="empty-text">未选中任何路径</p>';
            return;
        }

        let length = 0;
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }

        const typeName = STITCH_TYPE_NAMES[path[0].type] || path[0].type;

        info.innerHTML = `
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
                    <span class="detail-value">${this._pixelsToCm(length).toFixed(1)} cm</span>
                </div>
                ${path[0].note ? `
                <div class="detail-row">
                    <span class="detail-label">备注</span>
                    <span class="detail-value">${path[0].note}</span>
                </div>
                ` : ''}
            </div>
            <div class="selected-path-actions">
                <button class="btn btn-danger" data-action="delete-selected">删除</button>
            </div>
        `;

        const deleteBtn = info.querySelector('[data-action="delete-selected"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this._emit('deleteSelectedPath'));
        }
    }

    applyBackground(dataUrl, width, height) {
        if (dataUrl) {
            this.el.bgImage.src = dataUrl;
            this.el.bgImage.style.display = 'block';
            this.el.bgImage.style.opacity = this.state.bgOpacity;
            this.el.bgImage.width = width;
            this.el.bgImage.height = height;
        } else {
            this.el.bgImage.src = '';
            this.el.bgImage.style.display = 'none';
        }
    }

    setGridVisible(visible) {
        this.el.showGrid.checked = visible;
    }

    getProjectName() {
        return this.el.projectName.value || 'embroidery';
    }

    setProjectName(name) {
        this.el.projectName.value = name || '';
    }

    showStepsModal(html) {
        this.el.stepsContent.innerHTML = html;
        this.el.stepsModal.classList.add('show');
    }

    hideStepsModal() {
        this.el.stepsModal.classList.remove('show');
    }

    showLoadModal(html) {
        this.el.loadContent.innerHTML = html;
        this.el.loadModal.classList.add('show');
    }

    hideLoadModal() {
        this.el.loadModal.classList.remove('show');
    }

    renderLoadList(projects, onLoad, onDelete) {
        if (!projects || projects.length === 0) {
            this.el.loadContent.innerHTML = '<p class="empty-text">暂无保存的方案</p>';
            return;
        }

        this.el.loadContent.innerHTML = projects.map(project => `
            <div class="save-item">
                <div class="save-info">
                    <div class="save-name">${project.name}</div>
                    <div class="save-date">${project.date}</div>
                </div>
                <div class="save-actions">
                    <button class="btn btn-primary" data-load-id="${project.id}">加载</button>
                    <button class="btn btn-danger" data-delete-id="${project.id}">删除</button>
                </div>
            </div>
        `).join('');

        this.el.loadContent.querySelectorAll('[data-load-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.loadId, 10);
                onLoad(id);
            });
        });

        this.el.loadContent.querySelectorAll('[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.deleteId, 10);
                if (confirm('确定要删除这个方案吗？')) {
                    onDelete(id);
                }
            });
        });
    }

    showAlert(message) {
        alert(message);
    }

    confirm(message) {
        return confirm(message);
    }
}
