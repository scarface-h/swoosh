# Checkout and orders

`POST /api/v1/checkout/preview` and order creation call the same pricing service. The server loads variants, resolves active product/variant sale windows, checks stock, validates coupon limits and selects a configured delivery charge.

`POST /api/v1/orders` requires `Idempotency-Key`. The key stores a request hash; reuse with a changed payload is rejected. A serializable transaction guardedly decrements stock, writes immutable order items, inventory movements, coupon usage, initial history and a COD payment. Any failure rolls back.

Cancellation checks a finite-state transition and writes restoration movements with unique restoration keys. `stockRestoredAt` prevents repeat restoration.
