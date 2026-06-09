/**
 * 项目存储管理器 - 负责项目的保存、加载和删除
 * 使用 localStorage 存储项目数据
 */
class StorageManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.storageKey = 'embroideryProjects';
    }

    getProjects() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load projects from localStorage:', e);
            return [];
        }
    }

    saveProjects(projects) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(projects));
            return true;
        } catch (e) {
            console.error('Failed to save projects to localStorage:', e);
            return false;
        }
    }

    findProjectById(id) {
        const projects = this.getProjects();
        return projects.find(p => p.id === id) || null;
    }

    findProjectByName(name) {
        const projects = this.getProjects();
        return projects.find(p => p.name === name) || null;
    }

    saveProject(projectName, overwrite = false) {
        const name = projectName?.trim() || '未命名方案';
        const projects = this.getProjects();
        const projectData = this.state.getProjectData(name);

        const existingIndex = projects.findIndex(p => p.name === name);

        if (existingIndex >= 0) {
            if (!overwrite) {
                return { success: false, duplicate: true, message: '项目名称已存在' };
            }
            projectData.id = projects[existingIndex].id;
            projects[existingIndex] = projectData;
        } else {
            projects.push(projectData);
        }

        const success = this.saveProjects(projects);
        return {
            success,
            duplicate: existingIndex >= 0,
            project: projectData
        };
    }

    loadProject(id) {
        const project = this.findProjectById(id);
        if (!project) {
            return { success: false, message: '项目不存在' };
        }

        const success = this.state.loadProject(project);
        return {
            success,
            project,
            projectName: project.name
        };
    }

    deleteProject(id) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);

        if (index < 0) {
            return { success: false, message: '项目不存在' };
        }

        projects.splice(index, 1);
        const success = this.saveProjects(projects);

        return {
            success,
            deletedCount: 1
        };
    }

    getProjectCount() {
        return this.getProjects().length;
    }

    clearAllProjects() {
        localStorage.removeItem(this.storageKey);
        return true;
    }

    validateProjectData(project) {
        if (!project || typeof project !== 'object') return false;
        if (!Array.isArray(project.paths)) return false;
        if (typeof project.canvasWidth !== 'number' || typeof project.canvasHeight !== 'number') return false;
        return true;
    }

    exportProjectData(projectName) {
        const project = this.state.getProjectData(projectName);
        return JSON.stringify(project, null, 2);
    }

    importProjectData(jsonString) {
        try {
            const projectData = JSON.parse(jsonString);
            if (!this.validateProjectData(projectData)) {
                return { success: false, message: '无效的项目数据格式' };
            }
            const success = this.state.loadProject(projectData);
            return {
                success,
                project: projectData,
                projectName: projectData.name
            };
        } catch (e) {
            console.error('Failed to import project data:', e);
            return { success: false, message: 'JSON 解析失败' };
        }
    }
}
