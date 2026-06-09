// 撤销/重做历史管理：基于 paths 序列化快照实现，独立于 UI。
import { MAX_UNDO_STEPS } from './constants.js';

export class HistoryManager {
    /**
     * @param {EditorState} state
     */
    constructor(state) {
        this.state = state;
        this.undoStack = [];
        this.redoStack = [];
        // 历史变化时由外部更新撤销/重做按钮等 UI
        this.onChange = null;
    }

    /**
     * 在变更 paths 之前调用，记录当前快照并清空重做栈。
     */
    saveState() {
        this.undoStack.push(JSON.stringify(this.state.paths));
        if (this.undoStack.length > MAX_UNDO_STEPS) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.notify();
    }

    /**
     * 撤销一次。
     * @returns {boolean} 是否实际执行
     */
    undo() {
        if (this.undoStack.length === 0) return false;
        this.redoStack.push(JSON.stringify(this.state.paths));
        this.state.paths = JSON.parse(this.undoStack.pop());
        this.state.clearSelection();
        this.notify();
        return true;
    }

    /**
     * 重做一次。
     * @returns {boolean} 是否实际执行
     */
    redo() {
        if (this.redoStack.length === 0) return false;
        this.undoStack.push(JSON.stringify(this.state.paths));
        this.state.paths = JSON.parse(this.redoStack.pop());
        this.state.clearSelection();
        this.notify();
        return true;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    notify() {
        if (typeof this.onChange === 'function') {
            this.onChange(this);
        }
    }
}
