// UI 管理器：集中负责 DOM 缓存、事件绑定与右侧面板的视图刷新。
// 将所有 document.getElementById 集中到一处，避免重复 DOM 查询。
import { STITCH_TYPE_NAMES, CURSOR_MAP } from './constants.js';
import { pathLength, pixelsToCm } from './geometry.js';
import { SKEIN_LENGTH_CM, WASTE_FACTOR } from './constants.js';
import {
    loadProjects,
    saveProject,
    getProjectById,
    deleteProjectById
} from './project-storage.js';
import { exportPNG, exportSVG, exportJSON } from './exporter.js';
import { generateSteps, renderStepsHTML } from './steps-generator.js';

export class UIManager {
    /**
     * @param {EditorState} state
     * @param {CanvasRenderer} renderer
     * @param {HistoryManager} history
     * @param {ToolController} tools
     */
    constructor(state, renderer, history, tools) {
        this.state = state;
        this.renderer = renderer;
        this.history = history;
        this.tools = tools;

        this.dom = this.cacheDom();

        // 历史变化时同步按钮状态
        this.history.onChange = () => this.updateUndoRedoButtons();
    }

    /**
     * 启动：绑定全部事件并刷新一次 UI。
     */
    init() {
        this.bindToolButtons();
        this.bindMouseEvents();
        this.bindThreadSettings();
        this.bindCanvasSettings();
        this.bindBgImage();
        this.bindActions();
        this.bindHeaderActions();
        this.bindModals();
        this.bindKeyboard();
        this.bindDelegatedActions();

        this.updateUI();
        this.updateCursor();
    }

    /**
     * 一次性缓存所有用到的 DOM 元素。
     */
    cacheDom() {
        const $ = id => document.getElementById(id);
        return {
            // 顶部
            projectName: $('projectName'),
            saveBtn: $('saveBtn'),
            loadBtn: $('loadBtn'),
            exportPngBtn: $('exportPngBtn'),
            exportSvgBtn: $('exportSvgBtn'),
            exportJsonBtn: $('exportJsonBtn'),
            generateStepsBtn: $('generateStepsBtn'),

            // 工具
            toolButtons: document.querySelectorAll('.tool-btn'),

            // 绣线
            threadNumber: $('threadNumber'),
            threadColor: $('threadColor'),
            threadStrands: $('threadStrands'),
            threadNote: $('threadNote'),
            colorPreview: $('colorPreview'),

            // 画布设置
            gridSize: $('gridSize'),
            gridSizeValue: $('gridSizeValue'),
            zoomLevel: $('zoomLevel'),
            zoomValue: $('zoomValue'),
            snapToGrid: $('snapToGrid'),
            showGrid: $('showGrid'),
            bgOpacity: $('bgOpacity'),
            bgOpacityValue: $('bgOpacityValue'),

            // 底图
            bgImageInput: $('bgImageInput'),
            uploadBgBtn: $('uploadBgBtn'),
            clearBgBtn: $('clearBgBtn'),

            // 操作
            undoBtn: $('undoBtn'),
            redoBtn: $('redoBtn'),
            clearAllBtn: $('clearAllBtn'),

            // 右侧面板
            threadList: $('threadList'),
            runningCount: $('runningCount'),
            backstitchCount: $('backstitchCount'),
            satinCount: $('satinCount'),
            frenchKnotCount: $('frenchKnotCount'),
            totalLength: $('totalLength'),
            totalSkeins: $('totalSkeins'),
            selectedPathInfo: $('selectedPathInfo'),

            // 弹窗
            stepsModal: $('stepsModal'),
            stepsContent: $('stepsContent'),
            closeStepsModal: $('closeStepsModal'),
            copyStepsBtn: $('copyStepsBtn'),
            loadModal: $('loadModal'),
            loadContent: $('loadContent'),
            closeLoadModal: $('closeLoadModal'),
            modals: document.querySelectorAll('.modal')
        };
    }

    // ---------- 事件绑定 ----------

    bindToolButtons() {
        this.dom.toolButtons.forEach(btn => {
            btn.addEventListener('click', event => {
                this.dom.toolButtons.forEach(b => b.classList.remove('active'));
                event.currentTarget.classList.add('active');
                this.state.currentTool = event.currentTarget.dataset.tool;
                this.updateCursor();
            });
        });
    }

