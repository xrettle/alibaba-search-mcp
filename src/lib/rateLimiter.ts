type Task<T> = () => Promise<T>;

export class ConcurrencyQueue {
  private activeCount = 0;
  private queue: Array<{
    task: Task<any>;
    resolve: (value: any) => void;
    reject: (err: any) => void;
  }> = [];
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 2) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Enqueues a task and executes it when concurrency slot becomes available.
   */
  async run<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.next();
    });
  }

  private next() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

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

// Global queue singleton
const maxConcurrency = parseInt(process.env.MAX_CONCURRENCY || "2", 10);
export const globalQueue = new ConcurrencyQueue(maxConcurrency);
