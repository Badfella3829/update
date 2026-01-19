# TechVyro SaaS Platform

## Overview

TechVyro is a SaaS platform providing AI-powered tools with a freemium business model. The application offers AI chat, image generation, and various developer/design tools. It uses Firebase for authentication, database, and cloud functions, with Razorpay for payments and SendGrid for transactional emails.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Static HTML/CSS/JavaScript**: No frontend framework - pure vanilla JS with ES6 modules
- **Page Structure**: Separate HTML pages for each feature (dashboard, login, signup, profile, admin, etc.)
- **CSS Organization**: Modular CSS files split by concern (main.css, dashboard.css, auth.css, premium.css, admin.css, ai.css)
- **JavaScript Modules**: ES6 modules loaded via `type="module"` script tags, importing from Firebase CDN

### Authentication System
- **Firebase Authentication**: Email/password auth with email verification enforcement
- **Mobile Number Support**: Converts mobile numbers to email format (@mobile.techvyro)
- **Rate Limiting**: Client-side rate limiting for login attempts (5 attempts, 15-minute lockout)
- **Session Management**: Uses Firebase auth state with localStorage for device trust
- **Protected Routes**: auth-check.js and auth-guard.js enforce authentication on protected pages

### User Plans & Credits
- **Plan Tiers**: free, pro, premium, admin
- **Credits System**: Users have credits (called "miles") that are consumed by AI tools
- **Rate Limiting**: Configurable daily/monthly limits for free users stored in Firestore
- **Referral System**: Users get unique referral codes; successful referrals reward credits

### Database (Firestore)
- **users collection**: User profiles, plans, credits, referral codes
- **referrals collection**: Tracks referrer/referred relationships
- **alerts collection**: User notifications
- **usage_logs collection**: Analytics and usage tracking
- **system collection**: Feature flags and rate limiting config

### Cloud Functions (Firebase Functions)
- **sendOtpIfUserExists**: Validates user existence before OTP
- **verifyPayment**: Server-side Razorpay payment verification
- **Email Functions**: Welcome, verification, upgrade, and password reset emails via SendGrid

### Feature Management
- **Feature Flags**: Stored in Firestore, cached client-side for 5 minutes
- **Beta Users**: Flags support beta_users arrays for gradual rollout
- **Admin Panel**: Web interface at admin.html for managing users, flags, and rate limits

### AI Backend (January 2026)
- **Express Server**: public/server.js serves static files + AI API endpoints
- **OpenAI Integration**: Uses Replit AI Integrations (no API key required, billed to credits)

#### AI API Endpoints:
FREE Tools:
- `/api/chat` - Streaming chat (SSE)
- `/api/chat-simple` - Non-streaming chat
- `/api/image-generate` - Image generation (gpt-image-1)
- `/api/logo-generate` - Logo creation (gpt-image-1)

PREMIUM Tools (require X-User-Plan header):
- `/api/content-ai` - Blog/article generation
- `/api/code-ai` - Code generation/debugging
- `/api/email-ai` - Email generation
- `/api/voice-ai/tts` - Text to Speech (gpt-audio-mini)
- `/api/resume-ai` - Professional resume generation
- `/api/data-ai` - Data analysis and insights

#### Security:
- Input validation, message length limits, history sanitization
- Premium endpoints require X-User-Plan header with valid premium plan
- Models: gpt-4o-mini (chat/text), gpt-image-1 (images), gpt-audio-mini (voice)

#### Frontend Pages:
- `public/chat.html` - Dedicated AI Chat page with streaming
- `public/dashboard.html` - All tool interfaces (Image, Logo, Voice, Content, Code, Email, Resume, Data AI)

### Error Handling
- **Centralized Handler**: error-handler.js provides user-friendly error messages
- **Retry Logic**: Network errors offer retry options
- **Logging**: logger.js tracks events, errors, and usage analytics to Firestore

## External Dependencies

### Firebase Services
- **Firebase Authentication**: User sign-up, login, email verification
- **Cloud Firestore**: Primary database for all application data
- **Firebase Functions**: Server-side logic and email sending
- **Firebase Hosting**: Static file hosting (configured in firebase.json)

### Payment Processing
- **Razorpay**: Payment gateway for plan upgrades (pro: ₹299, premium: ₹499)
- **Server-side Verification**: Payments verified via Firebase Function before plan upgrade

### Email Service
- **SendGrid**: Transactional emails for welcome, verification, upgrades, password reset
- **HTML Templates**: Located in functions/templates/ directory

### CDN Dependencies
- **Firebase JS SDK**: Loaded from gstatic.com CDN (version 10.7.1)
- **Google AdSense**: Ad integration on public pages

### Configuration Files
- **config.json**: AI model settings and feature flags
- **firebase.json**: Hosting and functions configuration
- **firestore.rules**: Security rules for database access