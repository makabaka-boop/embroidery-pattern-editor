import { STITCH_TYPE_NAMES } from './constants.js';

export class ExportManager {
    exportPNG(offscreenCanvas, projectName) {
        const link = document.createElement('a');
        link.download = `${projectName || 'embroidery'}.png`;
        link.href = offscreenCanvas.toDataURL('image/png');
        link.click();
    }

    exportSVG(paths, canvasWidth, canvasHeight, gridSize, projectName) {
        let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">\n`;
        svg += `    <rect width="100%" height="100%" fill="#ffffff"/>\n`;

        paths.forEach((path, index) => {
            if (path.length === 0) return;
            const typeName = STITCH_TYPE_NAMES[path[0].type] || path[0].type;
            svg += `    <g id="path-${index}" data-type="${typeName}" data-thread="${path[0].number}">\n`;

            if (path[0].type === 'frenchKnot') {
                const radius = gridSize * 0.3;
                path.forEach(p => {
                    svg += `        <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${p.color}"/>\n`;
                });
            } else if (path[0].type === 'running') {
                const stitchLength = gridSize;
                for (let i = 0; i < path.length - 1; i++) {
                    const p1 = path[i];
                    const p2 = path[i + 1];
                    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
                    const steps = Math.max(1, Math.floor(dist / stitchLength));
                    for (let s = 0; s < steps; s += 2) {
                        const t1 = s / steps;
                        const t2 = Math.min((s + 1) / steps, 1);
                        const x1 = p1.x + (p2.x - p1.x) * t1;
                        const y1 = p1.y + (p2.y - p1.y) * t1;
                        const x2 = p1.x + (p2.x - p1.x) * t2;
                        const y2 = p1.y + (p2.y - p1.y) * t2;
                        svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${path[0].color}" stroke-width="${path[0].strands}" stroke-linecap="round"/>\n`;
                    }
                }
            } else if (path[0].type === 'satin') {
                svg += `        <path d="M ${path[0].x} ${path[0].y}`;
                for (let i = 1; i < path.length; i++) {
                    svg += ` L ${path[i].x} ${path[i].y}`;
                }
                svg += `" stroke="${path[0].color}" stroke-width="${gridSize * 0.8}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
            } else {
                svg += `        <path d="M ${path[0].x} ${path[0].y}`;
                for (let i = 1; i < path.length; i++) {
                    svg += ` L ${path[i].x} ${path[i].y}`;
                }
                svg += `" stroke="${path[0].color}" stroke-width="${path[0].strands}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
            }

            svg += `    </g>\n`;
        });

        svg += `</svg>`;

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = `${projectName || 'embroidery'}.svg`;
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    exportJSON(paths, canvasWidth, canvasHeight, gridSize, projectName) {
        const data = {
            name: projectName || 'embroidery',
            date: new Date().toISOString(),
            canvasWidth,
            canvasHeight,
            gridSize,
            paths
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `${data.name}.json`;
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
