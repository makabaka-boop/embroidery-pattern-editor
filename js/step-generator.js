import { STITCH_TYPE_NAMES, STITCH_ORDER, STITCH_DESCRIPTIONS } from './constants.js';

export class StepGenerator {
    constructor(state) {
        this.state = state;
    }

    _groupPathsByThread(paths) {
        const groups = new Map();
        paths.forEach((path, index) => {
            if (!path || path.length === 0) return;
            const key = `${path[0].number}-${path[0].color}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push({ path, index });
        });
        return groups;
    }

    generate() {
        const steps = [];
        const { paths } = this.state;
        const threadGroups = this._groupPathsByThread(paths);

        steps.push({
            title: '准备工作',
            text: '准备绣布、绣线、绣针等工具。将绣布固定在绣绷上，确保布料平整。根据设计图案规划刺绣顺序。'
        });

        threadGroups.forEach((items) => {
            const first = items[0].path[0];
            const typeCounts = {};
            items.forEach(({ path }) => {
                const type = path[0].type;
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });

            const typeDesc = Object.entries(typeCounts)
                .map(([type, count]) => `${count}处${STITCH_TYPE_NAMES[type]}`)
                .join('、');

            steps.push({
                title: `使用 ${first.number} 绣线`,
                text: `取出${first.number}号绣线（${first.color}），使用${first.strands}股线进行刺绣。在图案上完成${typeDesc}。${first.note ? `注意：${first.note}` : ''}`
            });
        });

        const usedTypes = new Set();
        paths.forEach(path => {
            if (path && path.length > 0) {
                usedTypes.add(path[0].type);
            }
        });

        if (usedTypes.size > 0) {
            steps.push({
                title: '针法说明',
                text: Array.from(usedTypes)
                    .sort((a, b) => STITCH_ORDER.indexOf(a) - STITCH_ORDER.indexOf(b))
                    .map(type => STITCH_DESCRIPTIONS[type])
                    .filter(Boolean)
                    .join(' ')
            });
        }

        steps.push({
            title: '后续处理',
            text: '刺绣完成后，小心取下绣绷。检查是否有松动的线头，修剪多余线头。可根据需要进行熨烫或装裱。'
        });

        return steps;
    }

    renderToHTML(steps) {
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
}
