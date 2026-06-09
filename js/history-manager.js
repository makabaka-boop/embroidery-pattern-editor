import { MAX_UNDO_STEPS } from './constants.js';

export class HistoryManager {
    constructor(maxSteps = MAX_UNDO_STEPS) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSteps = maxSteps;
    }

    push(paths) {
        this.undoStack.push(JSON.stringify(paths));
        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo(paths) {
        if (this.undoStack.length === 0) return null;
        this.redoStack.push(JSON.stringify(paths));
        return JSON.parse(this.undoStack.pop());
    }

    redo(paths) {
        if (this.redoStack.length === 0) return null;
        this.undoStack.push(JSON.stringify(paths));
        return JSON.parse(this.redoStack.pop());
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }
}
