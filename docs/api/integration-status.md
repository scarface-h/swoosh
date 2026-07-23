# Application integration status

Contract version: **1.0.0**. Base URL: `/api/v1`. Runtime docs: `/api-docs`.

Implemented in the API: customer/admin authentication, public catalogue,
category/collection/search, profile/addresses, guest and customer carts, cart
merge, wishlist, checkout preview, idempotent COD order creation, owned
history/detail/cancellation/returns, secure public tracking, verified reviews,
homepage/settings, contact/newsletter submissions, notification delivery, and
the documented admin management surface.

The storefront uses live product/category data and server-authoritative checkout
and order creation. The admin uses live dashboard, product, order, customer,
store settings, maintenance-mode, and password-change endpoints. Product
creation can create initial stock and upload an image through a signed upload.

Money is returned as decimal strings in authoritative pricing and persisted
order responses. Send `Idempotency-Key` on order creation. Guests must persist
the `X-Guest-Cart-Token` response header and return it on later cart requests.
Access tokens use `Authorization: Bearer`; refresh tokens are Secure, HttpOnly
cookies.

The frontend must never submit or display a client calculation as final. Use
checkout preview and order response totals.

The repository-level build, lint, test, Prisma schema validation, API typecheck,
OpenAPI lint, and dependency audit pass. Remaining launch work is operational:
configure production secrets, change the seeded admin password, verify SMTP,
and complete a real-device checkout smoke test after deployment.
