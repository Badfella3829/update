# Referral / Invite System Implementation

## Core Features
- [x] Generate unique referral codes for each user
- [x] Modify signup flow to accept referral codes (URL params or form input)
- [x] Track referrals in Firestore (referrer, referred users, rewards)
- [x] Reward referrers with credits (miles) upon successful referral
- [x] Grant limited premium access to free users who make referrals

## File Updates
- [x] public/signup.html: Add referral code handling
- [x] js/credits.js: Add referral reward and limited premium logic
- [x] js/auth-signup.js: Process referral during signup
- [x] firestore.rules: Allow referral data access
- [x] public/dashboard.html: Add referral UI

## Followup Steps
- [x] Test referral flow end-to-end
- [x] Add notifications for rewards (in-app notification created when credits are awarded)
- [x] Update analytics for referral tracking
