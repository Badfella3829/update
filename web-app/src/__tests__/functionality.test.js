/**
 * Core Functionality Tests
 * Tests for key utility functions, form validation, and HTML structure
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the public directory relative to this test file, not the cwd,
// so tests work regardless of which directory the test runner is invoked from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

// ============================================================
// EMAIL VALIDATION LOGIC TESTS
// ============================================================
describe('Email Validation', () => {
  // Mirrors the email validation logic used in signup.html, login.html, and forgot-password.html
  function isEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  it('accepts a valid email address', () => {
    expect(isEmailValid('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isEmailValid('user@mail.example.com')).toBe(true);
  });

  it('rejects email without @ symbol', () => {
    expect(isEmailValid('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(isEmailValid('user@')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isEmailValid('')).toBe(false);
  });

  it('rejects email without TLD', () => {
    expect(isEmailValid('user@example')).toBe(false);
  });

  it('rejects string with spaces', () => {
    expect(isEmailValid('user @example.com')).toBe(false);
  });
});

// ============================================================
// PASSWORD GENERATION LOGIC TESTS
// ============================================================
describe('Password Generation Logic', () => {
  // Mirrors the logic in public/pass-gen.html
  function generatePassword(length, useUpper, useLower, useNumbers, useSymbols) {
    let chars = '';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) chars += '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) return null;

    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  it('generates password of correct length', () => {
    const password = generatePassword(16, true, true, true, false);
    expect(password).toHaveLength(16);
  });

  it('generates uppercase-only password when only useUpper is set', () => {
    const password = generatePassword(20, true, false, false, false);
    expect(password).toMatch(/^[A-Z]+$/);
  });

  it('generates lowercase-only password when only useLower is set', () => {
    const password = generatePassword(20, false, true, false, false);
    expect(password).toMatch(/^[a-z]+$/);
  });

  it('generates numeric-only password when only useNumbers is set', () => {
    const password = generatePassword(20, false, false, true, false);
    expect(password).toMatch(/^[0-9]+$/);
  });

  it('returns null when no character sets are selected', () => {
    const password = generatePassword(16, false, false, false, false);
    expect(password).toBeNull();
  });

  it('generates password of minimum length 8', () => {
    const password = generatePassword(8, true, true, false, false);
    expect(password).toHaveLength(8);
  });

  it('generates password of maximum length 64', () => {
    const password = generatePassword(64, true, true, true, true);
    expect(password).toHaveLength(64);
  });
});

// ============================================================
// COLOR GENERATION LOGIC TESTS
// ============================================================
describe('Color Generation Logic', () => {
  // Mirrors the hex/HSL logic in public/color-gen.html
  function isValidHex(hex) {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
  }

  function randomHex() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  it('randomHex generates valid hex color', () => {
    const hex = randomHex();
    expect(isValidHex(hex)).toBe(true);
  });

  it('validates correct hex color format', () => {
    expect(isValidHex('#3b82f6')).toBe(true);
    expect(isValidHex('#FFFFFF')).toBe(true);
  });

  it('rejects invalid hex color formats', () => {
    expect(isValidHex('3b82f6')).toBe(false);  // Missing #
    expect(isValidHex('#3b82')).toBe(false);   // Too short
    expect(isValidHex('#gggggg')).toBe(false); // Invalid chars
  });

  it('hexToHSL converts known value correctly', () => {
    // Red = #ff0000 should give H≈0, S=100, L=50
    const [h, s, l] = hexToHSL('#ff0000');
    expect(Math.round(h)).toBe(0);
    expect(Math.round(s)).toBe(100);
    expect(Math.round(l)).toBe(50);
  });

  it('hslToHex round-trips through hexToHSL', () => {
    const original = '#3b82f6';
    const [h, s, l] = hexToHSL(original);
    const result = hslToHex(h, s, l);
    expect(result.toLowerCase()).toBe(original.toLowerCase());
  });

  it('complementary color is 180 degrees away', () => {
    const base = '#3b82f6';
    const [h, s, l] = hexToHSL(base);
    const complementH = (h + 180) % 360;
    const complementary = hslToHex(complementH, s, l);
    expect(isValidHex(complementary)).toBe(true);
    const [compH] = hexToHSL(complementary);
    expect(Math.abs(compH - complementH)).toBeLessThan(1);
  });
});

// ============================================================
// ERROR MESSAGE MAPPING TESTS
// ============================================================
describe('Error Message Mapping', () => {
  // Mirrors the error message logic from public/js/error-handler.js
  const ERROR_MESSAGES = {
    'auth/user-not-found': 'Account not found. Please check your email or sign up.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'This email is already registered. Please login instead.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'Network connection failed. Please check your internet and try again.',
    'UNKNOWN_ERROR': 'Something went wrong. Please try again or contact support if the problem persists.'
  };

  function getUserFriendlyMessage(error) {
    const errorCode = error?.code || error?.message || error;
    if (ERROR_MESSAGES[errorCode]) return ERROR_MESSAGES[errorCode];
    return ERROR_MESSAGES['UNKNOWN_ERROR'];
  }

  it('returns user-friendly message for auth/user-not-found', () => {
    const msg = getUserFriendlyMessage({ code: 'auth/user-not-found' });
    expect(msg).toBe('Account not found. Please check your email or sign up.');
  });

  it('returns user-friendly message for auth/wrong-password', () => {
    const msg = getUserFriendlyMessage({ code: 'auth/wrong-password' });
    expect(msg).toBe('Incorrect password. Please try again.');
  });

  it('returns user-friendly message for auth/email-already-in-use', () => {
    const msg = getUserFriendlyMessage({ code: 'auth/email-already-in-use' });
    expect(msg).toBe('This email is already registered. Please login instead.');
  });

  it('returns user-friendly message for auth/weak-password', () => {
    const msg = getUserFriendlyMessage({ code: 'auth/weak-password' });
    expect(msg).toBe('Password is too weak. Please use at least 6 characters.');
  });

  it('returns generic message for unknown errors', () => {
    const msg = getUserFriendlyMessage({ code: 'auth/unknown-error-xyz' });
    expect(msg).toBe('Something went wrong. Please try again or contact support if the problem persists.');
  });

  it('handles null/undefined error gracefully', () => {
    const msg = getUserFriendlyMessage(null);
    expect(msg).toBe('Something went wrong. Please try again or contact support if the problem persists.');
  });
});

// ============================================================
// HTML STRUCTURE TESTS - Page Elements and Text
// ============================================================
describe('Page Structure and Content Validation', () => {
  const publicDir = PUBLIC_DIR;

  function readHtml(filename) {
    return fs.readFileSync(path.join(publicDir, filename), 'utf-8');
  }

  // Login page
  describe('Login Page (login.html)', () => {
    let html;
    beforeEach(() => { html = readHtml('login.html'); });

    it('has the correct page title', () => {
      expect(html).toContain('<title>Login — TechVyro</title>');
    });

    it('has email input field', () => {
      expect(html).toContain('id="username"');
      expect(html).toContain('type="email"');
    });

    it('has password input field', () => {
      expect(html).toContain('id="password"');
      expect(html).toContain('type="password"');
    });

    it('has login submit button', () => {
      expect(html).toContain('id="loginBtn"');
    });

    it('has link to signup page', () => {
      expect(html).toContain('href="signup.html"');
    });

    it('has link to home page', () => {
      expect(html).toContain('href="index.html"');
    });

    it('has forgot password functionality', () => {
      expect(html).toContain('showResetForm()');
      expect(html).toContain('id="resetFormContainer"');
    });

    it('has back to login button in reset form', () => {
      expect(html).toContain('showLoginForm()');
    });

    it('has reset email input field', () => {
      expect(html).toContain('id="resetEmail"');
    });

    it('has reset submit button', () => {
      expect(html).toContain('id="resetBtn"');
    });
  });

  // Signup page
  describe('Signup Page (signup.html)', () => {
    let html;
    beforeEach(() => { html = readHtml('signup.html'); });

    it('has the correct page title', () => {
      expect(html).toContain('<title>Create Account — TechVyro</title>');
    });

    it('has full name input field', () => {
      expect(html).toContain('id="fullName"');
    });

    it('has email input field with autocomplete', () => {
      expect(html).toContain('id="username"');
      expect(html).toContain('autocomplete="email"');
    });

    it('has password input field with autocomplete', () => {
      expect(html).toContain('id="password"');
      expect(html).toContain('autocomplete="new-password"');
    });

    it('has referral code input field', () => {
      expect(html).toContain('id="referralCode"');
    });

    it('has terms checkbox that must be checked to enable signup', () => {
      expect(html).toContain('id="termsCheckbox"');
      expect(html).toContain('btn.disabled = !termsCheckbox.checked');
    });

    it('has the signup button initially disabled', () => {
      expect(html).toContain('id="signupBtn"');
      expect(html).toContain('disabled');
    });

    it('has link to login page', () => {
      expect(html).toContain('href="login.html"');
    });

    it('has links to terms, privacy, and refund policies', () => {
      expect(html).toContain('href="terms.html"');
      expect(html).toContain('href="privacy.html"');
      expect(html).toContain('href="refund.html"');
    });

    it('shows success toast and redirects to login on success', () => {
      expect(html).toContain('Account Created! Please check your email to verify.');
      expect(html).toContain("location.href = \"login.html\"");
    });
  });

  // Forgot password page
  describe('Forgot Password Page (forgot-password.html)', () => {
    let html;
    beforeEach(() => { html = readHtml('forgot-password.html'); });

    it('has the correct page title', () => {
      expect(html).toContain('<title>Reset Password — TechVyro</title>');
    });

    it('has email input with autocomplete', () => {
      expect(html).toContain('id="email"');
      expect(html).toContain('autocomplete="email"');
    });

    it('has send reset link button', () => {
      expect(html).toContain('id="resetBtn"');
      expect(html).toContain('Send Reset Link');
    });

    it('keeps button disabled after successful send', () => {
      expect(html).toContain('btn.disabled = true');
    });

    it('has back to login link', () => {
      expect(html).toContain('href="login.html"');
    });

    it('shows success message on successful reset', () => {
      expect(html).toContain('If an account exists, a reset link has been sent. Check your email.');
    });
  });

  // Pricing page
  describe('Pricing Page (pricing.html)', () => {
    let html;
    beforeEach(() => { html = readHtml('pricing.html'); });

    it('has correct Firebase import path (not ../js/)', () => {
      // Should NOT have the broken path
      expect(html).not.toContain('"../js/firebase.js"');
      expect(html).not.toContain("'../js/firebase.js'");
    });

    it('has correct payments.js import path (not ../js/)', () => {
      // Should NOT have the broken path
      expect(html).not.toContain('"../js/payments.js"');
      expect(html).not.toContain("'../js/payments.js'");
    });

    it('uses correct relative path for Firebase import', () => {
      expect(html).toContain('./js/firebase.js');
    });

    it('uses correct relative path for payments import', () => {
      expect(html).toContain('./js/payments.js');
    });

    it('has buy plan buttons for pro and premium', () => {
      expect(html).toContain("buyPlan('pro')");
      expect(html).toContain("buyPlan('premium')");
    });

    it('has link to signup for free plan', () => {
      expect(html).toContain('href="signup.html"');
    });

    it('has link to login for unauthenticated users', () => {
      expect(html).toContain("location.href = \"login.html\"");
    });
  });

  // Dashboard page
  describe('Dashboard Page (dashboard.html)', () => {
    let html;
    beforeEach(() => { html = readHtml('dashboard.html'); });

    it('has correct page title', () => {
      expect(html).toContain('<title>Dashboard — TechVyro</title>');
    });

    it('has sidebar navigation', () => {
      expect(html).toContain('id="sidebar"');
    });

    it('has credit display element', () => {
      expect(html).toContain('id="creditText"');
    });

    it('has user name display', () => {
      expect(html).toContain('id="userName"');
    });

    it('has user plan badge', () => {
      expect(html).toContain('id="userPlan"');
    });

    it('has logout functionality', () => {
      expect(html).toContain('logout()');
    });

    it('has profile navigation', () => {
      expect(html).toContain("'profile.html'");
    });

    it('smoothScrollTo function is defined', () => {
      expect(html).toContain('window.smoothScrollTo');
    });

    it('all tool open buttons have correct mapping', () => {
      expect(html).toContain("checkCreditAndOpen('chat')");
      expect(html).toContain("checkCreditAndOpen('image')");
      expect(html).toContain("checkCreditAndOpen('passgen')");
      expect(html).toContain("checkCreditAndOpen('qr')");
    });

    it('checkCreditAndOpen function is defined', () => {
      expect(html).toContain('window.checkCreditAndOpen');
    });

    it('has premium upgrade modal', () => {
      expect(html).toContain('id="premiumModal"');
    });

    it('has notification badge', () => {
      expect(html).toContain('id="notificationBadge"');
    });

    it('has notification dropdown', () => {
      expect(html).toContain('id="notificationDropdown"');
      expect(html).toContain('id="notificationsList"');
    });

    it('has mark all notifications read button', () => {
      expect(html).toContain('markAllNotificationsRead()');
      expect(html).toContain('window.markAllNotificationsRead');
    });

    it('listens for real-time notificationsUpdated event', () => {
      expect(html).toContain("'notificationsUpdated'");
    });

    it('has in-app notification CSS styles', () => {
      expect(html).toContain('.in-app-notification');
      expect(html).toContain('notifSlideIn');
    });

    it('toggleNotifications opens and closes the dropdown via style.display', () => {
      expect(html).toContain("style.display = isVisible ? 'none' : 'block'");
    });
  });

  // Profile page
  describe('Profile Page (profile.html)', () => {
    let html;
    beforeEach(() => { html = readHtml('profile.html'); });

    it('has correct page title', () => {
      expect(html).toContain('<title>Profile Settings | TechVyro</title>');
    });

    it('has email input field with correct ID', () => {
      expect(html).toContain('id="emailInput"');
    });

    it('has UID display with correct ID', () => {
      expect(html).toContain('id="uidInput"');
    });

    it('has name input field', () => {
      expect(html).toContain('id="nameInput"');
    });

    it('has save name button', () => {
      expect(html).toContain('id="saveNameBtn"');
      expect(html).toContain('saveName()');
    });

    it('has logout button', () => {
      expect(html).toContain('onclick="logout()"');
    });

    it('has delete account button', () => {
      expect(html).toContain('deleteAccount()');
    });

    it('uses correct element IDs (not outdated profile.js IDs)', () => {
      // The inline script in profile.html uses emailInput/uidInput to match the
      // <input> elements in the HTML. The legacy public/js/profile.js used "email"
      // and "uid" (no "Input" suffix) which would silently fail since those IDs do
      // not exist in the DOM. This test prevents that regression.
      expect(html).toContain("getElementById('emailInput')");
      expect(html).toContain("getElementById('uidInput')");
      // Legacy profile.js patterns that would fail because no element has id="email" / id="uid"
      expect(html).not.toContain('getElementById("email").innerText');
      expect(html).not.toContain('getElementById("uid").innerText');
    });

    it('has back link to dashboard', () => {
      expect(html).toContain('href="dashboard.html"');
    });
  });

  // Password generator page
  describe('Password Generator Page (pass-gen.html)', () => {
    let html;
    beforeEach(() => { html = readHtml('pass-gen.html'); });

    it('has length range input', () => {
      expect(html).toContain('id="length"');
    });

    it('has uppercase checkbox', () => {
      expect(html).toContain('id="upper"');
    });

    it('has lowercase checkbox', () => {
      expect(html).toContain('id="lower"');
    });

    it('has numbers checkbox', () => {
      expect(html).toContain('id="numbers"');
    });

    it('has symbols checkbox', () => {
      expect(html).toContain('id="symbols"');
    });

    it('has generate button', () => {
      expect(html).toContain('generatePassword()');
    });

    it('has copy button logic', () => {
      expect(html).toContain('copyPassword()');
    });

    it('shows warning when no character set selected', () => {
      expect(html).toContain("'Select at least one option'");
    });
  });

  // Index/Home page
  describe('Home Page (index.html)', () => {
    let html;
    beforeEach(() => { html = readHtml('index.html'); });

    it('has correct page title', () => {
      expect(html).toContain('TechVyro');
    });

    it('has navigation links', () => {
      expect(html).toContain('href="./login.html"');
      expect(html).toContain('href="./signup.html"');
      expect(html).toContain('href="./dashboard.html"');
      expect(html).toContain('href="./contact.html"');
    });

    it('has pricing section with anchor', () => {
      expect(html).toContain('id="pricing"');
      expect(html).toContain('href="#pricing"');
    });

    it('has Get Started CTA button linking to signup', () => {
      expect(html).toContain('href="./signup.html"');
    });
  });
});

// ============================================================
// RATE LIMITING LOGIC TESTS
// ============================================================
describe('Login Rate Limiting Logic', () => {
  // Mirrors the rate limiting logic from public/js/auth-login.js
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  let mockStorage = {};

  function mockLocalStorage() {
    return {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => { mockStorage[key] = val; },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
  }

  function isLockedOut(storage) {
    const lockoutUntil = storage.getItem('loginLockoutUntil');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      return parseInt(lockoutUntil);
    }
    return null;
  }

  function incrementFailedAttempts(storage) {
    const current = parseInt(storage.getItem('failedLoginAttempts') || '0');
    const newCount = current + 1;
    storage.setItem('failedLoginAttempts', newCount.toString());
    if (newCount >= MAX_ATTEMPTS) {
      storage.setItem('loginLockoutUntil', (Date.now() + LOCKOUT_DURATION).toString());
    }
    return newCount;
  }

  function clearRateLimitData(storage) {
    storage.removeItem('failedLoginAttempts');
    storage.removeItem('loginLockoutUntil');
  }

  beforeEach(() => {
    mockStorage = {};
  });

  it('initially not locked out', () => {
    const storage = mockLocalStorage();
    expect(isLockedOut(storage)).toBeNull();
  });

  it('increments failed attempt count', () => {
    const storage = mockLocalStorage();
    incrementFailedAttempts(storage);
    expect(storage.getItem('failedLoginAttempts')).toBe('1');
  });

  it('triggers lockout after max attempts', () => {
    const storage = mockLocalStorage();
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      incrementFailedAttempts(storage);
    }
    expect(isLockedOut(storage)).not.toBeNull();
  });

  it('does not lock out before max attempts', () => {
    const storage = mockLocalStorage();
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      incrementFailedAttempts(storage);
    }
    expect(isLockedOut(storage)).toBeNull();
  });

  it('clears rate limit data on successful login', () => {
    const storage = mockLocalStorage();
    incrementFailedAttempts(storage);
    incrementFailedAttempts(storage);
    clearRateLimitData(storage);
    expect(storage.getItem('failedLoginAttempts')).toBeNull();
    expect(storage.getItem('loginLockoutUntil')).toBeNull();
    expect(isLockedOut(storage)).toBeNull();
  });
});

// ============================================================
// NAVIGATION AND LINK INTEGRITY TESTS
// ============================================================
describe('Navigation Link Integrity', () => {
  const publicDir = PUBLIC_DIR;

  it('all key pages exist in the public directory', () => {
    const requiredPages = [
      'index.html', 'login.html', 'signup.html', 'dashboard.html',
      'profile.html', 'pricing.html', 'forgot-password.html',
      'contact.html', 'about.html', 'privacy.html', 'terms.html',
      'refund.html', '404.html'
    ];
    for (const page of requiredPages) {
      const exists = fs.existsSync(path.join(publicDir, page));
      expect(exists, `Page ${page} should exist`).toBe(true);
    }
  });

  it('all tool pages linked from dashboard exist', () => {
    const toolPages = [
      'chat.html', 'image-gen.html', 'logo-gen.html', 'content-ai.html',
      'code-ai.html', 'email-ai.html', 'voice-ai.html', 'resume-ai.html',
      'data-ai.html', 'color-gen.html', 'gradient-gen.html',
      'img-compress.html', 'json-format.html', 'code-minify.html',
      'jwt-decode.html', 'url-encode.html', 'regex-test.html',
      'pass-gen.html', 'qr-gen.html', 'hashtag-gen.html', 'utm-gen.html',
      'case-convert.html', 'unit-convert.html', 'img-convert.html',
      'ip-lookup.html', 'fake-data.html'
    ];
    for (const page of toolPages) {
      const exists = fs.existsSync(path.join(publicDir, page));
      expect(exists, `Tool page ${page} should exist`).toBe(true);
    }
  });

  it('js directory with required modules exists', () => {
    const requiredModules = [
      'firebase.js', 'auth-login.js', 'auth-signup.js', 'auth-check.js',
      'auth-guard.js', 'dashboard.js', 'premium-common.js', 'payments.js',
      'credits.js', 'error-handler.js', 'logger.js'
    ];
    for (const mod of requiredModules) {
      const exists = fs.existsSync(path.join(publicDir, 'js', mod));
      expect(exists, `Module js/${mod} should exist`).toBe(true);
    }
  });

  it('css directory with required stylesheets exists', () => {
    const requiredCss = ['main.css', 'auth.css', 'dashboard.css', 'premium-common.css'];
    for (const css of requiredCss) {
      const exists = fs.existsSync(path.join(publicDir, 'css', css));
      expect(exists, `Stylesheet css/${css} should exist`).toBe(true);
    }
  });
});
