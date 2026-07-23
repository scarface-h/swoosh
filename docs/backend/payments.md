# Payments

Cash on Delivery is the only enabled production method. Each order receives a `Payment` row with provider `CASH_ON_DELIVERY` and pending status. `PaymentAttempt` and provider reference fields support future gateways and webhook attempt histories.

Online providers must implement create, verify, webhook, refund and status operations with signature verification and idempotent webhook handling. Never infer payment success from a browser redirect and never simulate online success in production.
