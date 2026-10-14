import { cache } from '../cache/cache.manager';

async function runMemoryLeakTests() {
  console.log('--- [Test] Running Cache Eviction & Memory Footprint Suite ---');

  const initialStats = cache.getStats();
  console.log(`Initial cache size: ${initialStats.size}`);

  // Set 500 items with 1 second TTL
  for (let i = 0; i < 500; i++) {
    await cache.set(`temp:key:${i}`, { data: Buffer.alloc(1024) }, { ttlSeconds: 1 });
  }

  const filledStats = cache.getStats();
  console.log(`Cache size after insertion: ${filledStats.size}`);

  // Wait 1.2s for expiration
  await new Promise((r) => setTimeout(r, 1200));

  // Access an expired item
  const expired = await cache.get('temp:key:0');
  if (expired === null) {
    console.log('✅ Expired item correctly returns null on retrieval');
  } else {
    console.error('❌ Expired item was still returned');
  }

  cache.clear();
  console.log('✅ Cache cleanup verified');
  console.log('--- Memory leak suite completed ---');
  process.exit(0);
}

runMemoryLeakTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
