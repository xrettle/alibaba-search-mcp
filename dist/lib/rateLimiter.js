"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalQueue = exports.ConcurrencyQueue = void 0;
class ConcurrencyQueue {
    activeCount = 0;
    queue = [];
    maxConcurrency;
    constructor(maxConcurrency = 2) {
        this.maxConcurrency = maxConcurrency;
    }
    /**
     * Enqueues a task and executes it when concurrency slot becomes available.
     */
    async run(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.next();
        });
    }
    next() {
        if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
            return;
        }
        const item = this.queue.shift();
        if (!item)
            return;
        this.activeCount++;
        console.log(`[Queue] Running task. Active: ${this.activeCount}/${this.maxConcurrency}, Queued: ${this.queue.length}`);
        item
            .task()
            .then((res) => {
            item.resolve(res);
        })
            .catch((err) => {
            item.reject(err);
        })
            .finally(() => {
            this.activeCount--;
            console.log(`[Queue] Task finished. Active: ${this.activeCount}/${this.maxConcurrency}`);
            this.next();
        });
    }
}
exports.ConcurrencyQueue = ConcurrencyQueue;
// Global queue singleton
const maxConcurrency = parseInt(process.env.MAX_CONCURRENCY || "2", 10);
exports.globalQueue = new ConcurrencyQueue(maxConcurrency);
