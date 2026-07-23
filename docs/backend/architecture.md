# Backend architecture

The API is a modular Express application. Routes validate Zod input, controllers are intentionally thin route handlers, and services own pricing, authentication, inventory and order rules. Prisma is the only database access layer. MySQL is authoritative; Redis is an optional acceleration/coordination layer and is never the only copy of business data.

The central flow is:

`request → security middleware → Zod validation → service → Prisma transaction → response envelope`.

Customer and admin principals use distinct token subjects and cookies. Admin authorization checks permission codes at the API boundary. Pino emits structured request logs with request IDs and redaction. Sentry is initialized only when configured.
