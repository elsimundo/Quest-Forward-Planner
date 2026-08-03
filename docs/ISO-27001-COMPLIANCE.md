# ISO 27001 Testing & Compliance — Forward Planner

Adapted from `docs/ISO-27001-TESTING-AUDITING-GUIDE.md` (the Quest Power Dashboard model)
for this app's actual stack: Next.js 16 + NextAuth (JWT sessions) + Postgres/Drizzle,
with TMS (MySQL) as the read-only identity source. This document describes what is
**actually implemented** here, not the generic template.

---

## 1. Security Architecture Summary

### 1.1 Roles

| Role | Identifier | Permissions |
|------|------------|-------------|
| `viewer` | Default role on first login | Read-only |
| `scheduler` | Assigned by an admin | Create/edit/move bookings |
| `admin` | Assigned by a super_admin | Admin settings, most management |
| `super_admin` | Provisioned automatically for a TMS `superuser`, or promoted | Full access, any company |

See `lib/db/schema.ts` (`ROLES`) and `lib/auth/require-role.ts`.

### 1.2 Session Model

- NextAuth v5 (`auth.ts`), JWT strategy — session is a signed JWT in an `HttpOnly` cookie,
  managed entirely by NextAuth (not a custom HMAC scheme).
- The JWT's `role` claim is for UI/routing only. Every mutation re-checks the *current*
  role and company access from the database via `requireRole()` — never trusts the JWT
  claim (see `lib/auth/require-role.ts` and `SPEC.md` §11).
