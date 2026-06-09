import { STORAGE_KEY } from './constants.js';

export class ProjectStore {
    list() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    save(projectData) {
        const projects = this.list();
        const existingIndex = projects.findIndex(p => p.name === projectData.name);

        if (existingIndex >= 0) {
            if (!confirm('已存在同名方案，是否覆盖？')) {
                return false;
            }
            projects[existingIndex] = projectData;
        } else {
            projects.push(projectData);
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
            return true;
        } catch {
            alert('保存失败，存储空间可能不足。');
            return false;
        }
    }

    load(id) {
        const projects = this.list();
        return projects.find(p => p.id === id) || null;
    }

    delete(id) {
        if (!confirm('确定要删除这个方案吗？')) return false;
        const projects = this.list().filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        return true;
    }
}
