# Passkey sign-in: proposal (M8), waiting for approval

The brief asks for a short proposal on how a passkey login becomes a Supabase session **before** any code is written. Nothing for passkeys is implemented yet. The `passkeys` table already exists in the first migration so this can be added without schema changes.

## The problem

Supabase Auth has no passkey login. After a passkey check succeeds on our server, we still need to hand the browser a real Supabase session, so that Row Level Security, Realtime and the rest keep working exactly as they do for a password login.

## Recommended approach: verify with SimpleWebAuthn, then mint the session with Supabase's own one-time token

1. **Enrolment** (signed-in customer only, offered once after their first successful password login: "Use fingerprint or Face ID next time?"):
   - Server action creates registration options with `@simplewebauthn/server` (`rpID` = the customer domain, `userVerification: "required"`, resident key preferred).
   - The challenge is kept in a short-lived (5 minute), signed, `httpOnly` cookie, never in the page.
   - On the browser's response the server verifies it and stores `credential_id`, `public_key`, `counter` and `transports` in `passkeys`.
2. **Sign-in** ("Use fingerprint or Face ID" on `/login`):
   - Server returns authentication options (discoverable credential, so no email needed first).
   - Browser signs the challenge; server looks up the credential, verifies the assertion, and checks and updates the signature `counter`.
3. **Session**: with the user id from the verified credential, the server (service role, server only) calls `auth.admin.generateLink({ type: "magiclink", email })` and immediately redeems the returned `hashed_token` with `auth.verifyOtp({ token_hash, type: "magiclink" })` on the normal cookie-bound server client. That sets the standard Supabase cookies. No email is sent and the link is never shown to anyone.
4. Email and password always stay available as the fallback. Passkeys are customers only; the owner dashboard stays email and password.

## Why this one

| Option | Verdict |
| --- | --- |
| `generateLink` + `verifyOtp` (above) | Uses supported Supabase APIs only, produces a genuine session with refresh tokens, no secrets copied around. **Recommended.** |
| Mint our own JWT with the project JWT secret | Works, but needs the signing secret in app code and replaces Supabase's refresh logic. More to get wrong. |
| Third-party / custom OIDC provider in front of Supabase | Heavy for one feature. |

## Risks and how they are handled

- **Account takeover if the server step is skipped**: the session is created only after a successful, server-side assertion check. The route is rate-limited, and the service-role key never leaves the server.
- **Replay**: single-use challenges, counter check, origin and `rpID` pinned to the production domain.
- **Domain changes**: passkeys are bound to the domain, so changing it later means customers re-enrol. Fix the customer domain before launch.
- **Email must exist**: every customer account has one (sign-up requires it), which `generateLink` needs.
- **Lockout**: customers can list and remove passkeys under Account, and password sign-in is never disabled.
- **iOS/Android**: works in Safari and Chrome; installed PWAs use the same platform authenticator.

## Work once approved

About one milestone: two server actions plus two route handlers, a small enrol prompt, a "Use fingerprint or Face ID" button on `/login`, a passkey list under Account, and Playwright coverage with a virtual authenticator.

**Decision needed:** approve this approach, or ask for the alternative.