- `proxy.ts` (Next 16's middleware) redirects any unauthenticated request to `/login`.

### 1.3 Identity Source

- TMS (MySQL, read-only) is the system of record for username + password
  (`lib/db/mysql-auth.ts`). This app never stores or checks a real password of its own.
- Role and company scoping are decided locally, in `lib/auth/verify-credentials.ts`, and
  never overwritten by a later TMS sync (see the module's comments and `DECISIONS.md`).

### 1.4 Data Segregation

- Every non-`super_admin` user is locked to exactly one company, derived from their TMS
  `company_id` — never a client-supplied value (`lib/auth/company-access.ts`).
- All server actions that touch company-scoped data call `companyAllowed(actor.companyAccess, companyId)`
  before reading or writing (see call sites in `lib/actions/**`).
- `requireRole()` is the single chokepoint that re-derives role + company access from the
  DB on every server action call.

### 1.5 Input Validation

- Server actions validate inputs before touching the database (see `lib/actions/**`).
- Drizzle's typed query builder is used throughout — no raw string interpolation into SQL.

---

## 2. Automated Security Tests

Test framework: **Vitest** (`vitest.config.ts`). Run with `pnpm test`.

### 2.1 Rate Limiter — `lib/auth/__tests__/rate-limit.test.ts`

Covers `checkLoginRateLimit` (`lib/auth/rate-limit.ts`): first request allowed, up-to-limit
allowed, over-limit denied with `retryAfterSeconds`, independent buckets per key, and
window reset after 15 minutes.

### 2.2 Login / Credential Verification — `lib/auth/__tests__/verify-credentials.test.ts`

Covers `verifyCredentials` (`lib/auth/verify-credentials.ts`) for every outcome:
rate-limited, unknown TMS identity, wrong password, missing scheduling access, deactivated
local account, no local company match, successful login (existing user), and successful
login with first-time provisioning of a TMS `superuser` as `super_admin`.

### 2.3 Authorization — `lib/auth/__tests__/require-role.test.ts`, `company-access.test.ts`

Covers `requireRole` (no session, deactivated/missing user, wrong role, unresolved company
access, success) and `getCompanyAccess`/`companyAllowed` (super_admin, Quest-internal staff,
fixed company match/mismatch, no local company row).

### 2.4 Security Audit Logger — `lib/audit/__tests__/security-log.test.ts`

Covers `logSecurityEvent`, `logLoginSuccess`, `logLoginFailure`, `logUnauthorizedAccess`
(`lib/audit/security-log.ts`) — correct payload shape per event type, and that a failed
insert never throws (best-effort logging).

### 2.5 Security Headers — `lib/__tests__/security-headers.test.ts`

Covers `applySecurityHeaders` (`lib/security/headers.ts`) — full header set present, and
`Strict-Transport-Security` only set when `NODE_ENV=production`.

---

## 3. Security Headers

Applied on every response by `proxy.ts` via `lib/security/headers.ts`:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `X-XSS-Protection` | `1; mode=block` | Legacy reflected-XSS mitigation |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage control |
| `Content-Security-Policy` | `default-src 'self'; ...; frame-ancestors 'none';` | XSS / data injection |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Feature restriction |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` (production only) | HTTPS enforcement |

`proxy.ts`'s matcher excludes `/api/tms-sync` and `/api/tms-booking-import` (server-to-server
webhooks with their own shared-secret auth) — those routes do **not** get these headers from
the proxy today. If they're ever exposed more broadly, add headers directly in those route
handlers.

### Manual verification

```bash
curl -I http://localhost:3000/          # expect X-Frame-Options, CSP, etc.
curl -I https://<production-domain>/ | grep -i strict-transport
```

---

## 4. Security Audit Logging

### 4.1 What's logged, and where

`security_events` (migration `lib/db/migrations/0017_damp_spencer_smythe.sql`) is a
dedicated table for security events — distinct from `booking_events`/`user_role_events`,
which record *business* changes.

| Action | Trigger | Source |
|--------|---------|--------|
| `login` (success) | Any successful sign-in | `verifyCredentials` |
| `login` (failure) | Rate limited, unknown identity, wrong password, no scheduling access, deactivated account, no company access | `verifyCredentials` |
| `unauthorized_access` | `requireRole` rejects a role, or company access can't be resolved | `requireRole` |

Logging is **best-effort** (`lib/audit/security-log.ts`) — a failed insert is caught and
logged to the console; it never blocks or fails the caller's actual request.

### 4.2 Not yet wired up

The many `companyAllowed(...)` checks scattered across `lib/actions/**` (bookings, sites,
publish, undo, admin actions) do **not** currently log to `security_events` when they
reject a cross-company access attempt. Wiring per-resource logging into ~10 action files is
a deliberate follow-up, not done in this pass — see Section 6.

### 4.3 Querying

```sql
-- Failed logins in the last 24 hours
select * from security_events
where action = 'login' and status = 'failure' and at >= now() - interval '24 hours'
order by at desc;

-- Unauthorized access attempts in the last 7 days
select * from security_events
where action = 'unauthorized_access' and at >= now() - interval '7 days'
order by at desc;
```

---

## 5. Manual Security Test Checklist

Run before every release or after any security-critical change.

### 5.1 Authentication

- [ ] Valid TMS credentials for each role log in successfully.
- [ ] Wrong password returns a generic error (no user enumeration).
- [ ] Deactivated local account (`users.deletedAt`) cannot log in.
- [ ] TMS user without `enable_scheduling_access` (and not a TMS superuser) is rejected.
- [ ] 6th login attempt within 15 minutes for the same IP+identifier is rate limited.
- [ ] Session cookie is set by NextAuth (inspect via browser devtools) and is `HttpOnly`.

### 5.2 Authorization

- [ ] A `viewer` cannot reach admin-only server actions (`admin`/`super_admin`-gated).
- [ ] A non-`super_admin` cannot act on another company's units/sites/bookings via
      `companyAllowed` checks (try a crafted `companyId` from devtools).
- [ ] Direct navigation to `/admin/*` while unauthenticated redirects to `/login`.

### 5.3 Headers & Transport

- [ ] `X-Frame-Options: DENY` present on all responses (`curl -I`).
- [ ] `Content-Security-Policy` present.
- [ ] `Strict-Transport-Security` present in production only.

### 5.4 Security Audit Logs

- [ ] Every login (success and failure) appears in `security_events`.
- [ ] Every `requireRole` rejection appears as `unauthorized_access`.
- [ ] Entries include `ip_address`, `user_agent`, and `at` timestamp where available.

### 5.5 Dependency Audit

```bash
pnpm audit
```

Fix critical/high severity before release; triage and document moderate/low.

---

## 6. Follow-Up Work (Not Done in This Pass)

1. **Wire `unauthorized_access` logging into per-resource `companyAllowed` rejections**
   across `lib/actions/**` — currently only `requireRole`'s own role/company checks are
   logged, not the resource-level checks inside individual server actions.
2. **Add an admin-facing view of `security_events`**, similar to the existing
   `app/admin/audit-log` page for `booking_events`.
3. **Session/token tests** — not applicable in the guide's original form (this app uses
   NextAuth's own JWT session, not a custom HMAC scheme), but worth adding a smoke test
   that `proxy.ts` actually redirects an unauthenticated request once a test harness for
   NextAuth-wrapped middleware exists.
4. **External testing** — OWASP ZAP baseline scan, SSL Labs scan, annual penetration test —
   not automated here; schedule per the original guide's §7.

---

## 7. Review Schedule

| Review | Frequency | Owner |
|--------|-----------|-------|
| `pnpm test` (security unit tests) | Every PR | Developer |
| Manual security checklist (Section 5) | Every release | Developer / QA |
| `security_events` review | Quarterly | Whoever owns compliance |
| `pnpm audit` | Monthly | Developer |
| This document | Quarterly | Developer |
