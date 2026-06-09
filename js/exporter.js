// 导出处理：PNG / SVG / JSON 三种格式，复用 CanvasRenderer 的 drawStitch 逻辑保持视觉一致。
import { STITCH_TYPE_NAMES } from './constants.js';

/**
 * 触发浏览器下载。
 */
function triggerDownload(href, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = href;
    link.click();
}

/**
 * 导出 PNG。基于离屏 Canvas，先填充白底，再复用 renderer 的针法绘制。
 */
export function exportPNG(state, renderer, filenameBase) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.canvasWidth;
    tempCanvas.height = state.canvasHeight;
    const ctx = tempCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    state.paths.forEach(path => {
        if (path.length > 0) {
            renderer.drawStitch(ctx, path, path[0].type);
        }
    });

    triggerDownload(tempCanvas.toDataURL('image/png'), `${filenameBase || 'embroidery'}.png`);
}

/**
 * 导出 SVG。结粒针使用 circle，其余使用 path。
 */
export function exportSVG(state, filenameBase) {
    const { canvasWidth, canvasHeight, gridSize, paths } = state;

    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`,
        '    <rect width="100%" height="100%" fill="#ffffff"/>'
    ];

    paths.forEach((path, index) => {
        if (path.length === 0) return;
        const head = path[0];
        const typeName = STITCH_TYPE_NAMES[head.type] || head.type;
        lines.push(`    <g id="path-${index}" data-type="${typeName}" data-thread="${head.number}">`);

        if (head.type === 'frenchKnot') {
            const radius = gridSize * 0.3;
            path.forEach(p => {
                lines.push(`        <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${p.color}"/>`);
            });
        } else {
            const d = [`M ${head.x} ${head.y}`];
            for (let i = 1; i < path.length; i++) {
                d.push(`L ${path[i].x} ${path[i].y}`);
            }
            lines.push(
                `        <path d="${d.join(' ')}" stroke="${head.color}" stroke-width="${head.strands}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
            );
        }

        lines.push('    </g>');
    });

    lines.push('</svg>');

    const blob = new Blob([lines.join('\n')], { type: 'image/svg+xml' });
    triggerDownload(URL.createObjectURL(blob), `${filenameBase || 'embroidery'}.svg`);
}

/**
 * 导出 JSON 方案数据。
 */
export function exportJSON(state, filenameBase) {
    const project = {
        name: filenameBase || 'embroidery',
        date: new Date().toISOString(),
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        gridSize: state.gridSize,
        paths: state.paths
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    triggerDownload(URL.createObjectURL(blob), `${project.name}.json`);
}
