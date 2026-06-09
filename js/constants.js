export const STITCH_TYPES = {
    RUNNING: 'running',
    BACKSTITCH: 'backstitch',
    SATIN: 'satin',
    FRENCH_KNOT: 'frenchKnot',
    SELECT: 'select',
    ERASER: 'eraser'
};

export const STITCH_TYPE_NAMES = {
    running: '平针',
    backstitch: '回针',
    satin: '缎面针',
    frenchKnot: '结粒针'
};

export const TOOL_CURSORS = {
    running: 'crosshair',
    backstitch: 'crosshair',
    satin: 'crosshair',
    frenchKnot: 'crosshair',
    select: 'pointer',
    eraser: 'not-allowed'
};

export const DEFAULT_CANVAS = {
    WIDTH: 800,
    HEIGHT: 600,
    GRID_SIZE: 20,
    ZOOM: 1,
    SNAP_TO_GRID: true,
    SHOW_GRID: true,
    BG_OPACITY: 0.3
};

export const DEFAULT_THREAD = {
    number: 'DMC 666',
    color: '#ff0000',
    strands: 2,
    note: ''
};

export const UNDO = {
    MAX_STEPS: 50
};

export const STORAGE_KEYS = {
    PROJECTS: 'embroideryProjects'
};

export const EXPORT = {
    DPI: 96,
    CM_PER_INCH: 2.54,
    SKEIN_LENGTH_CM: 800,
    WASTE_FACTOR: 1.3,
    SELECTION_THRESHOLD: 15,
    HIT_TEST_THRESHOLD: 15
};

export const STITCH_ORDER = ['frenchKnot', 'running', 'backstitch', 'satin'];

export const STITCH_DESCRIPTIONS = {
    frenchKnot: '结粒针：用于点缀细节，如眼睛、花蕊等。将线绕针2-3圈，插入布中拉紧形成小结。',
    running: '平针：用于轮廓和简单线条。针脚均匀，一上一下穿过布料。',
    backstitch: '回针：用于精细轮廓和线条。每针回退半针，形成连续的线条。',
    satin: '缎面针：用于填充大面积区域。针脚紧密平行，形成光滑的缎面效果。'
};
