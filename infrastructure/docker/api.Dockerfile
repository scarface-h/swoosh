# syntax=docker/dockerfile:1.7
FROM node:22.22-alpine AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/storefront/package.json apps/storefront/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/utilities/package.json packages/utilities/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN npm ci

FROM dependencies AS build
COPY tsconfig.json ./
COPY apps/api ./apps/api
COPY packages ./packages
ENV DATABASE_URL=mysql://build:build@localhost:3306/build
RUN npm run db:generate -w apps/api && npm run build -w apps/api

FROM node:22.22-alpine AS production
ARG APP_VERSION=dev
ENV NODE_ENV=production APP_VERSION=$APP_VERSION
WORKDIR /workspace
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/prisma ./apps/api/prisma
COPY package.json package-lock.json ./
USER nodeapp
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
