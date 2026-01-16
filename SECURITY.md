# 🔒 Security Implementation Guide

## Overview

This document outlines the security measures implemented for the Synapse website following **OWASP Top 10** guidelines.

---

## 1. Rate Limiting ✅

### Firebase Built-in Protections
- **DDoS Protection**: Firebase infrastructure includes automatic DDoS protection
- **Quota Limits**: Firebase enforces daily read/write quotas at the project level

### Firebase App Check (Added)
App Check verifies that requests to your backend come from your legitimate app, not from scripts or bots.

**Setup Required:**
1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project → App Check
2. Click "Get Started" for your web app
3. Choose **reCAPTCHA v3** as the provider
4. Register your domain(s)
5. Copy the **Site Key** and add to your `.env`:
   ```
   VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
   ```
6. In Firebase Console → App Check → APIs, enable enforcement for:
   - Cloud Firestore
   - Cloud Storage
   - Firebase Authentication

---

## 2. Authentication & Authorization ✅

### Firestore Security Rules (`firestore.rules`)

**Key Features:**
- **Authentication Required**: Most write operations require `request.auth != null`
- **Role-Based Access**: Admin-only operations checked via `admins` collection
- **Owner-Based Access**: Users can only access their own data
- **Input Validation**: String length limits, URL validation, array size limits

**Admin Setup:**
1. Go to Firebase Console → Firestore
2. Create collection: `admins`
3. Add a document with ID = your user's UID
4. Add any fields you want (e.g., `email`, `name`)

**Rules Summary:**
| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| sponsors | Public | Admin | Admin | Admin |
| promotions | Public | Admin | Admin | Admin |
| events | Public | Admin | Admin | Admin |
| products | Public | Admin | Admin | Admin |
| users | Owner/Admin | Owner | Owner | Admin |
| admins | Admin | None | None | None |

### Storage Security Rules (`storage.rules`)

**Key Features:**
- File size limits (5MB for admins, 2MB for users)
- Content type validation (images only)
- Path-based access control
- Authentication requirements

---

## 3. CORS Configuration ✅

### Firebase Automatic CORS
Firebase services (Firestore, Storage, Auth) automatically handle CORS:
- Requests from any domain are allowed for **read** operations
- Write operations are protected by **Security Rules** (not CORS)

### Additional Headers (via `firebase.json`)
When deploying to Firebase Hosting, these security headers are applied:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-XSS-Protection | 1; mode=block | XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer info |
| Permissions-Policy | Disabled features | Restricts browser features |

---

## 4. Deployment Steps

### Deploy Security Rules
```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (select existing project)
firebase init

# Deploy only rules
firebase deploy --only firestore:rules,storage:rules

# Or deploy everything
firebase deploy
```

### Verify App Check is Working
1. Open browser DevTools → Network tab
2. Look for requests to Firestore
3. Verify `X-Firebase-AppCheck` header is present

---

## 5. Additional Security Recommendations

### Environment Variables
- ✅ API keys stored in `.env` (not committed to Git)
- ✅ `.env.example` provided for team members
- ⚠️ Ensure `.env` is in `.gitignore`

### Content Security Policy (CSP)
Add to `firebase.json` if needed:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' https://apis.google.com; ..."
}
```

### API Key Restrictions
1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Click on your Firebase API key
3. Under "Application restrictions", select "HTTP referrers"
4. Add your domains:
   - `https://your-domain.com/*`
   - `https://*.your-domain.com/*`
   - `http://localhost:*/*` (for development)

### Regular Security Audits
- Run `npm audit` regularly
- Update dependencies with `npm update`
- Check Firebase Console for security alerts

---

## 6. OWASP Top 10 Compliance

| # | Vulnerability | Mitigation |
|---|---------------|------------|
| A01 | Broken Access Control | Firestore rules enforce auth & ownership |
| A02 | Cryptographic Failures | Firebase handles encryption (HTTPS, at-rest) |
| A03 | Injection | Firestore prevents SQL injection by design |
| A04 | Insecure Design | Security rules reviewed, least privilege |
| A05 | Security Misconfiguration | Rules deployed, App Check enabled |
| A06 | Vulnerable Components | Regular npm audit |
| A07 | Authentication Failures | Firebase Auth, App Check |
| A08 | Integrity Failures | npm audit, verified dependencies |
| A09 | Logging Failures | Firebase Analytics, Console logging |
| A10 | SSRF | No server-side requests in this architecture |

---

## 7. Quick Checklist

Before going to production:

- [ ] Deploy `firestore.rules` to Firebase
- [ ] Deploy `storage.rules` to Firebase
- [ ] Set up App Check with reCAPTCHA v3
- [ ] Add `VITE_RECAPTCHA_SITE_KEY` to production environment
- [ ] Restrict API keys in Google Cloud Console
- [ ] Create admin user in `admins` collection
- [ ] Enable App Check enforcement for all APIs
- [ ] Run `npm audit fix`
- [ ] Test all functionality with rules deployed
