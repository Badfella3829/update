# Rate Limiting Update: Add Monthly Limits for Free Users

## Overview
Add monthly limits to the existing daily limits and cooldown system for free users to prevent abuse and cost increase.

## Steps
- [x] Update js/credits.js: Add monthly_limit_free and monthly_limit_premium to loadRateLimits and modify checkUsageLimit to enforce monthly limits.
- [x] Update public/admin.html: Add input fields for monthly limits in the rate limiting configuration section.
- [x] Update js/admin.js: Modify the admin script to load and save monthly limit settings.
- [x] Test the implementation: Run tests to ensure daily and monthly limits work correctly.
- [x] Update TODO-Rate-Limiting.md: Mark the new features as completed.
