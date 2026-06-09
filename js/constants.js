// 应用范围内复用的常量集合，集中管理便于后续扩展与统一文案。

// 针法类型 -> 中文名称
export const STITCH_TYPE_NAMES = {
    running: '平针',
    backstitch: '回针',
    satin: '缎面针',
    frenchKnot: '结粒针'
};

// 工具 -> 鼠标光标样式
export const CURSOR_MAP = {
    running: 'crosshair',
    backstitch: 'crosshair',
    satin: 'crosshair',
    frenchKnot: 'crosshair',
    select: 'pointer',
    eraser: 'not-allowed'
};

// 步骤说明中针法描述
export const STITCH_DESCRIPTIONS = {
    frenchKnot: '结粒针：用于点缀细节，如眼睛、花蕊等。将线绕针2-3圈，插入布中拉紧形成小结。',
    running: '平针：用于轮廓和简单线条。针脚均匀，一上一下穿过布料。',
    backstitch: '回针：用于精细轮廓和线条。每针回退半针，形成连续的线条。',
    satin: '缎面针：用于填充大面积区域。针脚紧密平行，形成光滑的缎面效果。'
};

// 步骤说明中针法描述的固定输出顺序
export const STITCH_DRAW_ORDER = ['frenchKnot', 'running', 'backstitch', 'satin'];

// 选择 / 橡皮擦命中阈值（像素）
export const SELECT_THRESHOLD = 15;

// 撤销栈最大长度
export const MAX_UNDO_STEPS = 50;

// localStorage 中的方案存储键
export const STORAGE_KEY = 'embroideryProjects';

// 像素 -> 厘米换算所用 DPI
export const DPI = 96;

// 一根绣线长度（厘米），用于估算用线根数
export const SKEIN_LENGTH_CM = 800;

// 用线损耗系数
export const WASTE_FACTOR = 1.3;

// 画布默认尺寸与显示参数
export const DEFAULT_STATE = {
    canvasWidth: 800,
    canvasHeight: 600,
    gridSize: 20,
    zoom: 1,
    snapToGrid: true,
    showGrid: true,
    bgOpacity: 0.3
};

// 默认绣线设置
export const DEFAULT_THREAD = {
    number: 'DMC 666',
    color: '#ff0000',
    strands: 2,
    note: ''
};
