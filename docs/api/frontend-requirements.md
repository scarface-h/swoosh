# Frontend requirements

- Persist guest cart tokens from `X-Guest-Cart-Token`; do not expose them in URLs.
- Send credentials for refresh-cookie requests and use only allowlisted origins.
- Generate one high-entropy idempotency key per checkout intent; reuse it only to retry the identical payload.
- Treat `PRICE_CHANGED`, `INSUFFICIENT_STOCK`, and preview warnings as review-required states.
- Render BDT using `৳` only at presentation time. Do not parse decimal strings through binary floating point for further calculations.
- Admin navigation hiding is UX only; the API independently enforces permissions.
