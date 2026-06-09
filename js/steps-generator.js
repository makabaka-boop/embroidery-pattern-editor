// 步骤生成：根据当前路径数据组合成可读的刺绣指引步骤。
import {
    STITCH_TYPE_NAMES,
    STITCH_DESCRIPTIONS,
    STITCH_DRAW_ORDER
} from './constants.js';

/**
 * 根据 state.paths 生成结构化步骤数组。
 * @returns {{title: string, text: string}[]}
 */
export function generateSteps(state) {
    const steps = [];
    const threadGroups = new Map();

    // 按 线号-颜色 分组
    state.paths.forEach((path, index) => {
        if (path.length === 0) return;
        const head = path[0];
        const key = `${head.number}-${head.color}`;
        if (!threadGroups.has(key)) {
            threadGroups.set(key, []);
        }
        threadGroups.get(key).push({ path, index });
    });

    steps.push({
        title: '准备工作',
        text: '准备绣布、绣线、绣针等工具。将绣布固定在绣绷上，确保布料平整。根据设计图案规划刺绣顺序。'
    });

    threadGroups.forEach(items => {
        const firstPath = items[0].path[0];
        const typeCounts = {};
        items.forEach(({ path }) => {
            const type = path[0].type;
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const typeDesc = Object.entries(typeCounts)
            .map(([type, count]) => `${count}处${STITCH_TYPE_NAMES[type] || type}`)
            .join('、');

        steps.push({
            title: `使用 ${firstPath.number} 绣线`,
            text: `取出${firstPath.number}号绣线（${firstPath.color}），使用${firstPath.strands}股线进行刺绣。在图案上完成${typeDesc}。${firstPath.note ? `注意：${firstPath.note}` : ''}`
        });
    });

    // 按固定顺序输出已使用针法的说明
    const usedTypes = new Set();
    state.paths.forEach(path => {
        if (path.length > 0) usedTypes.add(path[0].type);
    });

    if (usedTypes.size > 0) {
        steps.push({
            title: '针法说明',
            text: Array.from(usedTypes)
                .sort((a, b) => STITCH_DRAW_ORDER.indexOf(a) - STITCH_DRAW_ORDER.indexOf(b))
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

/**
 * 将步骤渲染为 HTML 字符串，与原实现保持一致。
 */
export function renderStepsHTML(steps) {
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
