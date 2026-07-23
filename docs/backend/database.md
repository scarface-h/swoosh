# Database

The Prisma schema is at `apps/api/prisma/schema.prisma`; versioned SQL is under `apps/api/prisma/migrations`.

Money uses `DECIMAL(12,2)`. Product slugs, variant SKUs, order numbers and hashed token keys are unique. Order items retain product, variant, image, option and price snapshots, so historical orders do not depend on mutable catalogue rows. Product/variant references from orders use restrictive or nullable behavior and catalogue removal is implemented as archival.

Apply locally with `npm run db:migrate`; deploy with `npm run db:deploy`. Never use `prisma db push` or schema resets in production. Take and verify a backup before migrations.
