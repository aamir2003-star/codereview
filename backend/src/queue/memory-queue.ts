import { EventEmitter } from 'events';
import crypto from 'crypto';
import { IJob, IJobData, IQueueMetrics, JobPriority, JobStatus } from './types';

export class MemoryQueue extends EventEmitter {
  private jobs: Map<string, IJob> = new Map();
  private processingLocks: Map<string, { workerId: string; expiresAt: number }> = new Map();
  private isPaused: boolean = false;
  private completedHistory: IJob[] = [];
  private readonly maxHistorySize: number = 2000;

  constructor(public readonly queueName: string) {
    super();
  }

  public async add<T extends IJobData>(
    name: string,
    data: T,
    options: {
      priority?: JobPriority;
      maxAttempts?: number;
      timeoutMs?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<IJob<T>> {
    const id = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const job: IJob<T> = {
      id,
      name,
      data,
      priority: options.priority || 'normal',
      status: 'queued',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      timeoutMs: options.timeoutMs || 30000,
      progress: 0,
      createdAt: Date.now(),
      metadata: options.metadata || {},
    };

    this.jobs.set(id, job as IJob);
    this.emit('job:added', job);
    return job;
  }

  public async acquireNextJob(workerId: string): Promise<IJob | null> {
    if (this.isPaused) return null;

    const priorityOrder: JobPriority[] = ['high', 'normal', 'low'];
    const now = Date.now();

    for (const priority of priorityOrder) {
      for (const [id, job] of this.jobs.entries()) {
        if (job.status === 'queued' && job.priority === priority) {
          const lock = this.processingLocks.get(id);
          if (!lock || lock.expiresAt < now) {
            this.processingLocks.set(id, {
              workerId,
              expiresAt: now + job.timeoutMs,
            });

            job.status = 'running';
            job.attempts += 1;
            job.startedAt = now;
            job.lockedBy = workerId;
            job.lockedAt = now;

            this.emit('job:started', job);
            return job;
          }
        }
      }
    }

    return null;
  }

  public async updateProgress(jobId: string, percent: number): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.progress = Math.max(0, Math.min(100, percent));
      this.emit('job:progress', { jobId, progress: job.progress });
    }
  }

  public async complete(jobId: string, result?: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.completedAt = Date.now();
    job.result = result;
    job.progress = 100;

    this.processingLocks.delete(jobId);
    this.jobs.delete(jobId);

    this.completedHistory.push(job);
    if (this.completedHistory.length > this.maxHistorySize) {
      this.completedHistory.shift();
    }

    this.emit('job:completed', job);
  }

  public async fail(jobId: string, error: Error | string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const errorMsg = error instanceof Error ? error.message : String(error);
    job.error = errorMsg;
    this.processingLocks.delete(jobId);

    if (job.attempts < job.maxAttempts) {
      job.status = 'queued';
      this.emit('job:retry', { job, error: errorMsg });
    } else {
      job.status = 'failed';
      job.completedAt = Date.now();
      this.jobs.delete(jobId);
      this.emit('job:failed', { job, error: errorMsg });
    }
  }

  public getMetrics(): IQueueMetrics {
    let queued = 0;
    let running = 0;

    for (const job of this.jobs.values()) {
      if (job.status === 'queued') queued++;
      else if (job.status === 'running') running++;
    }

    const durations = this.completedHistory.map((j) => (j.completedAt || 0) - (j.startedAt || 0));
    const avgDurationMs =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      queued,
      running,
      completed: this.completedHistory.length,
      failed: 0,
      dead: 0,
      avgDurationMs: Math.round(avgDurationMs),
    };
  }

  public pause(): void {
    this.isPaused = true;
    this.emit('queue:paused');
  }

  public resume(): void {
    this.isPaused = false;
    this.emit('queue:resumed');
  }
}
