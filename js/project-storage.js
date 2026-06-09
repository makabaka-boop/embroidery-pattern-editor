// 项目持久化：基于 localStorage 的方案 CRUD。
import { STORAGE_KEY } from './constants.js';

/**
 * 读取所有方案；解析失败时返回空数组以兼容数据被破坏的情况。
 */
export function loadProjects() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
    } catch (err) {
        console.warn('[storage] 解析方案失败，已重置：', err);
        return [];
    }
}

/**
 * 写入方案列表。
 */
function persistProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/**
 * 根据当前编辑器状态构建可序列化的方案对象。
 */
export function buildProjectSnapshot(state, name) {
    return {
        id: Date.now(),
        name,
        date: new Date().toLocaleString(),
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        gridSize: state.gridSize,
        zoom: state.zoom,
        snapToGrid: state.snapToGrid,
        showGrid: state.showGrid,
        bgOpacity: state.bgOpacity,
        bgImageData: state.bgImageData,
        bgImageWidth: state.bgImageWidth,
        bgImageHeight: state.bgImageHeight,
        paths: state.paths
    };
}

/**
 * 保存方案。若同名存在，则交由调用方决定是否覆盖。
 * @returns {{ saved: boolean, conflict: boolean }}
 */
export function saveProject(state, name, { overwriteIfExists = false } = {}) {
    const projects = loadProjects();
    const project = buildProjectSnapshot(state, name);
    const existingIndex = projects.findIndex(p => p.name === name);

    if (existingIndex >= 0) {
        if (!overwriteIfExists) {
            return { saved: false, conflict: true };
        }
        projects[existingIndex] = project;
    } else {
        projects.push(project);
    }

    persistProjects(projects);
    return { saved: true, conflict: false };
}

/**
 * 根据 id 查找方案。
 */
export function getProjectById(id) {
    return loadProjects().find(p => p.id === id) || null;
}

/**
 * 根据 id 删除方案。
 */
export function deleteProjectById(id) {
    const projects = loadProjects().filter(p => p.id !== id);
    persistProjects(projects);
}
