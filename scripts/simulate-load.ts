import { MemoryQueue } from '../backend/src/queue/memory-queue';
import { JobWorker } from '../backend/src/queue/job-worker';

async function runLoadSimulation() {
  console.log('🚀 [Load Simulator] Starting 100 concurrent simulated review requests...');

  const queue = new MemoryQueue('load-test-reviews');
  let completed = 0;
  let failed = 0;

  const worker = new JobWorker(
    'load-worker-1',
    queue,
    async (job, updateProgress) => {
      await updateProgress(25);
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 20));
      await updateProgress(75);
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 20));
      return { status: 'success', jobId: job.id };
    },
    5 // 5 concurrent jobs
  );

  worker.start();

  const startTime = Date.now();

  const jobPromises = Array.from({ length: 100 }, (_, i) =>
    queue.add(
      `review-pr-${i + 1}`,
      { prNumber: i + 1, repo: 'test/repo' },
      { priority: i % 10 === 0 ? 'high' : 'normal' }
    )
  );

  await Promise.all(jobPromises);
  console.log('📦 100 jobs enqueued successfully. Monitoring worker throughput...');

  queue.on('job:completed', () => {
    completed++;
    if (completed % 25 === 0) {
      console.log(`⚡ Throughput: ${completed}/100 jobs processed...`);
    }
  });

  queue.on('job:failed', () => {
    failed++;
  });

  while (completed + failed < 100 && Date.now() - startTime < 15000) {
    await new Promise((r) => setTimeout(r, 100));
  }

  await worker.stop();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n🏁 Simulation complete in ${duration}s!`);
  console.log(` - Completed: ${completed}`);
  console.log(` - Failed: ${failed}`);
  console.log(` - Average throughput: ${(completed / parseFloat(duration)).toFixed(1)} jobs/sec`);
}

runLoadSimulation().catch(console.error);
