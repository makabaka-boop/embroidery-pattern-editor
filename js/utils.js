import { DPI, SKEIN_LENGTH_CM, WASTE_FACTOR } from './constants.js';

export function calculatePathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x;
        const dy = path[i].y - path[i - 1].y;
        length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
}

export function pixelsToCm(pixels) {
    return (pixels / DPI) * 2.54;
}

export function estimateSkeins(totalCm) {
    return Math.ceil((totalCm * WASTE_FACTOR) / SKEIN_LENGTH_CM);
}

export function getPathBounds(path) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const p of path) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }

    return { minX, minY, maxX, maxY };
}

export function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
