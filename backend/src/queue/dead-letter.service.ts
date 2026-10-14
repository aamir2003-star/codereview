import { IJob } from './types';
import { MemoryQueue } from './memory-queue';

export interface IDeadLetterRecord {
  id: string;
  originalJobId: string;
  queueName: string;
  jobName: string;
  payload: any;
  errorReason: string;
  attemptsMade: number;
  quarantinedAt: number;
  metadata?: Record<string, any>;
}

export class DeadLetterService {
  private deadLetters: Map<string, IDeadLetterRecord> = new Map();
  private maxDeadLetters: number = 1000;

  constructor(private readonly queue: MemoryQueue) {
    this.queue.on('job:failed', ({ job, error }: { job: IJob; error: string }) => {
      this.quarantine(job, error);
    });
  }

  public quarantine(job: IJob, reason: string): IDeadLetterRecord {
    const record: IDeadLetterRecord = {
      id: `dlq_${Date.now()}_${job.id}`,
      originalJobId: job.id,
      queueName: this.queue.queueName,
      jobName: job.name,
      payload: job.data,
      errorReason: reason,
      attemptsMade: job.attempts,
      quarantinedAt: Date.now(),
      metadata: {
        ...job.metadata,
        originQueue: this.queue,
      },
    };

    this.deadLetters.set(record.id, record);

    if (this.deadLetters.size > this.maxDeadLetters) {
      const oldestKey = this.deadLetters.keys().next().value;
      if (oldestKey) this.deadLetters.delete(oldestKey);
    }

    return record;
  }

  public async replay(deadLetterId: string): Promise<boolean> {
    const record = this.deadLetters.get(deadLetterId);
    if (!record) return false;

    await this.queue.add(record.jobName, record.payload, {
      priority: 'high',
      metadata: { replayedFrom: deadLetterId },
    });

    this.deadLetters.delete(deadLetterId);
    return true;
  }

  public listAll(): IDeadLetterRecord[] {
    return Array.from(this.deadLetters.values());
  }

  public clear(): void {
    this.deadLetters.clear();
  }
}
