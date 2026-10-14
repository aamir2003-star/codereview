import { MemoryQueue } from '../queue/memory-queue';
import { JobWorker } from '../queue/job-worker';
import { StampedeLock } from '../cache/stampede-lock';

async function runConcurrencyTests() {
  console.log('--- [Test] Running Concurrency & Race Condition Suite ---');

  // Test 1: Stampede Mutex Lock
  const lock = new StampedeLock();
  let executionCount = 0;

  const results = await Promise.all([
    lock.fetchWithLock('item:123', async () => {
      await new Promise((r) => setTimeout(r, 50));
      executionCount++;
      return { data: 'test' };
    }),
    lock.fetchWithLock('item:123', async () => {
      await new Promise((r) => setTimeout(r, 50));
      executionCount++;
      return { data: 'test' };
    }),
    lock.fetchWithLock('item:123', async () => {
      await new Promise((r) => setTimeout(r, 50));
      executionCount++;
      return { data: 'test' };
    }),
  ]);

  console.log(`[StampedeLock] Executions: ${executionCount} (Expected: 1)`);
  if (executionCount === 1) {
    console.log('✅ Stampede lock coalesced 3 concurrent requests into 1 execution');
  } else {
    console.error('❌ Stampede lock failed to deduplicate requests');
  }

  // Test 2: Priority Queue Concurrency
  const queue = new MemoryQueue('test-concurrency');
  await queue.add('job-1', { index: 1 }, { priority: 'normal' });
  await queue.add('job-2', { index: 2 }, { priority: 'high' });
  await queue.add('job-3', { index: 3 }, { priority: 'low' });

  const firstJob = await queue.acquireNextJob('worker-1');
  console.log(`[Queue Priority] First job acquired: ${firstJob?.name} (Expected: job-2)`);
  if (firstJob?.name === 'job-2') {
    console.log('✅ High-priority job prioritized over earlier queued jobs');
  } else {
    console.error('❌ Priority ordering failed');
  }

  console.log('--- Concurrency suite completed ---');
  process.exit(0);
}

runConcurrencyTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
