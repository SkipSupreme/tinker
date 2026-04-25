# Pre-flight tasks for signup + auth v1

These are the only steps that require you (account dashboards, dashboards I can't log into). Everything else I do in code.

Once everything below is checked off, paste the values back to me and I run the rest.

---

## 1. Google OAuth app

1. Go to https://console.cloud.google.com/apis/credentials
2. Pick or create a project (e.g. "Tinker").
3. Click **+ CREATE CREDENTIALS** → **OAuth client ID**.
4. If prompted, configure the OAuth consent screen first:
   - User type: **External**
   - App name: **Tinker**
   - User support email: your email
   - Developer contact: your email
   - Scopes: leave defaults (email, profile, openid)
   - Test users: add your own email
5. Application type: **Web application**
6. Name: **Tinker (web)**
7. Authorized JavaScript origins:
   - `https://learntinker.com`
   - `http://localhost:4321`
8. Authorized redirect URIs:
   - `https://learntinker.com/api/auth/callback/google`
   - `http://localhost:4321/api/auth/callback/google`
9. Click **Create**. Copy:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 2. GitHub OAuth app

1. Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Application name: **Tinker**
3. Homepage URL: `https://learntinker.com`
4. Authorization callback URL: `https://learntinker.com/api/auth/callback/github`
5. Click **Register application**.
6. On the next page, click **Add another callback URL** and add `http://localhost:4321/api/auth/callback/github`. Click **Update application**.
7. Click **Generate a new client secret**. Copy:

```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

## 3. Resend (transactional + marketing email)

1. Sign up at https://resend.com
2. **Domains** → **Add Domain** → enter `learntinker.com`
3. Resend gives you 3–4 DNS records (SPF, DKIM, DMARC). Add each one to Cloudflare:
   - Cloudflare dashboard → **learntinker.com** → **DNS** → **Records** → **Add record**
   - For each Resend record: copy Type, Name, Content/Value exactly. **Set "Proxy status" to DNS only (grey cloud), not Proxied.**
4. Click **Verify DNS Records** in Resend. Verification can take a few minutes; sometimes longer if Cloudflare is slow to propagate. The page will say "Verified" with a green checkmark when done.
5. **API Keys** → **Create API Key** → name it **tinker-prod**, permission **Full access**, domain **learntinker.com**.
6. Copy:

```
RESEND_API_KEY=
```

> If verification stalls past 30 minutes, the most common culprit is the proxied (orange-cloud) toggle in Cloudflare. SPF/DKIM/DMARC must be DNS-only.

---

## 4. Cloudflare Turnstile (invisible bot check on signup form)

1. Cloudflare dashboard → **Turnstile** → **Add site**
2. Site name: **Tinker signup**
3. Domains: `learntinker.com`, `localhost`
4. Widget mode: **Invisible**
5. Click **Create**. Copy:

```
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

---

## 5. Generate two random secrets locally

In any terminal:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Copy:

```
BETTER_AUTH_SECRET=        # first openssl output
UNSUBSCRIBE_HMAC_SECRET=   # second openssl output
```

---

## 6. Hand the values back

Paste this filled-in block into the chat. I'll write it to `apps/docs/.dev.vars` (gitignored, local dev) AND set production secrets via `wrangler secret put`.

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
RESEND_API_KEY=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
BETTER_AUTH_SECRET=
UNSUBSCRIBE_HMAC_SECRET=
```

> ⚠️ Don't commit any of these. The `.dev.vars` file is already in `.gitignore` via the `.env*` pattern.

---

## What you DON'T have to do

- D1 database creation (I run `wrangler d1 create tinker`)
- Any code, schema, migration, route, component, test
- Domain DNS for the site itself (already set up)
- Any deploy step
- Bootstrap your admin role — I do that with one SQL line after your first signup

---

## Where this fits in the build

After you hand me the values from Step 6, I run the full implementation plan (`docs/plans/2026-04-24-signup-and-auth-implementation.md`) end-to-end: foundation → auth backbone → UI → progress → bookmarks → notes → exercises → admin UI → waitlist replacement → tests → deploy → merge to main.

I check in only when something needs your judgment (a design tradeoff, a "should we ship this part of the spec or simplify?" decision).
