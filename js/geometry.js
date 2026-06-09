// 几何与单位换算工具：从渲染、统计、命中检测中抽离的纯函数。
import { DPI } from './constants.js';

/**
 * 计算两点之间的欧几里得距离。
 */
export function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算一条路径上所有相邻点的累计长度（像素）。
 */
export function pathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
        length += distance(path[i], path[i - 1]);
    }
    return length;
}

/**
 * 像素 -> 厘米换算。
 */
export function pixelsToCm(pixels) {
    return (pixels / DPI) * 2.54;
}

/**
 * 计算一条路径的包围盒。
 */
export function getPathBounds(path) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    path.forEach(point => {
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
    });

    return { minX, minY, maxX, maxY };
}

/**
 * 路径中是否存在距离目标点 (x, y) 在阈值范围内的控制点。
 */
export function isPathHit(path, x, y, threshold) {
    for (const point of path) {
        if (distance(point, { x, y }) < threshold) {
            return true;
        }
    }
    return false;
}