    bindMouseEvents() {
        const canvas = this.renderer.drawCanvas;
        canvas.addEventListener('mousedown', e => this.tools.handleMouseDown(e));
        canvas.addEventListener('mousemove', e => this.tools.handleMouseMove(e));
        canvas.addEventListener('mouseup', e => this.tools.handleMouseUp(e));
        canvas.addEventListener('mouseleave', e => this.tools.handleMouseUp(e));
    }

    bindThreadSettings() {
        const { threadNumber, threadColor, threadStrands, threadNote, colorPreview } = this.dom;

        threadNumber.addEventListener('input', e => {
            this.state.threadSettings.number = e.target.value;
        });
        threadColor.addEventListener('input', e => {
            this.state.threadSettings.color = e.target.value;
            colorPreview.style.background = e.target.value;
        });
        threadStrands.addEventListener('change', e => {
            this.state.threadSettings.strands = parseInt(e.target.value, 10);
        });
        threadNote.addEventListener('input', e => {
            this.state.threadSettings.note = e.target.value;
        });
    }

    bindCanvasSettings() {
        const {
            gridSize, gridSizeValue, zoomLevel, zoomValue,
            snapToGrid, showGrid, bgOpacity, bgOpacityValue
        } = this.dom;

        gridSize.addEventListener('input', e => {
            this.state.gridSize = parseInt(e.target.value, 10);
            gridSizeValue.textContent = `${this.state.gridSize}px`;
            this.renderer.drawGrid();
        });

        zoomLevel.addEventListener('input', e => {
            this.state.zoom = parseInt(e.target.value, 10) / 100;
            zoomValue.textContent = `${Math.round(this.state.zoom * 100)}%`;
            this.renderer.applyZoom();
            this.renderer.drawGrid();
        });

        snapToGrid.addEventListener('change', e => {
            this.state.snapToGrid = e.target.checked;
        });

        showGrid.addEventListener('change', e => {
            this.state.showGrid = e.target.checked;
            this.renderer.setGridVisible(this.state.showGrid);
        });

        bgOpacity.addEventListener('input', e => {
            this.state.bgOpacity = parseInt(e.target.value, 10) / 100;
            bgOpacityValue.textContent = `${Math.round(this.state.bgOpacity * 100)}%`;
            this.renderer.setBgOpacity(this.state.bgOpacity);
        });
    }

