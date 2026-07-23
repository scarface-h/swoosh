export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'SKU_ALREADY_EXISTS'
  | 'PRODUCT_ARCHIVED'
  | 'VARIANT_NOT_AVAILABLE'
  | 'INSUFFICIENT_STOCK'
  | 'PRICE_CHANGED'
  | 'INVALID_COUPON'
  | 'COUPON_EXPIRED'
  | 'DELIVERY_ZONE_INVALID'
  | 'INVALID_ORDER_TRANSITION'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PAYLOAD_TOO_LARGE'
  | 'ACCOUNT_LOCKED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly fields?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    fields?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(code: ErrorCode, message: string, fields?: Record<string, string[]>) {
    return new AppError(400, code, message, fields);
  }

  static unauthorized(message = 'Authentication required', code: ErrorCode = 'AUTHENTICATION_REQUIRED') {
    return new AppError(401, code, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'RESOURCE_NOT_FOUND', message);
  }

  static conflict(code: ErrorCode, message: string) {
    return new AppError(409, code, message);
  }

  static validation(message: string, fields?: Record<string, string[]>) {
    return new AppError(422, 'VALIDATION_ERROR', message, fields);
  }

  static internal(message = 'An unexpected error occurred') {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
