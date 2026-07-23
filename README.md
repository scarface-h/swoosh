# Swoosh Shop platform

Monorepo for the storefront, admin application and production API. Backend setup and operational documentation begins at [apps/api/README.md](apps/api/README.md) and [docs/backend/architecture.md](docs/backend/architecture.md). Render deployment is documented at [docs/deployment/render.md](docs/deployment/render.md). API integration contracts are in `packages/contracts`, `packages/shared-types` and `docs/api/openapi.yaml`.

For a production-like local backend, copy `.env.example`, set required secrets and run:

```bash
docker compose up --build
```

The Compose stack starts MySQL 8.4, Redis, a one-shot migration job, the API and TLS-enabled Nginx. It generates a short-lived self-signed localhost certificate; production must supply a managed certificate. Direct API development can use `npm run dev:api`.

Run the complete repository quality gate before deployment:

```bash
npm run verify
npm audit --audit-level=high
```

Production deployment requires TiDB, Cloudinary and SMTP credentials. Never
commit `.env` files or paste secrets into source control. After the first
deployment, change the seeded admin password from **Admin > Settings >
Security**.
