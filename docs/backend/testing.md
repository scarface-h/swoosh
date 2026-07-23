# Testing

Run `npm test -w apps/api`. Unit coverage includes decimal money behavior, sale selection, coupon calculation, order numbers and status transitions. HTTP tests cover response security, CORS, size limits and auth boundaries.

CI provisions MySQL 8.4 and Redis, validates/generates Prisma, deploys migrations, type-checks, lints, tests, builds, audits dependencies and builds the API image. Transaction/concurrency tests should run against disposable MySQL databases; never point test runs at shared or production data.
