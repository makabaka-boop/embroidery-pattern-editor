/**
 * 步骤生成器 - 生成刺绣步骤说明
 * 根据路径数据生成结构化的刺绣步骤指南
 */
class StepsGenerator {
    constructor(stateManager) {
        this.state = stateManager;

        this.stitchTypeNames = {
            running: '平针',
            backstitch: '回针',
            satin: '缎面针',
            frenchKnot: '结粒针'
        };

        this.stitchOrder = ['frenchKnot', 'running', 'backstitch', 'satin'];

        this.stitchDescriptions = {
            frenchKnot: '结粒针：用于点缀细节，如眼睛、花蕊等。将线绕针2-3圈，插入布中拉紧形成小结。',
            running: '平针：用于轮廓和简单线条。针脚均匀，一上一下穿过布料。',
            backstitch: '回针：用于精细轮廓和线条。每针回退半针，形成连续的线条。',
            satin: '缎面针：用于填充大面积区域。针脚紧密平行，形成光滑的缎面效果。'
        };
    }

    generateSteps() {
        const steps = [];
        const threadGroups = this.groupPathsByThread();

        steps.push({
            title: '准备工作',
            text: '准备绣布、绣线、绣针等工具。将绣布固定在绣绷上，确保布料平整。根据设计图案规划刺绣顺序。'
        });

        threadGroups.forEach((paths, key) => {
            const firstPath = paths[0].path[0];
            const typeCounts = this.countStitchTypes(paths);
            const typeDesc = this.formatTypeDescription(typeCounts);

            steps.push({
                title: `使用 ${firstPath.number} 绣线`,
                text: `取出${firstPath.number}号绣线（${firstPath.color}），使用${firstPath.strands}股线进行刺绣。在图案上完成${typeDesc}。${firstPath.note ? `注意：${firstPath.note}` : ''}`
            });
        });

        const usedTypes = this.getUsedStitchTypes();
        if (usedTypes.size > 0) {
            steps.push({
                title: '针法说明',
                text: this.generateStitchDescription(usedTypes)
            });
        }

        steps.push({
            title: '后续处理',
            text: '刺绣完成后，小心取下绣绷。检查是否有松动的线头，修剪多余线头。可根据需要进行熨烫或装裱。'
        });

        return steps;
    }

    groupPathsByThread() {
        const threadGroups = new Map();

        this.state.paths.forEach((path, index) => {
            if (path.length === 0) return;
            const key = `${path[0].number}-${path[0].color}`;
            if (!threadGroups.has(key)) {
                threadGroups.set(key, []);
            }
            threadGroups.get(key).push({ path, index });
        });

        return threadGroups;
    }

    countStitchTypes(paths) {
        const typeCounts = {};
        paths.forEach(({ path }) => {
            const type = path[0].type;
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        return typeCounts;
    }

    formatTypeDescription(typeCounts) {
        return Object.entries(typeCounts)
            .map(([type, count]) => `${count}处${this.getStitchTypeName(type)}`)
            .join('、');
    }

    getUsedStitchTypes() {
        const usedTypes = new Set();
        this.state.paths.forEach(path => {
            if (path.length > 0) {
                usedTypes.add(path[0].type);
            }
        });
        return usedTypes;
    }

    generateStitchDescription(usedTypes) {
        return Array.from(usedTypes)
            .sort((a, b) => this.stitchOrder.indexOf(a) - this.stitchOrder.indexOf(b))
            .map(type => this.stitchDescriptions[type])
            .join(' ');
    }

    getStitchTypeName(type) {
        return this.stitchTypeNames[type] || type;
    }

    generateHTML() {
        const steps = this.generateSteps();
        return `
            <div class="steps-content">
                ${steps.map((step, i) => `
                    <div class="step-item">
                        <div class="step-number">步骤 ${i + 1}：${step.title}</div>
                        <div class="step-text">${step.text}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generatePlainText() {
        const steps = this.generateSteps();
        return steps.map((step, i) => {
            return `步骤 ${i + 1}：${step.title}\n${step.text}`;
        }).join('\n\n');
    }

    copyToClipboard() {
        const content = this.generatePlainText();
        return navigator.clipboard.writeText(content).then(() => true);
    }
}
