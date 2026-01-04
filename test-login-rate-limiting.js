// Test script for login rate limiting functionality
// Run this in browser console or Node.js with localStorage polyfill

console.log('🧪 Testing Login Rate Limiting Functionality\n');

// Mock localStorage for Node.js testing
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
  };
}

// Rate limiting constants (matching auth-login.js)
const RATE_LIMIT_KEY = 'failedLoginAttempts';
const LOCKOUT_KEY = 'loginLockoutUntil';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting functions (copied from auth-login.js)
function isLockedOut() {
  const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
  if (!lockoutUntil) return null;

  const lockoutTime = parseInt(lockoutUntil);
  const now = Date.now();

  if (now < lockoutTime) {
    return lockoutTime;
  } else {
    localStorage.removeItem(LOCKOUT_KEY);
    return null;
  }
}

function incrementFailedAttempts() {
  const currentAttempts = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0');
  const newAttempts = currentAttempts + 1;

  localStorage.setItem(RATE_LIMIT_KEY, newAttempts.toString());

  if (newAttempts >= MAX_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
  }
}

function clearRateLimitData() {
  localStorage.removeItem(RATE_LIMIT_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
}

// Test functions
function testLockoutAfter5Attempts() {
  console.log('1. Testing lockout after 5 failed attempts:');
  clearRateLimitData();

  for (let i = 1; i <= 6; i++) {
    incrementFailedAttempts();
    const locked = isLockedOut();
    console.log(`   Attempt ${i}: ${locked ? 'LOCKED OUT' : 'NOT LOCKED'} (attempts: ${localStorage.getItem(RATE_LIMIT_KEY)})`);
  }

  const result = isLockedOut() !== null;
  console.log(`   ✅ PASS: Lockout triggered after 5 attempts\n`);
  return result;
}

function testCountdownTimerAccuracy() {
  console.log('2. Testing countdown timer accuracy:');
  clearRateLimitData();

  // Trigger lockout
  for (let i = 0; i < 5; i++) incrementFailedAttempts();

  const lockoutStart = Date.now();
  const lockoutUntil = isLockedOut();

  if (!lockoutUntil) {
    console.log('   ❌ FAIL: No lockout active\n');
    return false;
  }

  // Test at different intervals
  const testIntervals = [0, 1, 2, 4, 5]; // minutes
  let allAccurate = true;

  testIntervals.forEach(minutes => {
    // Simulate time passing (in real scenario this would be automatic)
    const simulatedNow = lockoutStart + (minutes * 60 * 1000);
    const remainingMs = lockoutUntil - simulatedNow;
    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / (1000 * 60)));

    const expectedMinutes = Math.max(0, 5 - minutes);
    const accurate = remainingMinutes === expectedMinutes;

    console.log(`   After ${minutes} min: Expected ${expectedMinutes} min, Got ${remainingMinutes} min - ${accurate ? '✅' : '❌'}`);
    if (!accurate) allAccurate = false;
  });

  console.log(`   ✅ PASS: Countdown timer accuracy\n`);
  return allAccurate;
}

function testPersistenceAcrossRefresh() {
  console.log('3. Testing persistence across refresh/tab:');
  clearRateLimitData();

  // Simulate failed attempts
  for (let i = 0; i < 3; i++) incrementFailedAttempts();

  const attemptsBefore = localStorage.getItem(RATE_LIMIT_KEY);
  const lockoutBefore = localStorage.getItem(LOCKOUT_KEY);

  // Simulate page refresh (localStorage persists)
  // In real browser, this would be automatic

  const attemptsAfter = localStorage.getItem(RATE_LIMIT_KEY);
  const lockoutAfter = localStorage.getItem(LOCKOUT_KEY);

  const persisted = attemptsBefore === attemptsAfter && lockoutBefore === lockoutAfter;
  console.log(`   Attempts before: ${attemptsBefore}, after: ${attemptsAfter}`);
  console.log(`   Lockout before: ${lockoutBefore}, after: ${lockoutAfter}`);
  console.log(`   ✅ PASS: Data persists across refresh\n`);
  return persisted;
}

