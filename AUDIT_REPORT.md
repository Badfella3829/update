# End-to-End Website Audit Report

Date: 2026-03-12
Scope: Static frontend in `public/`, runtime checks on key pages, API/backend readiness checks in `public/server.js` and Firebase setup.

## 1) Frontend UI/UX (Desktop, Tablet, Mobile)

### Findings
- **Horizontal overflow on homepage (`index.html`) across desktop, tablet, and mobile**. This typically indicates one or more containers/elements exceed viewport width and can cause side-scrolling. Verified via Playwright viewport checks.
- Core auth and marketing pages loaded in all tested viewports (`index`, `login`, `signup`, `pricing`, `dashboard`, `contact`) with HTTP 200.

### Recommended fixes
1. Add a temporary debug style in dev to identify overflow sources:
   ```css
   * { outline: 1px solid rgba(255,0,0,.2); }
   ```
2. Inspect sections likely using fixed widths, `100vw`, or unwrapped long strings.
3. Replace risky width rules:
   - `width: 100vw` ➜ `width: 100%`
   - add `max-width: 100%` to media wrappers
   - use `overflow-wrap: anywhere;` for long text/URLs
4. Keep `body { overflow-x: hidden; }` only as a final fallback, not primary fix.

---

## 2) Pages and Navigation Links

### Findings
- Static analysis of all `public/*.html` found:
  - **53 pages total**
  - **0 broken internal links** (after filtering template-literal JS URLs)
  - **0 missing local assets** (same filtering)
- Runtime checks for major linked pages returned HTTP 200.

### Recommended fixes
- Keep current page-link structure; add automated link check in CI to prevent regressions.

---

## 3) API Integrations

### Findings
- Multiple pages depend on backend endpoints such as `/api/chat-simple`, `/api/voice-ai/tts`, `/api/resume-ai`, etc.
- Backend in `public/server.js` **fails to start without OpenAI credentials**, throwing at startup.
- `requirePremium` uses a **header-only trust model** (`x-user-plan`) which can be spoofed if exposed directly.

### Recommended fixes
1. Make server startup resilient:
   - Initialize OpenAI only if env vars exist, or fail gracefully with clear health-check output.
2. Replace header-only plan gating with verified identity:
   - verify Firebase ID token server-side
   - fetch user plan from Firestore on server
3. Add API health endpoint (`/api/health`) and startup checks for required env vars.

---

## 4) Loading Speed & Performance

### Findings
- Local static-server TTFB/total times were fast (<3ms), but this does **not** reflect production CDN/network conditions.
- `dashboard.html` is large (~252KB HTML), which can hurt first render on slower devices.

### Recommended fixes
1. Split large dashboard markup into componentized/lazy-loaded sections.
2. Defer non-critical scripts and reduce inline script payload.
3. Add compression and long-cache for immutable assets in production.
4. Run Lighthouse in production/staging for real Core Web Vitals.

---

## 5) Console / Network Errors / Broken Scripts

### Findings
- `signup.html` logs repeated CSP-related blocked requests from Google Ads/Sodar domains.
- `pricing.html` emits Permissions-Policy warnings: unsupported features (`web-share`, `loopback-network`).
- `dashboard.html` logs auth-guard redirect warnings when unauthenticated (expected), plus aborted Firestore write stream during redirect.

### Recommended fixes
1. For signup/ads:
   - either remove ad scripts from auth pages,
   - or update CSP to explicitly allow needed ad domains (if policy permits).
2. For permissions-policy warnings:
   - remove unsupported directives or gate by browser capability.
3. Prevent Firestore connections before auth is confirmed on protected pages.

---

## 6) Missing Assets (images/fonts/styles)

### Findings
- No concrete missing local assets detected in static file checks.
- Template-literal-generated image URLs in JS are expected and were excluded from missing-asset errors.

### Recommended fixes
- Keep asset checks in CI to catch accidental file renames/deletions.

---

## 7) Security Issues / Exposed Keys

### Findings
- Firebase client config values are present in frontend JS (normal for Firebase web apps), but this requires strict Firestore/Auth rules.
- Critical backend secret (`OPENAI_API_KEY`/integration key) is env-based (good), but missing env crashes startup.
- Premium authorization is weak if relying only on `x-user-plan` header.

### Recommended fixes
1. Enforce Firestore rules and verify no overly broad read/write permissions.
2. Harden backend authz using verified Firebase JWT claims + server-side plan lookup.
3. Add rate limits per user/IP on expensive AI endpoints.

---

## 8) SEO Basics (Meta, title, description)

### Findings
- All pages have `<title>`.
- **52 of 53 pages are missing `<meta name="description">`**, which is a major SEO gap.

### Recommended fixes
1. Add unique meta descriptions (120–160 chars) to each page.
2. Add canonical tags and Open Graph/Twitter cards for key landing pages.
3. Ensure one `<h1>` per page with semantic heading hierarchy.

---

## 9) Bugs / UI Glitches / Feature Risks

### Findings
- Homepage horizontal overflow across breakpoints.
- Auth page ads produce noisy CSP errors (may impact trust and debug clarity).
- Backend startup hard-fails without credentials, reducing operational resilience.

### Recommended fixes
- Prioritize: (1) overflow, (2) auth-page console noise/CSP cleanup, (3) backend startup robustness.

---

## 10) Overall UX and Improvement Suggestions

1. **Polish responsiveness:** remove horizontal scrolling and test all major templates at 390px/768px/1440px.
2. **Improve reliability:** add health checks + graceful degraded mode when API keys are unavailable.
3. **SEO uplift:** metadata coverage, social tags, canonical URLs.
4. **Trust/clarity:** reduce console noise on auth funnel pages.
5. **Performance:** split large dashboard payload and lazy-load lower-priority widgets.

---

## Checks Executed

- Playwright viewport/runtime checks on key pages (desktop/tablet/mobile):
  - `/index.html`, `/login.html`, `/signup.html`, `/pricing.html`, `/dashboard.html`, `/contact.html`
- Static HTML crawl checks for all `public/*.html`:
  - title presence, meta description presence, internal links, local asset references
- Local response timing checks via `curl` for key pages.
- Backend startup check for `public/server.js`.
- Repository auth integration test run (`npm test`) passed.

## Suggested Implementation Order

1. Fix homepage overflow and re-test all breakpoints.
2. Remove/adjust ad scripts + CSP on signup/auth pages.
3. Harden API authz (token verification + server-side plan lookup).
4. Add meta descriptions and canonical/social metadata.
5. Optimize dashboard payload and lazy loading.
