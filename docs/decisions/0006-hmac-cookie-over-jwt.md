# ADR 0006 — HMAC-signed session cookie over JWT

**Status:** Accepted.

## Context

The optional auth flag (K7) needs a short-lived signed session credential delivered as an HttpOnly cookie. JWT is the obvious choice, but `pyjwt` on the target Python distribution collided with a system-packaged `jwt` module, producing a `pyo3_runtime.PanicException` at import time.

## Decision

Hand-roll a minimal signed token using Python's stdlib:

```
<base64-url(json-payload)>.<base64-url(hmac-sha256(secret, payload))>
```

Same semantics as a JWT HS256 (sub, iat, exp), but no external dep. `backend/app/auth.py` implements `_encode_token` / `_decode_token`.

## Consequences

- Zero third-party deps beyond `bcrypt` for password hashing.
- No algorithm negotiation to worry about — no `"none"`-alg attack surface.
- If we later grow more claim-validation logic, switch to `authlib.jose` (better maintained than pyjwt on modern Python). ADR 0006 at that point gets superseded.
- The cookie is HttpOnly, SameSite=Lax, 1-day TTL.

## Alternatives considered

- **pyjwt.** Blocked by the system-package collision in the deployment environment we tested on.
- **itsdangerous URLSafeTimedSerializer.** Equivalent safety; one more dep with a larger API surface than we need for a single use case.
- **Server-side sessions (Redis-backed).** Needed if we ever revoke individual sessions, but the single-user gate here doesn't warrant the complexity.
