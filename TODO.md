# Duplicate / Abuse Protection

## Tasks
- [x] Add email verification for signup
- [x] Implement usage limits for free plan
- [x] Detect and prevent repeated actions by same user
- [x] Add rate limiting for repeated actions (30 seconds between actions)
- [x] Add resend email verification feature
- [x] Update AI pages to use server-side limits

## Details
- Require email verification before account activation
- Track usage in Firestore (e.g., daily limits on AI generations)
- Prevent abuse by monitoring user actions
- Rate limit: No more than one action per 30 seconds
- Allow resending email verification
- Replaced localStorage limits with Firestore-based limits for better security

# Monitoring & Visibility

## Tasks
- [x] Basic logs (signup, login, upgrade)
- [x] Error tracking (even simple console capture)

## Details
- Comprehensive logging system with Firestore storage
- Auth events: signup attempts/success, login attempts/success, verification emails
- Payment events: upgrade attempts, payment success/failure, plan changes
- Error tracking: unhandled errors, network issues, payment failures
- User actions and performance metrics
- Automatic error boundary and network status monitoring
