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

### Tool Page Authentication & Credits (January 2026)
- **Shared Module**: `public/js/auth-credits.js` provides unified auth, credit, and plan management
- **Auth Guard**: All 26 tool pages require login - redirects to login.html if not authenticated
- **Credit Sync**: Credits fetched from Firebase on page load, stored in localStorage as backup
- **Credit Deduction**: 5 credits deducted AFTER successful tool use (not before redirect)
- **Premium Check**: 6 premium tools (Voice, Content, Code, Email, Resume, Data AI) require pro/premium/admin plan
- **Usage Logging**: Tool usage logged to Firebase usage_logs collection
- **Loading Screen**: All tool pages show loading screen during auth initialization
- **Credit Badge**: Real-time credit display in header of each tool page

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
- `public/dashboard.html` - Main dashboard with tool cards that redirect to dedicated pages

**AI Tool Pages:**
- `public/image-gen.html` - Image Generator
- `public/logo-gen.html` - Logo Maker
- `public/voice-ai.html` - Voice AI (TTS)
- `public/content-ai.html` - Content AI (Blog/Article)
- `public/code-ai.html` - Code AI (Generate/Debug)
- `public/email-ai.html` - Email AI
- `public/resume-ai.html` - Resume AI
- `public/data-ai.html` - Data Analysis AI

**Utility Tool Pages:**
- `public/color-gen.html` - Color Palette Generator
- `public/gradient-gen.html` - CSS Gradient Generator
- `public/img-compress.html` - Image Compression
- `public/img-convert.html` - Image Format Converter
- `public/json-format.html` - JSON Formatter/Validator
- `public/code-minify.html` - Code Minifier
- `public/jwt-decode.html` - JWT Token Decoder
- `public/url-encode.html` - URL Encoder/Decoder
- `public/regex-test.html` - Regex Tester
- `public/pass-gen.html` - Password Generator
- `public/qr-gen.html` - QR Code Generator
- `public/hashtag-gen.html` - Hashtag Generator
- `public/utm-gen.html` - UTM Link Builder
- `public/case-convert.html` - Case Converter
- `public/unit-convert.html` - Unit Converter
- `public/ip-lookup.html` - IP Address Lookup
- `public/fake-data.html` - Fake Data Generator

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