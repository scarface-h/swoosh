# Swoosh API

Node.js/TypeScript/Express API backed by MySQL 8.4/TiDB and Prisma. It owns
authentication, catalogue, variant inventory, cart, pricing, checkout, orders,
admin RBAC, uploads, public contact/newsletter submissions, durable email
notifications and audit history.

## Local commands

```bash
cp .env.example .env
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
```

API: `http://localhost:4000/api/v1`; health: `/health`; readiness: `/ready`; Swagger UI: `/api-docs`.

Verification:

```bash
npm run db:validate
npm run typecheck -w apps/api
npm run test -w apps/api
npm run build -w apps/api
```

Production uses `npm run db:deploy` rather than `db push` or a destructive reset.
Prisma configuration lives in `apps/api/prisma.config.ts`.

## Email delivery

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
`EMAIL_FROM`, and `CONTACT_EMAIL`. The API persists messages to a notification
outbox before returning and a background worker delivers them with retries.
Without SMTP configuration, requests remain safe but pending notifications
cannot be sent.

## First admin login

The seed creates the initial administrator. On the first production login, use
**Admin > Settings > Security** to replace the temporary password. Password
changes revoke every existing refresh token and session.

## TiDB Cloud

The TiDB-ready connection template is in `apps/api/tidb.env.example`.

1. Open `apps/api/.env`.
2. Replace its `DATABASE_URL` value with the value from `apps/api/tidb.env.example`.
3. Replace `URL_ENCODED_PASSWORD` with the TiDB password. Percent-encode special
   characters used in the password.
4. From the repository root, validate the configuration:

```bash
npm run db:validate
```

To verify the credentials and TLS connection without changing the schema:

```bash
npm exec --workspace apps/api prisma db pull -- --print
```

Do not commit `apps/api/.env`, the password, or CA certificate files.
