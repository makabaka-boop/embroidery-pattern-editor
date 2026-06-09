/**
 * 导出管理器 - 负责各种格式的导出功能
 * 支持 PNG、SVG、JSON 三种格式导出
 */
class ExportManager {
    constructor(stateManager, canvasRenderer) {
        this.state = stateManager;
        this.renderer = canvasRenderer;

        this.stitchTypeNames = {
            running: '平针',
            backstitch: '回针',
            satin: '缎面针',
            frenchKnot: '结粒针'
        };
    }

    exportPNG(filename) {
        const name = this.sanitizeFilename(filename) || 'embroidery';

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.state.canvasWidth;
        tempCanvas.height = this.state.canvasHeight;
        const ctx = tempCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

        this.state.paths.forEach(path => {
            if (path.length > 0) {
                this.renderer.drawStitch(ctx, path, path[0].type);
            }
        });

        const dataUrl = tempCanvas.toDataURL('image/png');
        this.downloadDataUrl(dataUrl, `${name}.png`);

        return true;
    }

    exportSVG(filename) {
        const name = this.sanitizeFilename(filename) || 'embroidery';
        const svgContent = this.generateSVGContent();
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        this.downloadBlob(blob, `${name}.svg`);
        return true;
    }

    exportJSON(filename) {
        const name = this.sanitizeFilename(filename) || 'embroidery';
        const project = {
            name,
            date: new Date().toISOString(),
            canvasWidth: this.state.canvasWidth,
            canvasHeight: this.state.canvasHeight,
            gridSize: this.state.gridSize,
            paths: this.state.paths
        };
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, `${name}.json`);
        return true;
    }

    generateSVGContent() {
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.state.canvasWidth}" height="${this.state.canvasHeight}" viewBox="0 0 ${this.state.canvasWidth} ${this.state.canvasHeight}">
    <rect width="100%" height="100%" fill="#ffffff"/>
`;

        this.state.paths.forEach((path, index) => {
            if (path.length === 0) return;

            const typeName = this.stitchTypeNames[path[0].type] || path[0].type;
            svgContent += `    <g id="path-${index}" data-type="${typeName}" data-thread="${path[0].number}">\n`;

            if (path[0].type === 'frenchKnot') {
                const radius = this.state.gridSize * 0.3;
                path.forEach(p => {
                    svgContent += `        <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${p.color}"/>\n`;
                });
            } else {
                let pathData = `M ${path[0].x} ${path[0].y}`;
                for (let i = 1; i < path.length; i++) {
                    pathData += ` L ${path[i].x} ${path[i].y}`;
                }
                svgContent += `        <path d="${pathData}" stroke="${path[0].color}" stroke-width="${path[0].strands}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
            }

            svgContent += `    </g>\n`;
        });

        svgContent += `</svg>`;
        return svgContent;
    }

    downloadDataUrl(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') return '';
        return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
    }

    getStitchTypeName(type) {
        return this.stitchTypeNames[type] || type;
    }
}
