# Render deployment

`render.yaml` defines three services:

- `swoosh-shop-api`: free Node.js web service in Singapore
- `swoosh-shop-store`: storefront static site
- `swoosh-shop-admin`: admin static site

TiDB Cloud remains the database and Cloudinary stores product images. Render's
local filesystem is not used for persistent data.

## 1. Prepare the repository

Push the repository to GitHub. Confirm that no `.env`, password, private key,
or PEM certificate is included. The repository `.gitignore` already excludes
these files.

## 2. Create the Render Blueprint

In Render, select **New > Blueprint**, connect the GitHub repository and use
the root `render.yaml`.

Render prompts for every variable marked `sync: false`. Use:

| Service    | Variable                | Value                                                                           |
| ---------- | ----------------------- | ------------------------------------------------------------------------------- |
| API        | `DATABASE_URL`          | TiDB URL with `sslaccept=strict`; omit the local Windows `sslcert` path         |
| API        | `CORS_ORIGINS`          | `https://swoosh-shop-store.onrender.com,https://swoosh-shop-admin.onrender.com` |
| API        | `STOREFRONT_URL`        | `https://swoosh-shop-store.onrender.com`                                        |
| API        | `ADMIN_URL`             | `https://swoosh-shop-admin.onrender.com`                                        |
| API        | `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                                                           |
| API        | `CLOUDINARY_API_KEY`    | Cloudinary API key                                                              |
| API        | `CLOUDINARY_API_SECRET` | Cloudinary API secret                                                           |
| Storefront | `VITE_API_BASE_URL`     | `https://swoosh-shop-api.onrender.com/api/v1`                                   |
| Admin      | `VITE_API_BASE_URL`     | `https://swoosh-shop-api.onrender.com/api/v1`                                   |

If Render assigns different service subdomains, replace the example URLs with
the actual HTTPS URLs, then redeploy both static sites and the API.

Do not set `COOKIE_DOMAIN` for separate `onrender.com` services. The API uses a
host-only, Secure, HttpOnly refresh cookie. Production cookies use
`SameSite=None`, while strict CORS and Origin validation restrict which
frontends may submit authenticated requests.

## 3. Database migration

Free Render web services do not support pre-deploy commands. The API build
therefore runs:

```text
npm ci --include=dev
npm run db:generate -w apps/api
npm run db:deploy -w apps/api
npm run build -w apps/api
```

Only committed Prisma migrations are deployed. Never use `prisma migrate dev`
or `prisma db push` against the production TiDB database.

For a completely new database, seed it once from a trusted local terminal
after setting the production `DATABASE_URL`:

```powershell
npm.cmd run db:seed
```

Do not place a seed command in every Render build.

## 4. Verify

Open:

```text
https://swoosh-shop-api.onrender.com/health
https://swoosh-shop-api.onrender.com/ready
https://swoosh-shop-store.onrender.com
https://swoosh-shop-admin.onrender.com/login
```

Then verify login, refresh the admin page to confirm session restoration, sign
out, submit a test order, and confirm it in the admin panel.

## Free-tier limitations

The API spins down after 15 minutes without inbound traffic and can take about
one minute to wake. Static sites remain available. The free API filesystem is
ephemeral, which is why images are uploaded directly to Cloudinary using a
short-lived server-generated signature.

Free Render services are appropriate for development, demos and a small
initial launch, not a store that depends on uninterrupted order processing.
