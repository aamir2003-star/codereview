import { IJob, JobHandler } from './types';
import { MemoryQueue } from './memory-queue';

export class JobWorker {
  private isRunning: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeJobsCount: number = 0;

  constructor(
    public readonly workerId: string,
    public readonly queue: MemoryQueue,
    private readonly handler: JobHandler,
    public readonly concurrency: number = 3,
    private readonly pollIntervalMs: number = 250
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.pollInterval = setInterval(async () => {
      if (!this.isRunning) return;

      while (this.activeJobsCount < this.concurrency) {
        const job = await this.queue.acquireNextJob(this.workerId);
        if (!job) break;

        this.processJob(job);
      }
    }, this.pollIntervalMs);
  }

  private async processJob(job: IJob): Promise<void> {
    this.activeJobsCount++;

    const progressUpdater = async (percent: number) => {
      await this.queue.updateProgress(job.id, percent);
    };

    let timeoutTimer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(new Error(`Job ${job.id} timed out after ${job.timeoutMs}ms`));
      }, job.timeoutMs);
    });

    try {
      const handlerPromise = this.handler(job, progressUpdater);
      const result = await Promise.race([handlerPromise, timeoutPromise]);
      if (timeoutTimer) clearTimeout(timeoutTimer);

      await this.queue.complete(job.id, result);
    } catch (err: any) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      await this.queue.fail(job.id, err);
    } finally {
      this.activeJobsCount--;
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
