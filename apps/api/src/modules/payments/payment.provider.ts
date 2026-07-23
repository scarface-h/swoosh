export interface PaymentProvider {
  readonly code: string;
  createPayment(input: { orderId: string; amount: string; currency: 'BDT' }): Promise<{ providerReference?: string; status: string }>;
  verifyPayment(reference: string): Promise<{ verified: boolean; status: string }>;
  handleWebhook(headers: Record<string, string | undefined>, rawBody: Buffer): Promise<{ reference: string; status: string }>;
  refundPayment(reference: string, amount: string): Promise<{ refundReference: string; status: string }>;
  getPaymentStatus(reference: string): Promise<string>;
}

export class CashOnDeliveryProvider implements PaymentProvider {
  readonly code = 'CASH_ON_DELIVERY';
  async createPayment() { return { status: 'PENDING' }; }
  async verifyPayment() { return { verified: false, status: 'PENDING' }; }
  async handleWebhook(): Promise<never> { throw new Error('Cash on Delivery does not accept webhooks'); }
  async refundPayment(): Promise<never> { throw new Error('Cash on Delivery refunds require an explicit admin record'); }
  async getPaymentStatus() { return 'PENDING'; }
}
