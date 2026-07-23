# Frontend integration status

Contract version: **1.0.0**. Base URL: `/api/v1`. Runtime docs: `/api-docs`.

Implemented: customer/admin authentication, public catalogue, category/collection/search, profile/addresses, guest and customer carts, cart merge, wishlist, checkout preview, idempotent COD order creation, owned history/detail/cancellation/returns, secure public tracking, verified reviews, homepage/settings, and the documented admin management surface.

Money is returned as decimal strings in authoritative pricing and persisted order responses. Send `Idempotency-Key` on order creation. Guests must persist the `X-Guest-Cart-Token` response header and return it on later cart requests. Access tokens use `Authorization: Bearer`; refresh tokens are HttpOnly cookies.

The frontend must never submit or display a client calculation as final. Use checkout preview and order response totals.

## Frontend-owned blockers observed during repository verification

Both `apps/storefront` and `apps/admin` currently fail their own `tsc -b` because their referenced `tsconfig.node.json` files are not valid composite project references. Their lint scripts also invoke ESLint 9 without a flat `eslint.config.js`. Backend ownership rules prohibit changing those paths; Agent 1 must correct them before the monorepo-wide `npm run build` and `npm run lint` can be green. Backend-specific checks are green.