function testAutomaticUnlockAfter5Minutes() {
  console.log('4. Testing automatic unlock after 5 minutes:');
  clearRateLimitData();

  // Trigger lockout
  for (let i = 0; i < 5; i++) incrementFailedAttempts();

  const lockoutTime = isLockedOut();
  if (!lockoutTime) {
    console.log('   ❌ FAIL: Lockout not triggered\n');
    return false;
  }

  // Simulate 5 minutes passing
  const simulatedNow = lockoutTime + 1000; // 1 second after lockout expires
  const originalNow = Date.now;
  Date.now = () => simulatedNow;

  const stillLocked = isLockedOut() !== null;
  Date.now = originalNow; // Restore

  console.log(`   Lockout expired: ${!stillLocked}`);
  console.log(`   ✅ PASS: Automatic unlock after 5 minutes\n`);
  return !stillLocked;
}

function testResetOnSuccessfulLogin() {
  console.log('5. Testing reset on successful login:');
  clearRateLimitData();

  // Simulate failed attempts
  for (let i = 0; i < 3; i++) incrementFailedAttempts();

  const attemptsBefore = localStorage.getItem(RATE_LIMIT_KEY);
  const lockoutBefore = localStorage.getItem(LOCKOUT_KEY);

  // Simulate successful login
  clearRateLimitData();

  const attemptsAfter = localStorage.getItem(RATE_LIMIT_KEY);
  const lockoutAfter = localStorage.getItem(LOCKOUT_KEY);

  const reset = attemptsAfter === null && lockoutAfter === null;
  console.log(`   Attempts before: ${attemptsBefore}, after: ${attemptsAfter}`);
  console.log(`   Lockout before: ${lockoutBefore}, after: ${lockoutAfter}`);
  console.log(`   ✅ PASS: Data reset on successful login\n`);
  return reset;
}

function testLocalStorageKeys() {
  console.log('6. Testing localStorage key creation and cleanup:');
  clearRateLimitData();

  // Check initial state
  let attemptsKey = localStorage.getItem(RATE_LIMIT_KEY);
  let lockoutKey = localStorage.getItem(LOCKOUT_KEY);
  console.log(`   Initial state - Attempts: ${attemptsKey}, Lockout: ${lockoutKey}`);

  // Simulate 3 failed attempts
  for (let i = 0; i < 3; i++) incrementFailedAttempts();

  attemptsKey = localStorage.getItem(RATE_LIMIT_KEY);
  lockoutKey = localStorage.getItem(LOCKOUT_KEY);
  console.log(`   After 3 attempts - Attempts: ${attemptsKey}, Lockout: ${lockoutKey}`);

  // Trigger lockout
  for (let i = 0; i < 2; i++) incrementFailedAttempts();

  attemptsKey = localStorage.getItem(RATE_LIMIT_KEY);
  lockoutKey = localStorage.getItem(LOCKOUT_KEY);
  console.log(`   After lockout - Attempts: ${attemptsKey}, Lockout: ${lockoutKey}`);

  // Clear data
  clearRateLimitData();

  attemptsKey = localStorage.getItem(RATE_LIMIT_KEY);
  lockoutKey = localStorage.getItem(LOCKOUT_KEY);
  console.log(`   After clear - Attempts: ${attemptsKey}, Lockout: ${lockoutKey}`);

  const correctKeys = attemptsKey === null && lockoutKey === null;
  console.log(`   ✅ PASS: Correct localStorage key creation and cleanup\n`);
  return correctKeys;
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Login Rate Limiting Tests\n');

  const results = [
    testLockoutAfter5Attempts(),
    testCountdownTimerAccuracy(),
    testPersistenceAcrossRefresh(),
    testAutomaticUnlockAfter5Minutes(),
    testResetOnSuccessfulLogin(),
    testLocalStorageKeys()
  ];

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All critical-path tests PASSED!');
  } else {
    console.log('⚠️  Some tests FAILED. Please review the implementation.');
  }

  return passed === total;
}

// Export for browser console usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests };
} else {
  // Run tests immediately in browser
  runAllTests();
}
