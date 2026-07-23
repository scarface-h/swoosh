# Authentication

Passwords use Argon2id. Access JWTs are short-lived and distinguish `customer` from `admin`. Refresh tokens are opaque random values stored only as SHA-256 hashes. They rotate on every refresh; replay of a consumed token revokes its family. Password changes, suspension and admin changes increment a session version and revoke active refresh tokens.

Refresh cookies are HttpOnly, Secure in production and SameSite Strict. State-changing cookie requests require an allowlisted Origin. Admin login locks an account for 15 minutes after five failures. Production admin passwords must be at least 12 characters; MFA columns are present for a future verified MFA flow.
