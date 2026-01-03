# Feature Kill Switch

## Task: Add feature on/off flags from Firestore for emergency disable

### Files to Update:
- [ ] js/feature-flags.js: Create feature flag loader from Firestore
- [ ] js/auth-login.js: Check login feature flag
- [ ] js/auth-signup.js: Check signup feature flag
- [ ] js/auth-forgot.js: Check password reset feature flag
- [ ] js/payments.js: Check payment feature flag

### Changes Needed:
1. Create feature-flags.js to load flags from Firestore "feature_flags" collection
2. Add flag checks in auth and payment functions
3. Show appropriate error messages when features are disabled

### Status: In Progress
