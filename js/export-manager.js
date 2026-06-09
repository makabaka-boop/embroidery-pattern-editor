import { STITCH_TYPES, STITCH_TYPE_NAMES } from './constants.js';

export class ExportManager {
    constructor(state, renderer) {
        this.state = state;
        this.renderer = renderer;
    }

    _sanitizeName(name) {
        return (name || 'embroidery').trim() || 'embroidery';
    }

    _downloadBlob(blob, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    _downloadDataUrl(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportPNG(projectName) {
        const { canvasWidth, canvasHeight } = this.state;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const ctx = tempCanvas.getContext('2d');

        this.renderer.renderToContext(ctx, this.state.paths, '#ffffff');

        const filename = `${this._sanitizeName(projectName)}.png`;
        this._downloadDataUrl(tempCanvas.toDataURL('image/png'), filename);
    }

    exportSVG(projectName) {
        const { canvasWidth, canvasHeight, gridSize, paths } = this.state;

        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
    <rect width="100%" height="100%" fill="#ffffff"/>
`;

        paths.forEach((path, index) => {
            if (!path || path.length === 0) return;
            const first = path[0];
            const typeName = STITCH_TYPE_NAMES[first.type] || first.type;

            svgContent += `    <g id="path-${index}" data-type="${typeName}" data-thread="${first.number}">\n`;

            if (first.type === STITCH_TYPES.FRENCH_KNOT) {
                const radius = gridSize * 0.3;
                path.forEach(p => {
                    svgContent += `        <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${p.color}"/>\n`;
                });
            } else {
                const strokeWidth = first.type === STITCH_TYPES.SATIN
                    ? gridSize * 0.8
                    : first.strands;
                svgContent += `        <path d="M ${first.x} ${first.y}`;
                for (let i = 1; i < path.length; i++) {
                    svgContent += ` L ${path[i].x} ${path[i].y}`;
                }
                svgContent += `" stroke="${first.color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
            }

            svgContent += `    </g>\n`;
        });

        svgContent += `</svg>`;

        const filename = `${this._sanitizeName(projectName)}.svg`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        this._downloadBlob(blob, filename);
    }

    exportJSON(projectName) {
        const { canvasWidth, canvasHeight, gridSize, paths } = this.state;
        const project = {
            name: this._sanitizeName(projectName),
            date: new Date().toISOString(),
            canvasWidth,
            canvasHeight,
            gridSize,
            paths
        };

        const filename = `${project.name}.json`;
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        this._downloadBlob(blob, filename);
    }
}
