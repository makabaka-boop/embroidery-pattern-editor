/**
 * UI 控制器 - 负责所有界面交互和 DOM 更新
 * 处理按钮点击、输入变化、面板更新等
 */
class UIController {
    constructor(stateManager, storageManager, exportManager, stepsGenerator) {
        this.state = stateManager;
        this.storage = storageManager;
        this.exporter = exportManager;
        this.stepsGenerator = stepsGenerator;

        this.elements = {};
        this.stitchTypeNames = {
            running: '平针',
            backstitch: '回针',
            satin: '缎面针',
            frenchKnot: '结粒针'
        };
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupStateListeners();
        this.updateAllUI();
        return true;
    }

    cacheElements() {
        this.elements = {
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
            threadList: document.getElementById('threadList'),
            runningCount: document.getElementById('runningCount'),
            backstitchCount: document.getElementById('backstitchCount'),
            satinCount: document.getElementById('satinCount'),
            frenchKnotCount: document.getElementById('frenchKnotCount'),
            totalLength: document.getElementById('totalLength'),
            totalSkeins: document.getElementById('totalSkeins'),
            selectedPathInfo: document.getElementById('selectedPathInfo'),
            undoBtn: document.getElementById('undoBtn'),
            redoBtn: document.getElementById('redoBtn'),
            stepsModal: document.getElementById('stepsModal'),
            stepsContent: document.getElementById('stepsContent'),
            loadModal: document.getElementById('loadModal'),
            loadContent: document.getElementById('loadContent')
        };
    }

