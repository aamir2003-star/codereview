import { MemoryQueue } from './memory-queue';
import { IJobData, JobPriority } from './types';

interface IScheduledTask {
  id: string;
  name: string;
  intervalMs: number;
  data: IJobData;
  priority: JobPriority;
  timer: NodeJS.Timeout;
}

export class TaskScheduler {
  private tasks: Map<string, IScheduledTask> = new Map();

  constructor(private readonly queue: MemoryQueue) {}

  public scheduleInterval(
    id: string,
    name: string,
    intervalMs: number,
    data: IJobData = {},
    priority: JobPriority = 'normal'
  ): void {
    this.cancel(id);

    const timer = setInterval(async () => {
      try {
        await this.queue.add(name, data, { priority });
      } catch (err) {
        console.error(`[Scheduler] Failed to trigger task ${id}:`, err);
      }
    }, intervalMs);

    this.tasks.set(id, { id, name, intervalMs, data, priority, timer });
  }

  public scheduleOnce(
    id: string,
    name: string,
    delayMs: number,
    data: IJobData = {},
    priority: JobPriority = 'normal'
  ): void {
    const timer = setTimeout(async () => {
      try {
        await this.queue.add(name, data, { priority });
      } finally {
        this.tasks.delete(id);
      }
    }, delayMs);

    this.tasks.set(id, { id, name, intervalMs: delayMs, data, priority, timer });
  }

  public cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (task) {
      clearInterval(task.timer);
      clearTimeout(task.timer);
      this.tasks.delete(id);
      return true;
    }
    return false;
  }

  public getScheduledTaskIds(): string[] {
    return Array.from(this.tasks.keys());
  }

  public stopAll(): void {
    for (const task of this.tasks.values()) {
      clearInterval(task.timer);
      clearTimeout(task.timer);
    }
    this.tasks.clear();
  }
}
