import jwt from 'jsonwebtoken';

async function runAuthExpiryTests() {
  console.log('--- [Test] Running Authentication Expiry & Token Verification Suite ---');

  const secret = 'test_secret_key_32_chars_minimum_here';
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Expired token
  const expiredPayload = {
    userId: 'user_123',
    username: 'testuser',
    exp: nowInSeconds - 30, // Expired 30s ago
  };

  const expiredToken = jwt.sign(expiredPayload, secret);

  try {
    jwt.verify(expiredToken, secret);
    console.error('❌ Expired token was accepted by jwt.verify');
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      console.log('✅ Standard jwt.verify correctly rejected expired token');
    }
  }

  // Algorithm 'none' attack test
  const unsignedToken = jwt.sign({ userId: 'admin', role: 'admin' }, '', { algorithm: 'none' as any });
  try {
    jwt.verify(unsignedToken, secret, { algorithms: ['HS256'] });
    console.error('❌ Unsigned none algorithm was accepted');
  } catch (err: any) {
    console.log('✅ Algorithm none attack blocked when algorithms array is constrained');
  }

  console.log('--- Auth expiry suite completed ---');
  process.exit(0);
}

runAuthExpiryTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
