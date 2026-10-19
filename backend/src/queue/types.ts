export type JobPriority = 'high' | 'normal' | 'low';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'dead';

export interface IJobData {
  [key: string]: any;
}

export interface IJob<T = IJobData> {
  id: string;
  name: string;
  data: T;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  timeoutMs: number;
  lockedAt?: number;
  lockedBy?: string;
  progress: number;
  error?: string;
  result?: any;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  metadata?: Record<string, any>;
}

export type JobHandler<T = IJobData, R = any> = (
  job: IJob<T>,
  updateProgress: (percent: number) => Promise<void>
) => Promise<R>;

export interface IQueueMetrics {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  dead: number;
  avgDurationMs: number;
}
