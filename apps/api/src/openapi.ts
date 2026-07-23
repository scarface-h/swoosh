export const openapiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Swoosh Shop API",
    version: "1.0.0",
    description:
      "Authoritative REST API for the Bangladesh-focused Swoosh Shop platform.",
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      refreshCookie: { type: "apiKey", in: "cookie", name: "refresh_token" },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["success", "error", "requestId"],
        properties: {
          success: { const: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              fields: { type: "object" },
            },
          },
          requestId: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/products": {
      get: {
        summary: "List and filter active products",
        security: [],
        responses: { "200": { description: "Product page" } },
      },
    },
    "/products/{slug}": {
      get: {
        summary: "Product detail and variant matrix",
        security: [],
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Product" } },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register customer",
        security: [],
        responses: { "201": { description: "Created" } },
      },
    },
    "/auth/login": {
      post: {
        summary: "Customer login",
        security: [],
        responses: {
          "200": {
            description: "Access token; refresh token is an HttpOnly cookie",
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Rotate customer refresh token",
        security: [{ refreshCookie: [] }],
        responses: { "200": { description: "New access token" } },
      },
    },
    "/cart": {
      get: {
        summary: "Get customer or guest cart",
        security: [],
        responses: { "200": { description: "Authoritatively repriced cart" } },
      },
    },
    "/checkout/preview": {
      post: {
        summary: "Validate stock, coupon, delivery and authoritative pricing",
        security: [],
        responses: { "200": { description: "Pricing breakdown and warnings" } },
      },
    },
    "/orders": {
      post: {
        summary: "Create a transactional, idempotent COD order",
        security: [],
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string", minLength: 16 },
          },
        ],
        responses: {
          "201": { description: "Order created" },
          "200": { description: "Idempotent replay" },
          "409": { description: "Stock, price or idempotency conflict" },
        },
      },
      get: {
        summary: "Customer order history",
        responses: { "200": { description: "Orders" } },
      },
    },
    "/orders/track": {
      post: {
        summary: "Track with order number plus phone",
        security: [],
        responses: { "200": { description: "Privacy-limited tracking data" } },
      },
    },
    "/admin/auth/login": {
      post: {
        summary: "Admin login with account lockout",
        security: [],
        responses: {
          "200": { description: "Admin access token and permissions" },
        },
      },
    },
    "/admin/auth/change-password": {
      post: {
        summary: "Change the current admin password and revoke all sessions",
        responses: { "200": { description: "Password changed" } },
      },
    },
    "/admin/products": {
      get: {
        summary: "Admin product list",
        responses: { "200": { description: "Products" } },
      },
      post: {
        summary: "Create product",
        responses: { "201": { description: "Product created" } },
      },
    },
    "/admin/products/full": {
      post: {
        summary:
          "Atomically create a product with arbitrary options, variants and initial inventory",
        responses: { "201": { description: "Complete product created" } },
      },
    },
    "/admin/inventory/adjust": {
      post: {
        summary: "Atomically adjust inventory and record movement",
        responses: { "200": { description: "Movement" } },
      },
    },
    "/admin/orders/{id}/status": {
      patch: {
        summary: "Apply a valid order transition",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Order" },
          "409": { description: "Invalid transition" },
        },
      },
    },
    "/admin/uploads/presign": {
      post: {
        summary:
          "Create a signed Cloudinary or S3-compatible image upload request",
        responses: { "200": { description: "Signed upload fields or URL" } },
      },
    },
  },
} as const;
