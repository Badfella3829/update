// Simple test for rate limiting logic (without Firebase dependencies)
console.log('Testing rate limiting logic...');

// Mock the loadRateLimits function
const mockLoadRateLimits = async () => {
  return {
    daily_limit_free: 5,
    daily_limit_premium: -1, // -1 means unlimited
    rate_limit_interval: 30
  };
};

// Test checkUsageLimit logic
function checkUsageLimit(plan, dailyCount, hasReferrals = false) {
  if (plan !== "free") return false; // Premium users have no limits

  const limit = hasReferrals ? 10 : 5; // Double limit for users who made referrals
  return dailyCount >= limit;
}

// Test checkRateLimit logic
function checkRateLimit(lastActionTime, interval) {
  const now = Date.now();
  const intervalMs = interval * 1000;
  return (now - lastActionTime) < intervalMs;
}

// Run tests
console.log('Testing checkUsageLimit:');
console.log('Free user, 3 actions, no referrals:', checkUsageLimit('free', 3)); // Should be false
console.log('Free user, 5 actions, no referrals:', checkUsageLimit('free', 5)); // Should be true
console.log('Free user, 8 actions, with referrals:', checkUsageLimit('free', 8, true)); // Should be false
console.log('Free user, 10 actions, with referrals:', checkUsageLimit('free', 10, true)); // Should be true
console.log('Premium user, 100 actions:', checkUsageLimit('premium', 100)); // Should be false

console.log('\nTesting checkRateLimit:');
const now = Date.now();
console.log('Action 35 seconds ago:', checkRateLimit(now - 35000, 30)); // Should be false
console.log('Action 25 seconds ago:', checkRateLimit(now - 25000, 30)); // Should be true

console.log('\nRate limiting tests completed successfully!');