    bindBgImage() {
        const { uploadBgBtn, bgImageInput, clearBgBtn } = this.dom;

        uploadBgBtn.addEventListener('click', () => bgImageInput.click());

        bgImageInput.addEventListener('change', e => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                this.renderer.loadBgImage(event.target.result);
            };
            reader.readAsDataURL(file);
        });

        clearBgBtn.addEventListener('click', () => {
            this.renderer.clearBgImage();
            bgImageInput.value = '';
        });
    }

    bindActions() {
        const { undoBtn, redoBtn, clearAllBtn } = this.dom;

        undoBtn.addEventListener('click', () => this.performUndo());
        redoBtn.addEventListener('click', () => this.performRedo());
        clearAllBtn.addEventListener('click', () => this.clearAllPaths());
    }

    bindHeaderActions() {
        const {
            saveBtn, loadBtn, exportPngBtn, exportSvgBtn, exportJsonBtn, generateStepsBtn
        } = this.dom;

        saveBtn.addEventListener('click', () => this.handleSaveProject());
        loadBtn.addEventListener('click', () => this.showLoadModal());
        exportPngBtn.addEventListener('click', () => exportPNG(this.state, this.renderer, this.getExportName()));
        exportSvgBtn.addEventListener('click', () => exportSVG(this.state, this.getExportName()));
        exportJsonBtn.addEventListener('click', () => exportJSON(this.state, this.getExportName()));
        generateStepsBtn.addEventListener('click', () => this.showStepsModal());
    }

    bindModals() {
        const { closeStepsModal, closeLoadModal, copyStepsBtn, stepsModal, loadModal, modals, stepsContent } = this.dom;

        closeStepsModal.addEventListener('click', () => stepsModal.classList.remove('show'));
        closeLoadModal.addEventListener('click', () => loadModal.classList.remove('show'));

        copyStepsBtn.addEventListener('click', () => {
            const content = stepsContent.innerText;
            navigator.clipboard.writeText(content).then(() => {
                alert('已复制到剪贴板！');
            });
        });

        modals.forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) modal.classList.remove('show');
            });
        });
    }

    bindKeyboard() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.performRedo();
                    } else {
                        this.performUndo();
                    }
                } else if (e.key === 's') {
                    e.preventDefault();
                    this.handleSaveProject();
                }
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.tools.deleteSelected();
            }
        });
    }

    /**
     * 选中路径详情 / 方案列表中的按钮使用事件委托，避免依赖全局变量。
     */
    bindDelegatedActions() {
        this.dom.selectedPathInfo.addEventListener('click', e => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const index = parseInt(target.dataset.index, 10);
            if (action === 'delete-path' && Number.isInteger(index)) {
                this.tools.deletePath(index);
            }
        });

        this.dom.loadContent.addEventListener('click', e => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const id = parseInt(target.dataset.id, 10);
            if (!Number.isInteger(id)) return;
            if (action === 'load-project') {
                this.handleLoadProject(id);
            } else if (action === 'delete-project') {
                this.handleDeleteProject(id);
            }
        });
    }

    // ---------- 业务流程 ----------

    getProjectName() {
        return this.dom.projectName.value.trim() || '未命名方案';
    }

    /**
     * 导出文件名 fallback：保留原行为，未填写时使用 'embroidery'。
     */
    getExportName() {
        return this.dom.projectName.value.trim() || 'embroidery';
    }

    handleSaveProject() {
        const name = this.getProjectName();
        let result = saveProject(this.state, name);
        if (result.conflict) {
            if (!confirm('已存在同名方案，是否覆盖？')) return;
            result = saveProject(this.state, name, { overwriteIfExists: true });
        }
        if (result.saved) {
            alert('保存成功！');
        }
    }

    showLoadModal() {
        const projects = loadProjects();
        const { loadContent, loadModal } = this.dom;

        if (projects.length === 0) {
            loadContent.innerHTML = '<p class="empty-text">暂无保存的方案</p>';
        } else {
            loadContent.innerHTML = projects.map(project => `
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

        loadModal.classList.add('show');
    }

    handleLoadProject(id) {
        const project = getProjectById(id);
        if (!project) return;

        this.dom.projectName.value = project.name;
        this.state.applyProject(project);

        // 同步控件视图
        const {
            gridSize, gridSizeValue, zoomLevel, zoomValue,
            snapToGrid, showGrid, bgOpacity, bgOpacityValue
        } = this.dom;

        gridSize.value = this.state.gridSize;
        gridSizeValue.textContent = `${this.state.gridSize}px`;
        zoomLevel.value = Math.round(this.state.zoom * 100);
        zoomValue.textContent = `${Math.round(this.state.zoom * 100)}%`;
        snapToGrid.checked = this.state.snapToGrid;
        showGrid.checked = this.state.showGrid;
        bgOpacity.value = Math.round(this.state.bgOpacity * 100);
        bgOpacityValue.textContent = `${Math.round(this.state.bgOpacity * 100)}%`;

        // 同步底图
        if (this.state.bgImageData) {
            this.renderer.showBgImage();
        } else {
            this.renderer.hideBgImage();
        }
        this.renderer.setGridVisible(this.state.showGrid);

        // 重新应用画布尺寸（含 zoom）并重绘
        this.renderer.applyCanvasSize();
        this.renderer.drawGrid();
        this.renderer.redrawAll();

        this.updateUI();
        this.dom.loadModal.classList.remove('show');
    }

    handleDeleteProject(id) {
        if (!confirm('确定要删除这个方案吗？')) return;
        deleteProjectById(id);
        this.showLoadModal();
    }

    showStepsModal() {
        const steps = generateSteps(this.state);
        this.dom.stepsContent.innerHTML = renderStepsHTML(steps);
        this.dom.stepsModal.classList.add('show');
    }

    performUndo() {
        if (this.history.undo()) {
            this.renderer.redrawAll();
            this.updateUI();
        }
    }

    performRedo() {
        if (this.history.redo()) {
            this.renderer.redrawAll();
            this.updateUI();
        }
    }

    clearAllPaths() {
        if (this.state.paths.length === 0) return;
        if (!confirm('确定要清空所有针法吗？')) return;
        this.tools.clearAll();
    }

    // ---------- 视图刷新 ----------

    /**
     * 一次性刷新所有受 paths 数据驱动的右侧面板。
     */
    updateUI() {
        this.updateThreadList();
        this.updateStitchStats();
        this.updateLengthEstimate();
        this.updateSelectedPathInfo();
        this.updateUndoRedoButtons();
    }

    updateThreadList() {
        const threadMap = new Map();

        this.state.paths.forEach(path => {
            if (path.length === 0) return;
            const head = path[0];
            const key = `${head.number}-${head.color}-${head.strands}`;
            if (!threadMap.has(key)) {
                threadMap.set(key, {
                    number: head.number,
                    color: head.color,
                    strands: head.strands,
                    note: head.note,
                    length: 0
                });
            }
            threadMap.get(key).length += pathLength(path);
        });

        const threadList = this.dom.threadList;
        if (threadMap.size === 0) {
            threadList.innerHTML = '<p class="empty-text">暂无绣线</p>';
            return;
        }

        threadList.innerHTML = Array.from(threadMap.values()).map(thread => `
            <div class="thread-item">
                <div class="thread-color" style="background: ${thread.color}"></div>
                <div class="thread-info">
                    <div class="thread-number">${thread.number}</div>
                    <div class="thread-details">${thread.strands}股 · ${pixelsToCm(thread.length).toFixed(1)}cm</div>
                </div>
            </div>
        `).join('');
    }

    updateStitchStats() {
        const stats = { running: 0, backstitch: 0, satin: 0, frenchKnot: 0 };
        this.state.paths.forEach(path => {
            if (path.length > 0) stats[path[0].type]++;
        });

        this.dom.runningCount.textContent = stats.running;
        this.dom.backstitchCount.textContent = stats.backstitch;
        this.dom.satinCount.textContent = stats.satin;
        this.dom.frenchKnotCount.textContent = stats.frenchKnot;
    }

    updateLengthEstimate() {
        let totalPixels = 0;
        this.state.paths.forEach(path => {
            totalPixels += pathLength(path);
        });

        const totalCm = pixelsToCm(totalPixels);
        const estimatedSkeins = Math.ceil((totalCm * WASTE_FACTOR) / SKEIN_LENGTH_CM);

        this.dom.totalLength.textContent = `${totalCm.toFixed(1)} cm`;
        this.dom.totalSkeins.textContent = estimatedSkeins;
    }

    updateSelectedPathInfo() {
        const info = this.dom.selectedPathInfo;
        const path = this.state.getSelectedPath();

        if (!path || path.length === 0) {
            info.innerHTML = '<p class="empty-text">未选中任何路径</p>';
            return;
        }

        const head = path[0];
        const length = pathLength(path);

        info.innerHTML = `
            <div class="selected-path-details">
                <div class="detail-row">
                    <span class="detail-label">针法类型</span>
                    <span class="detail-value">${STITCH_TYPE_NAMES[head.type] || head.type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">线号</span>
                    <span class="detail-value">${head.number}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">颜色</span>
                    <span class="detail-value" style="color: ${head.color}">${head.color}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">股数</span>
                    <span class="detail-value">${head.strands}股</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">点数</span>
                    <span class="detail-value">${path.length}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">长度</span>
                    <span class="detail-value">${pixelsToCm(length).toFixed(1)} cm</span>
                </div>
                ${head.note ? `
                <div class="detail-row">
                    <span class="detail-label">备注</span>
                    <span class="detail-value">${head.note}</span>
                </div>
                ` : ''}
            </div>
            <div class="selected-path-actions">
                <button class="btn btn-danger" data-action="delete-path" data-index="${this.state.selectedPathIndex}">删除</button>
            </div>
        `;
    }

    updateUndoRedoButtons() {
        this.dom.undoBtn.disabled = !this.history.canUndo();
        this.dom.redoBtn.disabled = !this.history.canRedo();
    }

    updateCursor() {
        this.renderer.drawCanvas.style.cursor = CURSOR_MAP[this.state.currentTool] || 'crosshair';
    }
}
