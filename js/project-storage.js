import { STORAGE_KEYS } from './constants.js';

export class ProjectStorage {
    constructor(state) {
        this.state = state;
    }

    _readAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
        } catch (e) {
            console.warn('读取本地存储失败:', e);
            return [];
        }
    }

    _writeAll(projects) {
        try {
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
            return true;
        } catch (e) {
            console.error('写入本地存储失败:', e);
            return false;
        }
    }

    saveProject(projectName, onConfirm) {
        const name = projectName.trim() || '未命名方案';
        const projects = this._readAll();
        const project = { name, ...this.state.getSerializableState() };

        const existingIndex = projects.findIndex(p => p.name === name);
        if (existingIndex >= 0) {
            const shouldOverwrite = onConfirm ? onConfirm('overwrite', name) : true;
            if (!shouldOverwrite) return { success: false, reason: 'cancelled' };
            projects[existingIndex] = project;
        } else {
            projects.push(project);
        }

        const success = this._writeAll(projects);
        return { success, projectId: project.id };
    }

    listProjects() {
        return this._readAll();
    }

    loadProject(id) {
        const projects = this._readAll();
        const project = projects.find(p => p.id === id);
        if (!project) return null;
        return project;
    }

    deleteProject(id, onConfirm) {
        const shouldDelete = onConfirm ? onConfirm('delete') : true;
        if (!shouldDelete) return false;

        let projects = this._readAll();
        projects = projects.filter(p => p.id !== id);
        return this._writeAll(projects);
    }

    findProjectByName(name) {
        const projects = this._readAll();
        return projects.find(p => p.name === name) || null;
    }
}
