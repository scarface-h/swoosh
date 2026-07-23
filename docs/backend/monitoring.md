# Monitoring

Pino writes JSON application and request logs with request IDs. Authorization/cookie headers are redacted. Sentry captures unhandled errors when `SENTRY_DSN` is configured without default PII. Nginx access logs are JSON.

Recommended alerts: readiness failure for two minutes; 5xx above 2%; checkout conflicts above baseline; repeated admin lockouts; MySQL connections/CPU/replica lag; p95 query and request latency; Redis memory/evictions; low-stock count; notification retry backlog; missed or unverifiable backup. Retain audit logs according to the business compliance policy.
