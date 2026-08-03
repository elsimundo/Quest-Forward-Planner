# ISO 27001 Testing & Auditing Implementation Guide

This document describes the security testing and audit practices implemented in the Quest Power Dashboard, designed for ISO 27001:2022 compliance. It is written so the same model can be reused on another application with minimal adaptation.

---

## 1. Scope & Goal

**Goal:** Provide evidence that the application protects confidentiality, integrity, and availability of customer and operational data through tested technical controls.

**What is covered:**
- Authentication, session, and access-control testing
- Input validation and injection-prevention testing
- Security header and transport-layer verification
- Audit logging of security-relevant events
- Rate limiting and abuse prevention
- Data segregation between tenants
- Regression testing of security-critical code

**What is assumed:**
- A web application with authenticated users and role-based access
- At least one persistent data store
- An environment where `NODE_ENV` can be `development` or `production`

---

## 2. Security Architecture Summary

### 2.1 Roles

| Role | Identifier | Permissions |
|------|------------|-------------|
| Internal staff | `company_id` is NULL + role derived from email/registry | Full admin access |
| Super admin | Email in super-admin registry | Admin settings, user/company blocking |
| Editor | Email in editor registry | Administrative data entry |
| Staff | Internal but not in registry | Operational read/write |
| Customer | `company_id` set | Read-only access to own pods/readings only |
| Blocked | Entry in blocked-users or blocked-companies table | Login denied |

### 2.2 Session Model

- Sessions are stateless, HMAC-SHA256-signed tokens stored in an `HttpOnly` cookie.
- 24-hour expiration, verified on every request.
- Signature verified with `crypto.timingSafeEqual` to prevent timing attacks.
- Cookie is `SameSite=Lax` in all environments and `Secure` in production.

### 2.3 Data Segregation

- Customers can only access pods currently assigned to their `company_id`.
- All data access goes through `authorizePodAccess`, `authorizeAssignmentAccess`, or `authorizeReadingAccess` helpers.
- Unauthorized attempts are logged with IP, user agent, and reason.

### 2.4 Input Validation

- All route parameters and request bodies are validated with Zod schemas before any database operation.
- MongoDB ObjectIds are validated with a regex (`/^[0-9a-fA-F]{24}$/`) and `new ObjectId(id)` before use.
- No raw user input is passed to query builders.

---

## 3. Automated Security Tests

### 3.1 Session Token Tests

File pattern: `src/lib/auth/__tests__/session.test.ts`

What is tested:

```typescript
describe('encodeSession', () => {
  it('encodes a valid admin session');
  it('encodes a valid customer session');
  it('throws if SESSION_SECRET is missing');
});

describe('decodeSession', () => {
  it('decodes a valid session');
  it('returns null for invalid input');
  it('returns null for malformed tokens');
  it('returns null for tampered signatures');
  it('returns null for expired sessions');
  it('returns null for invalid JSON');
  it('validates required fields');
});

describe('createSessionCookie', () => {
  it('creates a valid cookie string in development');
  it('includes Secure flag in production');
});

describe('clearSessionCookie', () => {
  it('creates a clearing cookie in development');
  it('includes Secure flag in production');
});
```

Key assertions:
- Token format is `base64url(payload).base64url(hmac)`.
- Tampering any character of the signature invalidates the session.
- Expired tokens are rejected.
- Missing or invalid required fields reject the session.
- Production cookies include `Secure`.

### 3.2 Login & Authentication Tests

File pattern: `src/app/api/__tests__/login.test.ts`

What is tested:

```typescript
describe('POST /api/login', () => {
  it('returns 400 for invalid request body');
  it('returns 429 when rate limited');
  it('returns 401 for non-existent user');
  it('returns 403 for blocked permission groups (staff, engineer)');
  it('returns 401 for incorrect password');
  it('successfully logs in admin user');
  it('successfully logs in customer user');
});
```

Key assertions:
- Rate limiting is enforced before authentication lookup.
- Failed attempts return generic "Invalid username or password" to prevent user enumeration.
- Successful logins issue an `auth_session` cookie.
- Permission groups that must never access the app are rejected with 403.

### 3.3 Authorization Helpers

Test that:
- `authorizePodAccess` returns `authorized: true` for internal staff.
- `authorizePodAccess` returns `authorized: false` when a customer requests another company's pod.
- `authorizeAssignmentAccess` rejects assignments that are deleted or belong to another company.
- `authorizeReadingAccess` rejects readings with a mismatched `company_id`.
- `validateObjectId` rejects malformed IDs and accepts valid 24-character hex strings.
- `safeObjectId` throws on invalid input instead of creating an invalid ObjectId.

### 3.4 Sanitization & Validation Tests

File pattern: `src/lib/__tests__/sanitize.test.ts`

Cover:
- HTML/script injection in text fields
- MongoDB operator injection in strings (`$ne`, `$gt`, etc.)
- SQL injection payloads in search parameters
- Excessively long inputs and null bytes
- Expected valid inputs are preserved

### 3.5 Rate Limiter Tests

File pattern: `src/lib/auth/__tests__/rateLimit.test.ts`

