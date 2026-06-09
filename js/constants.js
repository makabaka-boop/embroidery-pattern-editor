export const STITCH_TYPE_NAMES = {
    running: '平针',
    backstitch: '回针',
    satin: '缎面针',
    frenchKnot: '结粒针'
};

export const STITCH_ORDER = ['frenchKnot', 'running', 'backstitch', 'satin'];

export const STITCH_DESCRIPTIONS = {
    frenchKnot: '结粒针：用于点缀细节，如眼睛、花蕊等。将线绕针2-3圈，插入布中拉紧形成小结。',
    running: '平针：用于轮廓和简单线条。针脚均匀，一上一下穿过布料。',
    backstitch: '回针：用于精细轮廓和线条。每针回退半针，形成连续的线条。',
    satin: '缎面针：用于填充大面积区域。针脚紧密平行，形成光滑的缎面效果。'
};

export const CURSOR_MAP = {
    running: 'crosshair',
    backstitch: 'crosshair',
    satin: 'crosshair',
    frenchKnot: 'crosshair',
    select: 'pointer',
    eraser: 'not-allowed'
};

export const DEFAULT_CANVAS_WIDTH = 800;
export const DEFAULT_CANVAS_HEIGHT = 600;
export const DEFAULT_GRID_SIZE = 20;
export const DEFAULT_ZOOM = 1;
export const DEFAULT_SNAP_TO_GRID = true;
export const DEFAULT_SHOW_GRID = true;
export const DEFAULT_BG_OPACITY = 0.3;
export const MAX_UNDO_STEPS = 50;
export const SELECTION_THRESHOLD = 15;
export const SKEIN_LENGTH_CM = 800;
export const WASTE_FACTOR = 1.3;
export const DPI = 96;
export const STORAGE_KEY = 'embroideryProjects';
