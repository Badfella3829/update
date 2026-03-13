// Test script for feature flags core logic (Node-compatible)
import {
  createFeatureFlagsCache,
  resolveFeatureEnabled
} from './js/feature-flags-core.js';

const mockFlags = {
  login: true,
  signup: false,
  signup_beta_users: ['user123', 'user456'],
  payments: true,
  ai_chat: false,
  ai_chat_beta_users: ['admin789']
};

function runTests() {
  console.log('🧪 Testing Feature Flags Implementation...\n');

  console.log('Test 1: Globally enabled feature (login)');
  const loginEnabled = resolveFeatureEnabled(mockFlags, 'login');
  console.log(loginEnabled === true ? '✅ PASS' : '❌ FAIL');

  console.log('\nTest 2: Globally disabled feature, user not in beta (signup, user999)');
  const signupEnabledUser999 = resolveFeatureEnabled(mockFlags, 'signup', 'user999');
  console.log(signupEnabledUser999 === false ? '✅ PASS' : '❌ FAIL');

  console.log('\nTest 3: Globally disabled feature, user in beta (signup, user123)');
  const signupEnabledUser123 = resolveFeatureEnabled(mockFlags, 'signup', 'user123');
  console.log(signupEnabledUser123 === true ? '✅ PASS' : '❌ FAIL');

  console.log('\nTest 4: Globally disabled feature, user in beta (ai_chat, admin789)');
  const aiChatEnabledAdmin789 = resolveFeatureEnabled(mockFlags, 'ai_chat', 'admin789');
  console.log(aiChatEnabledAdmin789 === true ? '✅ PASS' : '❌ FAIL');

  console.log('\nTest 5: Cache functionality');
  const cache = createFeatureFlagsCache(10_000);
  const flags1 = cache.set(mockFlags, 1000);
  const flags2 = cache.get(2000);
  console.log(flags1 === flags2 ? '✅ Cache working' : '❌ Cache not working');

  cache.clear();
  const flags3 = cache.get(3000);
  console.log(flags3 === null ? '✅ Cache clearing working' : '❌ Cache clearing not working');

  console.log('\n🎉 Feature Flags Testing Complete!');
}

runTests();
