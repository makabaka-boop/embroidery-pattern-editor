class EmbroideryEditor {
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
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.drawGrid();
        this.updateUI();
    }
    
    setupCanvas() {
        this.mainCanvas = document.getElementById('mainCanvas');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.drawCanvas = document.getElementById('drawCanvas');
        this.bgImage = document.getElementById('bgImage');
        
        this.mainCanvas.width = this.canvasWidth;
        this.mainCanvas.height = this.canvasHeight;
        this.gridCanvas.width = this.canvasWidth;
        this.gridCanvas.height = this.canvasHeight;
        this.drawCanvas.width = this.canvasWidth;
        this.drawCanvas.height = this.canvasHeight;
        
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.drawCtx = this.drawCanvas.getContext('2d');
        
        this.resizeCanvas();
    }
    
    resizeCanvas() {
        const scale = this.zoom;
        this.drawCanvas.style.transform = `scale(${scale})`;
        this.gridCanvas.style.transform = `scale(${scale})`;
        this.mainCanvas.style.transform = `scale(${scale})`;
        this.bgImage.style.transform = `scale(${scale})`;
        
        const wrapper = document.querySelector('.canvas-wrapper');
        wrapper.style.width = `${this.canvasWidth * scale}px`;
        wrapper.style.height = `${this.canvasHeight * scale}px`;
    }
    
    setupEventListeners() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentTool = e.currentTarget.dataset.tool;
                this.updateCursor();
            });
        });
        
        this.drawCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.drawCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.drawCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.drawCanvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        
        document.getElementById('threadNumber').addEventListener('input', (e) => {
            this.threadSettings.number = e.target.value;
        });
        
        document.getElementById('threadColor').addEventListener('input', (e) => {
            this.threadSettings.color = e.target.value;
            document.getElementById('colorPreview').style.background = e.target.value;
        });
        
        document.getElementById('threadStrands').addEventListener('change', (e) => {
            this.threadSettings.strands = parseInt(e.target.value);
        });
        
        document.getElementById('threadNote').addEventListener('input', (e) => {
            this.threadSettings.note = e.target.value;
        });
        
        document.getElementById('gridSize').addEventListener('input', (e) => {
            this.gridSize = parseInt(e.target.value);
            document.getElementById('gridSizeValue').textContent = `${this.gridSize}px`;
            this.drawGrid();
        });
        
        document.getElementById('zoomLevel').addEventListener('input', (e) => {
            this.zoom = parseInt(e.target.value) / 100;
            document.getElementById('zoomValue').textContent = `${Math.round(this.zoom * 100)}%`;
            this.resizeCanvas();
            this.drawGrid();
        });
        
        document.getElementById('snapToGrid').addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });
        
        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.gridCanvas.style.opacity = this.showGrid ? '1' : '0';
        });
        
        document.getElementById('bgOpacity').addEventListener('input', (e) => {
            this.bgOpacity = parseInt(e.target.value) / 100;
            document.getElementById('bgOpacityValue').textContent = `${Math.round(this.bgOpacity * 100)}%`;
            this.bgImage.style.opacity = this.bgOpacity;
        });
        
        document.getElementById('uploadBgBtn').addEventListener('click', () => {
            document.getElementById('bgImageInput').click();
        });
        
        document.getElementById('bgImageInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.bgImageData = event.target.result;
                    this.bgImage.src = this.bgImageData;
                    this.bgImage.style.display = 'block';
                    this.bgImage.style.opacity = this.bgOpacity;
                    this.bgImage.onload = () => {
                        const scale = Math.min(
                            this.canvasWidth / this.bgImage.naturalWidth,
                            this.canvasHeight / this.bgImage.naturalHeight
                        );
                        this.bgImageWidth = this.bgImage.naturalWidth * scale;
                        this.bgImageHeight = this.bgImage.naturalHeight * scale;
                        this.bgImage.width = this.bgImageWidth;
                        this.bgImage.height = this.bgImageHeight;
                    };
                };
                reader.readAsDataURL(file);
            }
        });
        
        document.getElementById('clearBgBtn').addEventListener('click', () => {
            this.bgImageData = null;
            this.bgImageWidth = 0;
            this.bgImageHeight = 0;
            this.bgImage.src = '';
            this.bgImage.style.display = 'none';
            document.getElementById('bgImageInput').value = '';
        });
        
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        
        document.getElementById('saveBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('loadBtn').addEventListener('click', () => this.showLoadModal());
        document.getElementById('exportPngBtn').addEventListener('click', () => this.exportPNG());
        document.getElementById('exportSvgBtn').addEventListener('click', () => this.exportSVG());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJSON());
        document.getElementById('generateStepsBtn').addEventListener('click', () => this.generateSteps());
        
        document.getElementById('closeStepsModal').addEventListener('click', () => {
            document.getElementById('stepsModal').classList.remove('show');
        });
        
        document.getElementById('closeLoadModal').addEventListener('click', () => {
            document.getElementById('loadModal').classList.remove('show');
        });
        
        document.getElementById('copyStepsBtn').addEventListener('click', () => {
            const content = document.getElementById('stepsContent').innerText;
            navigator.clipboard.writeText(content).then(() => {
                alert('已复制到剪贴板！');
            });
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                } else if (e.key === 's') {
                    e.preventDefault();
                    this.saveProject();
                }
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedPathIndex >= 0) {
                    this.deletePath(this.selectedPathIndex);
                }
            }
        });
    }
    
    getCanvasCoords(e) {
        const rect = this.drawCanvas.getBoundingClientRect();
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
        
        this.drawPreview();
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
            this.drawPreview();
        }
    }
    
    handleMouseUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (this.currentPath.length >= 2 || (this.currentTool === 'frenchKnot' && this.currentPath.length >= 1)) {
            this.saveState();
            this.paths.push([...this.currentPath]);
            this.redrawAll();
            this.updateUI();
        }
        
        this.currentPath = [];
        this.drawCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
    
    drawPreview() {
        this.drawCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        if (this.currentPath.length === 0) return;
        
        this.drawCtx.strokeStyle = this.threadSettings.color;
        this.drawCtx.fillStyle = this.threadSettings.color;
        this.drawCtx.lineWidth = this.threadSettings.strands;
        this.drawCtx.lineCap = 'round';
        this.drawCtx.lineJoin = 'round';
        
        this.drawStitch(this.drawCtx, this.currentPath, this.currentTool);
    }
    
    drawStitch(ctx, path, type) {
        if (path.length === 0) return;
        
        const color = path[0].color;
        const strands = path[0].strands;
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = strands;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        switch (type) {
            case 'running':
                this.drawRunningStitch(ctx, path);
                break;
            case 'backstitch':
                this.drawBackstitch(ctx, path);
                break;
            case 'satin':
                this.drawSatinStitch(ctx, path);
                break;
            case 'frenchKnot':
                this.drawFrenchKnot(ctx, path);
                break;
        }
    }
    
    drawRunningStitch(ctx, path) {
        const stitchLength = this.gridSize;
        
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            const steps = Math.max(1, Math.floor(dist / stitchLength));
            
            for (let s = 0; s < steps; s += 2) {
                const t1 = s / steps;
                const t2 = Math.min((s + 1) / steps, 1);
                
                ctx.beginPath();
                ctx.moveTo(
                    p1.x + (p2.x - p1.x) * t1,
                    p1.y + (p2.y - p1.y) * t1
                );
                ctx.lineTo(
                    p1.x + (p2.x - p1.x) * t2,
                    p1.y + (p2.y - p1.y) * t2
                );
                ctx.stroke();
            }
        }
    }
    
    drawBackstitch(ctx, path) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
    }
    
    drawSatinStitch(ctx, path) {
        ctx.lineWidth = this.gridSize * 0.8;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
        ctx.lineWidth = path[0].strands;
    }
    
    drawFrenchKnot(ctx, path) {
        const radius = this.gridSize * 0.3;
        
        path.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    drawGrid() {
        this.gridCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.gridCtx.strokeStyle = '#e5e7eb';
        this.gridCtx.lineWidth = 0.5;
        
        for (let x = 0; x <= this.canvasWidth; x += this.gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, this.canvasHeight);
            this.gridCtx.stroke();
        }
        
        for (let y = 0; y <= this.canvasHeight; y += this.gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(this.canvasWidth, y);
            this.gridCtx.stroke();
        }
    }
    
    redrawAll() {
        this.mainCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        this.paths.forEach((path, index) => {
            if (path.length > 0) {
                this.drawStitch(this.mainCtx, path, path[0].type);
                
                if (index === this.selectedPathIndex) {
                    this.mainCtx.strokeStyle = '#667eea';
                    this.mainCtx.lineWidth = 2;
                    this.mainCtx.setLineDash([5, 5]);
                    this.mainCtx.beginPath();
                    
                    const bounds = this.getPathBounds(path);
                    this.mainCtx.rect(
                        bounds.minX - 5,
                        bounds.minY - 5,
                        bounds.maxX - bounds.minX + 10,
                        bounds.maxY - bounds.minY + 10
                    );
                    this.mainCtx.stroke();
                    this.mainCtx.setLineDash([]);
                }
            }
        });
    }
    
    getPathBounds(path) {
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
    
    selectPathAt(x, y) {
        const threshold = 15;
        
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (const point of path) {
                const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                if (dist < threshold) {
                    this.selectedPathIndex = i;
                    this.redrawAll();
                    this.updateSelectedPathInfo();
                    return;
                }
            }
        }
        
        this.selectedPathIndex = -1;
        this.redrawAll();
        this.updateSelectedPathInfo();
    }
    
    eraseAt(x, y) {
        const threshold = 15;
        
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (const point of path) {
                const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                if (dist < threshold) {
                    this.saveState();
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
            this.saveState();
            this.paths.splice(index, 1);
            this.selectedPathIndex = -1;
            this.redrawAll();
            this.updateUI();
        }
    }
    
    saveState() {
        this.undoStack.push(JSON.stringify(this.paths));
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.undoStack.length > 0) {
            this.redoStack.push(JSON.stringify(this.paths));
            this.paths = JSON.parse(this.undoStack.pop());
            this.selectedPathIndex = -1;
            this.redrawAll();
            this.updateUI();
            this.updateUndoRedoButtons();
        }
    }
    
    redo() {
        if (this.redoStack.length > 0) {
            this.undoStack.push(JSON.stringify(this.paths));
            this.paths = JSON.parse(this.redoStack.pop());
            this.selectedPathIndex = -1;
            this.redrawAll();
            this.updateUI();
            this.updateUndoRedoButtons();
        }
    }
    
    updateUndoRedoButtons() {
        document.getElementById('undoBtn').disabled = this.undoStack.length === 0;
        document.getElementById('redoBtn').disabled = this.redoStack.length === 0;
    }
    
    clearAll() {
        if (this.paths.length === 0 || confirm('确定要清空所有针法吗？')) {
            this.saveState();
            this.paths = [];
            this.selectedPathIndex = -1;
            this.redrawAll();
            this.updateUI();
        }
    }
    
    updateUI() {
        this.updateThreadList();
        this.updateStitchStats();
        this.updateLengthEstimate();
        this.updateSelectedPathInfo();
        this.updateUndoRedoButtons();
    }
    
    updateThreadList() {
        const threadList = document.getElementById('threadList');
        const threadMap = new Map();
        
        this.paths.forEach(path => {
            if (path.length > 0) {
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
                    length += Math.sqrt(
                        Math.pow(path[i].x - path[i-1].x, 2) + 
                        Math.pow(path[i].y - path[i-1].y, 2)
                    );
                }
                threadMap.get(key).length += length;
            }
        });
        
        if (threadMap.size === 0) {
            threadList.innerHTML = '<p class="empty-text">暂无绣线</p>';
            return;
        }
        
        threadList.innerHTML = Array.from(threadMap.values()).map(thread => `
            <div class="thread-item">
                <div class="thread-color" style="background: ${thread.color}"></div>
                <div class="thread-info">
                    <div class="thread-number">${thread.number}</div>
                    <div class="thread-details">${thread.strands}股 · ${this.pixelsToCm(thread.length).toFixed(1)}cm</div>
                </div>
            </div>
        `).join('');
    }
    
    updateStitchStats() {
        const stats = { running: 0, backstitch: 0, satin: 0, frenchKnot: 0 };
        
        this.paths.forEach(path => {
            if (path.length > 0) {
                stats[path[0].type]++;
            }
        });
        
        document.getElementById('runningCount').textContent = stats.running;
        document.getElementById('backstitchCount').textContent = stats.backstitch;
        document.getElementById('satinCount').textContent = stats.satin;
        document.getElementById('frenchKnotCount').textContent = stats.frenchKnot;
    }
    
    updateLengthEstimate() {
        let totalLength = 0;
        
        this.paths.forEach(path => {
            for (let i = 1; i < path.length; i++) {
                totalLength += Math.sqrt(
                    Math.pow(path[i].x - path[i-1].x, 2) + 
                    Math.pow(path[i].y - path[i-1].y, 2)
                );
            }
        });
        
        const totalCm = this.pixelsToCm(totalLength);
        const skeinLength = 800;
        const wasteFactor = 1.3;
        const estimatedSkeins = Math.ceil((totalCm * wasteFactor) / skeinLength);
        
        document.getElementById('totalLength').textContent = `${totalCm.toFixed(1)} cm`;
        document.getElementById('totalSkeins').textContent = estimatedSkeins;
    }
    
    pixelsToCm(pixels) {
        const dpi = 96;
        return (pixels / dpi) * 2.54;
    }
    
    updateSelectedPathInfo() {
        const info = document.getElementById('selectedPathInfo');
        
        if (this.selectedPathIndex < 0 || this.selectedPathIndex >= this.paths.length) {
            info.innerHTML = '<p class="empty-text">未选中任何路径</p>';
            return;
        }
        
        const path = this.paths[this.selectedPathIndex];
        if (path.length === 0) {
            info.innerHTML = '<p class="empty-text">未选中任何路径</p>';
            return;
        }
        
        const stitchTypes = {
            running: '平针',
            backstitch: '回针',
            satin: '缎面针',
            frenchKnot: '结粒针'
        };
        
        let length = 0;
        for (let i = 1; i < path.length; i++) {
            length += Math.sqrt(
                Math.pow(path[i].x - path[i-1].x, 2) + 
                Math.pow(path[i].y - path[i-1].y, 2)
            );
        }
        
        info.innerHTML = `
            <div class="selected-path-details">
                <div class="detail-row">
                    <span class="detail-label">针法类型</span>
                    <span class="detail-value">${stitchTypes[path[0].type]}</span>
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
                    <span class="detail-value">${this.pixelsToCm(length).toFixed(1)} cm</span>
                </div>
                ${path[0].note ? `
                <div class="detail-row">
                    <span class="detail-label">备注</span>
                    <span class="detail-value">${path[0].note}</span>
                </div>
                ` : ''}
            </div>
            <div class="selected-path-actions">
                <button class="btn btn-danger" onclick="editor.deletePath(${this.selectedPathIndex})">删除</button>
            </div>
        `;
    }
    
    updateCursor() {
        const cursors = {
            running: 'crosshair',
            backstitch: 'crosshair',
            satin: 'crosshair',
            frenchKnot: 'crosshair',
            select: 'pointer',
            eraser: 'not-allowed'
        };
        this.drawCanvas.style.cursor = cursors[this.currentTool] || 'crosshair';
    }
    
    saveProject() {
        const projectName = document.getElementById('projectName').value.trim() || '未命名方案';
        const projects = JSON.parse(localStorage.getItem('embroideryProjects') || '[]');
        
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
        
        const existingIndex = projects.findIndex(p => p.name === projectName);
        if (existingIndex >= 0) {
            if (confirm('已存在同名方案，是否覆盖？')) {
                projects[existingIndex] = project;
            } else {
                return;
            }
        } else {
            projects.push(project);
        }
        
        localStorage.setItem('embroideryProjects', JSON.stringify(projects));
        alert('保存成功！');
    }
    
    showLoadModal() {
        const projects = JSON.parse(localStorage.getItem('embroideryProjects') || '[]');
        const content = document.getElementById('loadContent');
        
        if (projects.length === 0) {
            content.innerHTML = '<p class="empty-text">暂无保存的方案</p>';
        } else {
            content.innerHTML = projects.map(project => `
                <div class="save-item">
                    <div class="save-info">
                        <div class="save-name">${project.name}</div>
                        <div class="save-date">${project.date}</div>
                    </div>
                    <div class="save-actions">
                        <button class="btn btn-primary" onclick="editor.loadProject(${project.id})">加载</button>
                        <button class="btn btn-danger" onclick="editor.deleteProject(${project.id})">删除</button>
                    </div>
                </div>
            `).join('');
        }
        
        document.getElementById('loadModal').classList.add('show');
    }
    
    loadProject(id) {
        const projects = JSON.parse(localStorage.getItem('embroideryProjects') || '[]');
        const project = projects.find(p => p.id === id);
        
        if (project) {
            document.getElementById('projectName').value = project.name;
            this.canvasWidth = project.canvasWidth || 800;
            this.canvasHeight = project.canvasHeight || 600;
            this.gridSize = project.gridSize || 20;
            this.zoom = project.zoom !== undefined ? project.zoom : 1;
            this.snapToGrid = project.snapToGrid !== undefined ? project.snapToGrid : true;
            this.showGrid = project.showGrid !== undefined ? project.showGrid : true;
            this.bgOpacity = project.bgOpacity !== undefined ? project.bgOpacity : 0.3;
            this.bgImageData = project.bgImageData || null;
            this.bgImageWidth = project.bgImageWidth || 0;
            this.bgImageHeight = project.bgImageHeight || 0;
            this.paths = project.paths || [];
            
            document.getElementById('gridSize').value = this.gridSize;
            document.getElementById('gridSizeValue').textContent = `${this.gridSize}px`;
            document.getElementById('zoomLevel').value = Math.round(this.zoom * 100);
            document.getElementById('zoomValue').textContent = `${Math.round(this.zoom * 100)}%`;
            document.getElementById('snapToGrid').checked = this.snapToGrid;
            document.getElementById('showGrid').checked = this.showGrid;
            document.getElementById('bgOpacity').value = Math.round(this.bgOpacity * 100);
            document.getElementById('bgOpacityValue').textContent = `${Math.round(this.bgOpacity * 100)}%`;
            
            if (this.bgImageData) {
                this.bgImage.src = this.bgImageData;
                this.bgImage.style.display = 'block';
                this.bgImage.style.opacity = this.bgOpacity;
                this.bgImage.width = this.bgImageWidth;
                this.bgImage.height = this.bgImageHeight;
            } else {
                this.bgImage.src = '';
                this.bgImage.style.display = 'none';
            }
            
            this.gridCanvas.style.opacity = this.showGrid ? '1' : '0';
            
            this.setupCanvas();
            this.drawGrid();
            this.redrawAll();
            this.updateUI();
            
            document.getElementById('loadModal').classList.remove('show');
        }
    }
    
    deleteProject(id) {
        if (confirm('确定要删除这个方案吗？')) {
            let projects = JSON.parse(localStorage.getItem('embroideryProjects') || '[]');
            projects = projects.filter(p => p.id !== id);
            localStorage.setItem('embroideryProjects', JSON.stringify(projects));
            this.showLoadModal();
        }
    }
    
    exportPNG() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvasWidth;
        tempCanvas.height = this.canvasHeight;
        const ctx = tempCanvas.getContext('2d');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        this.paths.forEach(path => {
            if (path.length > 0) {
                this.drawStitch(ctx, path, path[0].type);
            }
        });
        
        const link = document.createElement('a');
        link.download = `${document.getElementById('projectName').value || 'embroidery'}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }
    
    exportSVG() {
        const stitchTypes = {
            running: '平针',
            backstitch: '回针',
            satin: '缎面针',
            frenchKnot: '结粒针'
        };
        
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvasWidth}" height="${this.canvasHeight}" viewBox="0 0 ${this.canvasWidth} ${this.canvasHeight}">
    <rect width="100%" height="100%" fill="#ffffff"/>
`;
        
        this.paths.forEach((path, index) => {
            if (path.length > 0) {
                svgContent += `    <g id="path-${index}" data-type="${stitchTypes[path[0].type]}" data-thread="${path[0].number}">\n`;
                
                if (path[0].type === 'frenchKnot') {
                    const radius = this.gridSize * 0.3;
                    path.forEach(p => {
                        svgContent += `        <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${p.color}"/>\n`;
                    });
                } else {
                    svgContent += `        <path d="M ${path[0].x} ${path[0].y}`;
                    for (let i = 1; i < path.length; i++) {
                        svgContent += ` L ${path[i].x} ${path[i].y}`;
                    }
                    svgContent += `" stroke="${path[0].color}" stroke-width="${path[0].strands}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
                }
                
                svgContent += `    </g>\n`;
            }
        });
        
        svgContent += `</svg>`;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = `${document.getElementById('projectName').value || 'embroidery'}.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }
    
    exportJSON() {
        const project = {
            name: document.getElementById('projectName').value || 'embroidery',
            date: new Date().toISOString(),
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            gridSize: this.gridSize,
            paths: this.paths
        };
        
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `${project.name}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }
    
    generateSteps() {
        const stitchTypes = {
            running: '平针',
            backstitch: '回针',
            satin: '缎面针',
            frenchKnot: '结粒针'
        };
        
        const steps = [];
        const threadGroups = new Map();
        
        this.paths.forEach((path, index) => {
            if (path.length > 0) {
                const key = `${path[0].number}-${path[0].color}`;
                if (!threadGroups.has(key)) {
                    threadGroups.set(key, []);
                }
                threadGroups.get(key).push({ path, index });
            }
        });
        
        steps.push({
            title: '准备工作',
            text: '准备绣布、绣线、绣针等工具。将绣布固定在绣绷上，确保布料平整。根据设计图案规划刺绣顺序。'
        });
        
        threadGroups.forEach((paths, key) => {
            const firstPath = paths[0].path[0];
            const typeCounts = {};
            
            paths.forEach(({ path }) => {
                const type = path[0].type;
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            
            const typeDesc = Object.entries(typeCounts)
                .map(([type, count]) => `${count}处${stitchTypes[type]}`)
                .join('、');
            
            steps.push({
                title: `使用 ${firstPath.number} 绣线`,
                text: `取出${firstPath.number}号绣线（${firstPath.color}），使用${firstPath.strands}股线进行刺绣。在图案上完成${typeDesc}。${firstPath.note ? `注意：${firstPath.note}` : ''}`
            });
        });
        
        const stitchOrder = ['frenchKnot', 'running', 'backstitch', 'satin'];
        const stitchDescriptions = {
            frenchKnot: '结粒针：用于点缀细节，如眼睛、花蕊等。将线绕针2-3圈，插入布中拉紧形成小结。',
            running: '平针：用于轮廓和简单线条。针脚均匀，一上一下穿过布料。',
            backstitch: '回针：用于精细轮廓和线条。每针回退半针，形成连续的线条。',
            satin: '缎面针：用于填充大面积区域。针脚紧密平行，形成光滑的缎面效果。'
        };
        
        const usedTypes = new Set();
        this.paths.forEach(path => {
            if (path.length > 0) {
                usedTypes.add(path[0].type);
            }
        });
        
        if (usedTypes.size > 0) {
            steps.push({
                title: '针法说明',
                text: Array.from(usedTypes)
                    .sort((a, b) => stitchOrder.indexOf(a) - stitchOrder.indexOf(b))
                    .map(type => stitchDescriptions[type])
                    .join(' ')
            });
        }
        
        steps.push({
            title: '后续处理',
            text: '刺绣完成后，小心取下绣绷。检查是否有松动的线头，修剪多余线头。可根据需要进行熨烫或装裱。'
        });
        
        const content = document.getElementById('stepsContent');
        content.innerHTML = `
            <div class="steps-content">
                ${steps.map((step, i) => `
                    <div class="step-item">
                        <div class="step-number">步骤 ${i + 1}：${step.title}</div>
                        <div class="step-text">${step.text}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById('stepsModal').classList.add('show');
    }
}

const editor = new EmbroideryEditor();
