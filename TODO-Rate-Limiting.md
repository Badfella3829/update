# Rate Limiting / Abuse Control Implementation Plan

## Overview
Implement configurable rate limiting for user actions to prevent abuse: free users limited to 5 actions/day, premium users unlimited. Make limits configurable via admin panel for flexibility.

## Steps
- [x] Update js/credits.js to load rate limits from Firestore config instead of hardcoded values
- [x] Add rate limiting configuration section to public/admin.html with inputs for daily limits and rate limit interval
- [x] Update admin script in admin.html to load and save rate limiting settings
- [x] Test rate limiting enforcement for free and premium users
- [x] Ensure premium users bypass all limits