    bindEvents() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleToolButtonClick(e));
        });

        this.elements.threadNumber.addEventListener('input', (e) => {
            this.state.setThreadSetting('number', e.target.value);
        });

        this.elements.threadColor.addEventListener('input', (e) => {
            const color = e.target.value;
            this.state.setThreadSetting('color', color);
            this.elements.colorPreview.style.background = color;
        });

        this.elements.threadStrands.addEventListener('change', (e) => {
            this.state.setThreadSetting('strands', parseInt(e.target.value));
        });

        this.elements.threadNote.addEventListener('input', (e) => {
            this.state.setThreadSetting('note', e.target.value);
        });

        this.elements.gridSize.addEventListener('input', (e) => {
            this.state.setGridSize(parseInt(e.target.value));
        });

        this.elements.zoomLevel.addEventListener('input', (e) => {
            this.state.setZoom(parseInt(e.target.value) / 100);
        });

        this.elements.snapToGrid.addEventListener('change', (e) => {
            this.state.setSnapToGrid(e.target.checked);
        });

        this.elements.showGrid.addEventListener('change', (e) => {
            this.state.setShowGrid(e.target.checked);
        });

        this.elements.bgOpacity.addEventListener('input', (e) => {
            this.state.setBgOpacity(parseInt(e.target.value) / 100);
        });

        document.getElementById('uploadBgBtn').addEventListener('click', () => {
            this.elements.bgImageInput.click();
        });

        this.elements.bgImageInput.addEventListener('change', (e) => {
            this.handleBgImageUpload(e);
        });

        document.getElementById('clearBgBtn').addEventListener('click', () => {
            this.clearBackgroundImage();
        });

        document.getElementById('undoBtn').addEventListener('click', () => {
            this.state.undo();
        });

        document.getElementById('redoBtn').addEventListener('click', () => {
            this.state.redo();
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.handleClearAll();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.handleSaveProject();
        });

        document.getElementById('loadBtn').addEventListener('click', () => {
            this.showLoadModal();
        });

        document.getElementById('exportPngBtn').addEventListener('click', () => {
            this.exporter.exportPNG(this.getProjectName());
        });

        document.getElementById('exportSvgBtn').addEventListener('click', () => {
            this.exporter.exportSVG(this.getProjectName());
        });

        document.getElementById('exportJsonBtn').addEventListener('click', () => {
            this.exporter.exportJSON(this.getProjectName());
        });

        document.getElementById('generateStepsBtn').addEventListener('click', () => {
            this.showStepsModal();
        });

        document.getElementById('closeStepsModal').addEventListener('click', () => {
            this.elements.stepsModal.classList.remove('show');
        });

        document.getElementById('closeLoadModal').addEventListener('click', () => {
            this.elements.loadModal.classList.remove('show');
        });

        document.getElementById('copyStepsBtn').addEventListener('click', () => {
            this.handleCopySteps();
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    setupStateListeners() {
        this.state.on('pathsChange', () => {
            this.updateThreadList();
            this.updateStitchStats();
            this.updateLengthEstimate();
        });

        this.state.on('selectionChange', () => {
            this.updateSelectedPathInfo();
        });

        this.state.on('gridSizeChange', (size) => {
            this.elements.gridSizeValue.textContent = `${size}px`;
        });

        this.state.on('zoomChange', (zoom) => {
            this.elements.zoomValue.textContent = `${Math.round(zoom * 100)}%`;
        });

        this.state.on('bgOpacityChange', (opacity) => {
            this.elements.bgOpacityValue.textContent = `${Math.round(opacity * 100)}%`;
        });

        this.state.on('undoRedoChange', ({ canUndo, canRedo }) => {
            this.elements.undoBtn.disabled = !canUndo;
            this.elements.redoBtn.disabled = !canRedo;
        });

        this.state.on('projectLoaded', (data) => {
            this.elements.projectName.value = data.name || '';
            this.elements.gridSize.value = data.gridSize;
            this.elements.gridSizeValue.textContent = `${data.gridSize}px`;
            this.elements.zoomLevel.value = Math.round(data.zoom * 100);
            this.elements.zoomValue.textContent = `${Math.round(data.zoom * 100)}%`;
            this.elements.snapToGrid.checked = data.snapToGrid;
            this.elements.showGrid.checked = data.showGrid;
            this.elements.bgOpacity.value = Math.round(data.bgOpacity * 100);
            this.elements.bgOpacityValue.textContent = `${Math.round(data.bgOpacity * 100)}%`;
        });
    }

    updateAllUI() {
        this.updateThreadList();
        this.updateStitchStats();
        this.updateLengthEstimate();
        this.updateSelectedPathInfo();
        this.updateUndoRedoButtons();
    }

    handleToolButtonClick(e) {
        const btn = e.currentTarget;
        const tool = btn.dataset.tool;

        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.state.setTool(tool);
    }

    handleBgImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(
                    this.state.canvasWidth / img.naturalWidth,
                    this.state.canvasHeight / img.naturalHeight
                );
                const width = img.naturalWidth * scale;
                const height = img.naturalHeight * scale;
                this.state.setBackgroundImage(event.target.result, width, height);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    clearBackgroundImage() {
        this.state.setBackgroundImage(null, 0, 0);
        this.elements.bgImageInput.value = '';
    }

    handleClearAll() {
        if (this.state.paths.length === 0 || confirm('确定要清空所有针法吗？')) {
            this.state.clearAll();
        }
    }

    handleSaveProject() {
        const projectName = this.getProjectName();
        const result = this.storage.saveProject(projectName, false);

        if (result.duplicate) {
            if (confirm('已存在同名方案，是否覆盖？')) {
                this.storage.saveProject(projectName, true);
                alert('保存成功！');
            }
        } else if (result.success) {
            alert('保存成功！');
        } else {
            alert('保存失败！');
        }
    }

    showLoadModal() {
        const projects = this.storage.getProjects();
        const content = this.elements.loadContent;

        if (projects.length === 0) {
            content.innerHTML = '<p class="empty-text">暂无保存的方案</p>';
        } else {
            content.innerHTML = projects.map(project => `
                <div class="save-item">
                    <div class="save-info">
                        <div class="save-name">${this.escapeHtml(project.name)}</div>
                        <div class="save-date">${this.escapeHtml(project.date)}</div>
                    </div>
                    <div class="save-actions">
                        <button class="btn btn-primary" data-action="load" data-id="${project.id}">加载</button>
                        <button class="btn btn-danger" data-action="delete" data-id="${project.id}">删除</button>
                    </div>
                </div>
            `).join('');

            content.querySelectorAll('[data-action="load"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.id);
                    this.handleLoadProject(id);
                });
            });

            content.querySelectorAll('[data-action="delete"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.id);
                    this.handleDeleteProject(id);
                });
            });
        }

        this.elements.loadModal.classList.add('show');
    }

    handleLoadProject(id) {
        const result = this.storage.loadProject(id);
        if (result.success) {
            this.elements.loadModal.classList.remove('show');
            this.updateAllUI();
        }
    }

    handleDeleteProject(id) {
        if (confirm('确定要删除这个方案吗？')) {
            this.storage.deleteProject(id);
            this.showLoadModal();
        }
    }

    showStepsModal() {
        this.elements.stepsContent.innerHTML = this.stepsGenerator.generateHTML();
        this.elements.stepsModal.classList.add('show');
    }

    handleCopySteps() {
        this.stepsGenerator.copyToClipboard().then(() => {
            alert('已复制到剪贴板！');
        }).catch(() => {
            alert('复制失败，请手动复制');
        });
    }

    handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.state.redo();
                } else {
                    this.state.undo();
                }
            } else if (e.key === 's') {
                e.preventDefault();
                this.handleSaveProject();
            }
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.state.selectedPathIndex >= 0 && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                this.state.deletePath(this.state.selectedPathIndex);
            }
        }
    }

    updateThreadList() {
        const threads = this.state.getThreadStats();
        const listEl = this.elements.threadList;

        if (threads.length === 0) {
            listEl.innerHTML = '<p class="empty-text">暂无绣线</p>';
            return;
        }

        listEl.innerHTML = threads.map(thread => `
            <div class="thread-item">
                <div class="thread-color" style="background: ${this.escapeHtml(thread.color)}"></div>
                <div class="thread-info">
                    <div class="thread-number">${this.escapeHtml(thread.number)}</div>
                    <div class="thread-details">${thread.strands}股 · ${this.state.pixelsToCm(thread.length).toFixed(1)}cm</div>
                </div>
            </div>
        `).join('');
    }

    updateStitchStats() {
        const stats = this.state.getStitchStats();
        this.elements.runningCount.textContent = stats.running;
        this.elements.backstitchCount.textContent = stats.backstitch;
        this.elements.satinCount.textContent = stats.satin;
        this.elements.frenchKnotCount.textContent = stats.frenchKnot;
    }

    updateLengthEstimate() {
        const totalCm = this.state.pixelsToCm(this.state.getTotalLength());
        const skeins = this.state.getEstimatedSkeins();

        this.elements.totalLength.textContent = `${totalCm.toFixed(1)} cm`;
        this.elements.totalSkeins.textContent = skeins;
    }

    updateSelectedPathInfo() {
        const infoEl = this.elements.selectedPathInfo;
        const path = this.state.getSelectedPath();

        if (!path || path.length === 0) {
            infoEl.innerHTML = '<p class="empty-text">未选中任何路径</p>';
            return;
        }

        const length = this.state.getPathLength(path);
        const lengthCm = this.state.pixelsToCm(length);
        const stitchType = this.stitchTypeNames[path[0].type] || path[0].type;

        infoEl.innerHTML = `
            <div class="selected-path-details">
                <div class="detail-row">
                    <span class="detail-label">针法类型</span>
                    <span class="detail-value">${this.escapeHtml(stitchType)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">线号</span>
                    <span class="detail-value">${this.escapeHtml(path[0].number)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">颜色</span>
                    <span class="detail-value" style="color: ${this.escapeHtml(path[0].color)}">${this.escapeHtml(path[0].color)}</span>
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
                    <span class="detail-value">${lengthCm.toFixed(1)} cm</span>
                </div>
                ${path[0].note ? `
                <div class="detail-row">
                    <span class="detail-label">备注</span>
                    <span class="detail-value">${this.escapeHtml(path[0].note)}</span>
                </div>
                ` : ''}
            </div>
            <div class="selected-path-actions">
                <button class="btn btn-danger" id="deleteSelectedPathBtn">删除</button>
            </div>
        `;

        const deleteBtn = document.getElementById('deleteSelectedPathBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.state.deletePath(this.state.selectedPathIndex);
            });
        }
    }

    updateUndoRedoButtons() {
        this.elements.undoBtn.disabled = !this.state.canUndo();
        this.elements.redoBtn.disabled = !this.state.canRedo();
    }

    getProjectName() {
        return this.elements.projectName.value.trim() || '';
    }

    escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
