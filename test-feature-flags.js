// Test script for feature flags functionality
import { isFeatureEnabled, loadFeatureFlags, clearFeatureFlagsCache } from './js/feature-flags.js';

// Mock Firestore for testing
const mockFlags = {
  login: true,
  signup: false,
  signup_beta_users: ['user123', 'user456'],
  payments: true,
  ai_chat: false,
  ai_chat_beta_users: ['admin789']
};

// Test cases
async function runTests() {
  console.log('🧪 Testing Feature Flags Implementation...\n');

  // Test 1: Globally enabled feature
  console.log('Test 1: Globally enabled feature (login)');
  const loginEnabled = await isFeatureEnabled('login');
  console.log(`Login enabled: ${loginEnabled} (expected: true)`);
  console.log(loginEnabled === true ? '✅ PASS' : '❌ FAIL');

  // Test 2: Globally disabled feature, user not in beta
  console.log('\nTest 2: Globally disabled feature, user not in beta (signup, user999)');
  const signupEnabledUser999 = await isFeatureEnabled('signup', 'user999');
  console.log(`Signup enabled for user999: ${signupEnabledUser999} (expected: false)`);
  console.log(signupEnabledUser999 === false ? '✅ PASS' : '❌ FAIL');

  // Test 3: Globally disabled feature, user in beta
  console.log('\nTest 3: Globally disabled feature, user in beta (signup, user123)');
  const signupEnabledUser123 = await isFeatureEnabled('signup', 'user123');
  console.log(`Signup enabled for user123: ${signupEnabledUser123} (expected: true)`);
  console.log(signupEnabledUser123 === true ? '✅ PASS' : '❌ FAIL');

  // Test 4: Globally disabled feature, user in beta (ai_chat, admin789)
  console.log('\nTest 4: Globally disabled feature, user in beta (ai_chat, admin789)');
  const aiChatEnabledAdmin789 = await isFeatureEnabled('ai_chat', 'admin789');
  console.log(`AI Chat enabled for admin789: ${aiChatEnabledAdmin789} (expected: true)`);
  console.log(aiChatEnabledAdmin789 === true ? '✅ PASS' : '❌ FAIL');

  // Test 5: Cache clearing
  console.log('\nTest 5: Cache functionality');
  const flags1 = await loadFeatureFlags();
  console.log('Loaded flags first time');
  const flags2 = await loadFeatureFlags();
  console.log('Loaded flags second time (should use cache)');
  console.log(flags1 === flags2 ? '✅ Cache working' : '❌ Cache not working');

  clearFeatureFlagsCache();
  const flags3 = await loadFeatureFlags();
  console.log('Loaded flags after cache clear');
  console.log(flags1 !== flags3 ? '✅ Cache clearing working' : '❌ Cache clearing not working');

  console.log('\n🎉 Feature Flags Testing Complete!');
}

// Note: This test assumes Firestore is mocked. In real testing, you'd need to set up test data in Firestore.
runTests();
