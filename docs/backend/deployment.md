# Deployment

1. Provision MySQL 8.4, Redis and S3-compatible storage using private networking.
2. Store every `.env.example` secret in the platform secret manager.
3. Take a verified database backup.
4. Build the immutable API image.
5. Run `npm run db:deploy -w apps/api` as a one-shot migration job.
6. Start API replicas and verify `/health`, `/ready`, `/version`.
7. Terminate TLS at Nginx or the platform load balancer and run smoke checkout against a non-production test product.

Compose generates a short-lived self-signed localhost certificate for local use. Production must replace that certificate volume/configuration with certificates from the approved certificate manager.

Required alerts: readiness/uptime, 5xx and checkout error rate, repeated failed admin logins, slow database queries, low inventory, queue failures and backup failures. Production deployment hooks are intentionally credential-free; connect the CI artifact to the organization’s approved deployment environment.
