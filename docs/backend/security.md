# Security

Controls include Helmet, disabled framework disclosure, strict CORS, Origin-based CSRF defense for cookie requests, JSON size limits, global/auth/checkout rate limits, Zod strict input, Prisma parameterization, Argon2id, JWT subject separation, refresh rotation/reuse detection, session revocation, RBAC, object ownership checks, enumeration-safe password reset, sanitized errors, structured redacted logs, S3 MIME/size allowlists and database-backed idempotency.

Nginx enforces TLS, HSTS, request limits and forwarded-header normalization. Containers run without root privileges where possible, with read-only filesystems and `no-new-privileges`. Secrets belong in the deployment secret manager, never source control.

Run `npm audit --audit-level=high` in CI and keep MySQL, Node and container bases patched.