Cover:
- First request in a window is allowed.
- Requests up to the limit are allowed.
- Request at `limit + 1` is denied.
- Counter resets after the window expires.
- Different IPs have independent buckets.

### 3.6 Audit Logger Tests

File pattern: `src/lib/audit/__tests__/logger.test.ts`

Cover:
- `logAuditEvent` inserts a document with the correct schema.
- `logApiAudit` derives IP and user agent from the request.
- `diffFields` produces `{ field, old_value, new_value }` only for changed fields.
- `logUnauthorizedAccess` records `action: 'unauthorized_access'` and `status: 'failure'`.
- Audit failures do not throw or break the caller.

---

## 4. Security Headers & Middleware Verification

The middleware applies the following headers on every response:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `X-XSS-Protection` | `1; mode=block` | Reflected XSS mitigation (legacy browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage control |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...` | XSS and data injection |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Feature restriction |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` (production only) | HTTPS enforcement |

### 4.1 Automated Header Test

```typescript
import { NextRequest } from 'next/server';
import middleware from '@/middleware';

it('applies all security headers', async () => {
  const req = new NextRequest('http://localhost/api/test');
  const res = middleware(req);
  expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
});
```

### 4.2 Manual Verification Commands

```bash
# Inspect headers on an API route
curl -I http://localhost:3000/api/health

# Inspect headers on a page
curl -I http://localhost:3000/

# Production HSTS check
curl -I https://your-domain.com/ | grep -i strict-transport
```

Expected results:
- No `Server` banner leakage.
- `X-Frame-Options: DENY`.
- `Content-Security-Policy` present.
- `Strict-Transport-Security` present in production.

---

## 5. Audit Logging

### 5.1 Audit Log Schema

```typescript
{
  timestamp: Date;
  user_id: number | null;
  company_id: number | null;
  username: string | null;
  action: 'login' | 'logout' | 'read' | 'create' | 'update' | 'delete' | 'export' | 'unauthorized_access';
  resource_type: 'pod' | 'assignment' | 'reading' | 'user' | 'company' | 'non_operational_day'
    | 'invoice' | 'quote' | 'anomaly' | 'notification' | 'sla' | 'sla_incident'
    | 'app_settings' | 'component' | 'gateway' | 'preset';
  resource_id: string | null;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure';
  error_message?: string;
  details?: Record<string, unknown>;
}
```

### 5.2 Actions That Must Be Audited

| Action | Example Events |
|--------|--------------|
| `login` | Success, failed password, unknown user, blocked user/company |
| `logout` | User logs out |
| `read` | Accessing pod detail, reading history, exports of single records |
| `create` | Creating pods, assignments, readings, users, companies |
| `update` | Editing readings, pods, assignments, settings, SLA defaults |
| `delete` | Soft-deleting readings, assignments, presets |
| `export` | CSV/PDF downloads from any view |
| `unauthorized_access` | Any 403 path where access was denied |

### 5.3 Field-Level Change Tracking

For updates, use `diffFields(existing, updates, fields)` to record only what changed:

```typescript
const changes = diffFields(existingReading, updates, [
  'power_kw', 'litres', 'fuel_entries', 'notes', 'units', 'location'
]);

await logApiAudit(
  req,
  session,
  'update',
  'reading',
  readingId,
  'success',
  undefined,
  { changes }
);
```

### 5.4 Audit Failure Behaviour

Audit logging is **best-effort**. If the audit insert fails, the application continues and logs an error to the console. This prevents availability issues during an audit outage.

```typescript
try {
  await collection.insertOne(event);
} catch (error) {
  console.error('[AUDIT] Failed to log event:', error);
}
```

### 5.5 Querying Audit Logs

```javascript
// Failed logins in the last 24 hours
db.audit_logs.find({
  action: 'login',
  status: 'failure',
  timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
}).sort({ timestamp: -1 });

// Unauthorized access attempts in the last 7 days
db.audit_logs.find({
  action: 'unauthorized_access',
  timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
}).sort({ timestamp: -1 });

// Activity for a specific user
db.audit_logs.find({
  user_id: 123,
  timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
}).sort({ timestamp: -1 });
```

---

## 6. Manual Security Test Checklist

Use this checklist before every release or after any security-critical change.

### 6.1 Authentication

- [ ] Valid credentials for each role log in successfully.
- [ ] Invalid password returns generic error (no user enumeration).
- [ ] Blocked user cannot log in.
- [ ] Blocked company's users cannot log in.
- [ ] Staff/Engineer permission groups are rejected.
- [ ] Session expires after 24 hours.
- [ ] Session cookie is `HttpOnly` and `SameSite=Lax`.
- [ ] Session cookie is `Secure` in production.
- [ ] Tampered session cookie is rejected.

### 6.2 Authorization

- [ ] Customer A cannot access Customer B's pod detail.
- [ ] Customer cannot access admin-only routes (`/admin/*`).
- [ ] Customer cannot view readings from unassigned pods.
- [ ] Admin can access all customers' data.
- [ ] Direct URL access to a forbidden resource returns 403 and logs `unauthorized_access`.

### 6.3 Input Validation

- [ ] Submit invalid ObjectId (`abc123`) to a pod route -> 400.
- [ ] Submit MongoDB operator in form field (`{ "$gt": "" }`) -> rejected/sanitized.
- [ ] Submit `<script>alert(1)</script>` in a text field -> stored escaped or rejected.
- [ ] Submit SQL injection payload in search -> no error/no unexpected data.
- [ ] Submit empty required fields -> 400 with clear message.

### 6.4 Rate Limiting

- [ ] Make 100 valid API requests in one minute from one IP -> still allowed.
- [ ] Make 101 requests -> 429 with `Retry-After` header.
- [ ] Rate limit resets after one minute.

### 6.5 Headers & Transport

- [ ] `X-Frame-Options: DENY` on all responses.
- [ ] `Content-Security-Policy` present on all responses.
- [ ] HTTPS redirect enforced in production.
- [ ] `Strict-Transport-Security` present in production.
- [ ] No sensitive data in URLs or client-side storage.

### 6.6 Audit Logs

- [ ] Every login (success and failure) appears in `audit_logs`.
- [ ] Every create/update/delete appears in `audit_logs`.
- [ ] Every CSV/PDF export appears in `audit_logs`.
- [ ] Every 403 appears in `audit_logs` as `unauthorized_access`.
- [ ] Audit entries include IP, user agent, timestamp, and user ID.
- [ ] Update entries include field-level `changes` where applicable.

---

## 7. Penetration Testing & External Auditing

### 7.1 Recommended External Tests

- **OWASP ZAP baseline scan** against staging before each release.
- **CSP evaluator** (e.g., Google CSP Evaluator) to review policy.
- **Dependency audit** with `pnpm audit` or `npm audit`.
- **SSL/TLS scan** with SSL Labs or Mozilla Observatory.
- **Authenticated penetration test** annually or after major architecture changes.

### 7.2 ZAP Quick Scan Command

```bash
# Run ZAP baseline scan against a locally running instance
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://host.docker.internal:3000 \
  -r zap-report.html
```

Review the report for:
- Missing security headers
- CSP weaknesses
- Information disclosure
- CSRF issues (where `SameSite=Lax` is not sufficient)

### 7.3 Dependency Audit

```bash
pnpm audit
```

Policy:
- Fix critical and high severity vulnerabilities before release.
- Moderate and low severity vulnerabilities must be triaged and documented.

---

## 8. Compliance Evidence Pack

For an ISO 27001 audit, collect the following evidence:

| Evidence | Location | Frequency |
|----------|----------|-----------|
| Security test results | `src/lib/**/__tests__/*.test.ts` | Every PR |
| Manual test checklist | This document, Section 6 | Every release |
| Audit log samples | MongoDB `audit_logs` collection | Quarterly |
| Dependency audit reports | `pnpm audit` output | Monthly |
| Penetration test report | External vendor PDF | Annual |
| Security header scan | `curl`/ZAP output | Every release |
| Access review | List of super admins/editors | Quarterly |
| Backup & recovery test | `docs/BACKUP-RECOVERY.md` | Quarterly |
| Incident response drill | Runbook + logs | Bi-annual |

---

## 9. Implementing on Another Site

To port this testing and auditing model to a new application:

1. **Copy the audit logger pattern**
   - Create `lib/audit/logger.ts` with `logAuditEvent`, `logApiAudit`, `logUnauthorizedAccess`, and `diffFields`.
   - Store events in a dedicated collection/table.

2. **Add session tests**
   - Test encoding, decoding, tampering, expiry, and field validation.
   - Verify `HttpOnly`, `SameSite`, and `Secure` flags.

3. **Add authentication tests**
   - Test invalid bodies, rate limiting, unknown users, wrong passwords, blocked users, and successful logins for each role.

4. **Add authorization helpers**
   - Create `authorizeResourceAccess(session, resourceId)` helpers for every resource type.
   - Test cross-tenant access is denied and logged.

5. **Add input validation tests**
   - Test malformed IDs, injection payloads, XSS, and invalid schemas.

6. **Add middleware/header tests**
   - Assert the full set of security headers is present.

7. **Add a manual release checklist**
   - Use Section 6 of this document as a template.

8. **Schedule external testing**
   - OWASP ZAP, dependency audit, SSL scan, annual pen test.

9. **Document the evidence pack**
   - Keep test results, audit samples, and scan reports ready for auditors.

---

## 10. Review Schedule

| Review | Frequency | Owner |
|--------|-----------|-------|
| Security unit test results | Every PR | Developer |
| Manual security checklist | Every release | QA / Security lead |
| Audit log review | Quarterly | Compliance officer |
| Dependency audit | Monthly | Developer |
| Penetration test | Annual | External vendor |
| Backup/recovery test | Quarterly | Operations |
| Incident response drill | Bi-annual | Security lead |
| This document | Quarterly | Security lead |

---

*This guide is based on the controls implemented in the Quest Power Dashboard. Adapt role names, collection names, and route paths to match the target application.*
