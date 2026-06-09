import { STITCH_TYPE_NAMES, STITCH_ORDER, STITCH_DESCRIPTIONS } from './constants.js';

export class StepGenerator {
    generate(paths, gridSize) {
        const steps = [];
        const threadGroups = this._groupByThread(paths);

        steps.push({
            title: '准备工作',
            text: '准备绣布、绣线、绣针等工具。将绣布固定在绣绷上，确保布料平整。根据设计图案规划刺绣顺序。'
        });

        threadGroups.forEach((groupPaths) => {
            const firstPath = groupPaths[0];
            if (!firstPath || firstPath.length === 0) return;

            const firstPoint = firstPath[0];
            const typeCounts = this._countStitchTypes(groupPaths);
            const typeDesc = Object.entries(typeCounts)
                .map(([type, count]) => `${count}处${STITCH_TYPE_NAMES[type]}`)
                .join('、');

            steps.push({
                title: `使用 ${firstPoint.number} 绣线`,
                text: `取出${firstPoint.number}号绣线（${firstPoint.color}），使用${firstPoint.strands}股线进行刺绣。在图案上完成${typeDesc}。${firstPoint.note ? `注意：${firstPoint.note}` : ''}`
            });
        });

        const stitchInfoStep = this._buildStitchInfoStep(paths);
        if (stitchInfoStep) {
            steps.push(stitchInfoStep);
        }

        steps.push({
            title: '后续处理',
            text: '刺绣完成后，小心取下绣绷。检查是否有松动的线头，修剪多余线头。可根据需要进行熨烫或装裱。'
        });

        return steps;
    }

    renderToHTML(steps) {
        return steps.map((step, i) => `
            <div class="step-item">
                <div class="step-number">步骤 ${i + 1}：${step.title}</div>
                <div class="step-text">${step.text}</div>
            </div>
        `).join('');
    }

    _groupByThread(paths) {
        const groups = new Map();
        paths.forEach(path => {
            if (path.length === 0) return;
            const key = `${path[0].number}-${path[0].color}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(path);
        });
        return groups;
    }

    _countStitchTypes(paths) {
        const counts = {};
        paths.forEach(path => {
            if (path.length === 0) return;
            const type = path[0].type;
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }

    _buildStitchInfoStep(paths) {
        const usedTypes = new Set();
        paths.forEach(path => {
            if (path.length > 0) {
                usedTypes.add(path[0].type);
            }
        });

        if (usedTypes.size === 0) return null;

        const descriptions = Array.from(usedTypes)
            .sort((a, b) => STITCH_ORDER.indexOf(a) - STITCH_ORDER.indexOf(b))
            .map(type => STITCH_DESCRIPTIONS[type])
            .join(' ');

        return {
            title: '针法说明',
            text: descriptions
        };
    }
}
