# Inventory

Stock belongs to variants. Every change is paired with an `InventoryMovement` containing type, signed quantity, previous/new values, reason, actor/order and time. Admin adjustments and checkout use transactions and reject any result below zero.

Checkout uses conditional `updateMany` with `stock >= requested`, which makes concurrent final-item purchases safe: only one decrement succeeds. Cancellation restoration is idempotent. Low/out-of-stock queries use indexes on stock and active state.
