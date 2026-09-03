export interface PayerurlConfig {
  /** Public API key from https://dash.payerurl.com/profile/get-api-credentials */
  publicKey: string;
  /** Secret API key — keep on the server only; never expose in browser bundles */
  secretKey: string;
  /** Payment API endpoint (default: https://api-v2.payerurl.com/api/payment) */
  apiUrl?: string;
  /** Optional Fetch-compatible transport, useful for tests or custom runtimes. */
  fetch?: typeof globalThis.fetch;
}

export interface OrderItem {
  /** Product name — spaces must be replaced with `_` */
  name: string;
  qty: number | string;
  price: string | number;
}

export interface PaymentCustomerData {
  first_name?: string;
  last_name?: string;
  email?: string;
  /** After successful payment customer is redirected here */
  redirect_url: string;
  /** If user cancels payment they are redirected here */
  cancel_url: string;
  /**
   * Webhook URL — PayerURL POSTs payment details here after checkout.
   * Required in Node (unlike Laravel package which auto-registers a route).
   */
  notify_url: string;
}

export interface PaymentRequest {
  /** Unique order / invoice ID */
  invoiceId: string;
  /** Amount in smallest unit (e.g. cents for USD) */
  amount: number;
  /** Fiat currency code in lowercase (default: usd) */
  currency?: string;
  data: PaymentCustomerData;
  /** Optional line items */
  orderItems?: OrderItem[];
  /** Internal type flag sent to API (default: nodejs) */
  type?: string;
}

export interface PaymentSuccess {
  status: true;
  redirectUrl: string;
}

export interface PaymentError {
  status: false;
  message: string;
}

export type PaymentResponse = PaymentSuccess | PaymentError;

export interface WebhookPayload {
  order_id: string;
  ext_transaction_id?: string;
  transaction_id: string;
  status_code: number | string;
  note?: string;
  confirm_rcv_amnt?: string | number;
  confirm_rcv_amnt_curr?: string;
  coin_rcv_amnt?: string | number;
  coin_rcv_amnt_curr?: string;
  txn_time?: string | number;
}

export interface WebhookVerifyInput {
  /** Raw Authorization header value, e.g. "Bearer xxx" */
  authorization?: string | null;
  /** Fallback when Authorization header is missing (authStr body/query field) */
  authStr?: string | null;
  /** Parsed webhook body fields */
  body: Partial<WebhookPayload> & Record<string, unknown>;
}

export interface WebhookSuccess {
  ok: true;
  status: 2040;
  message: WebhookPayload;
  payload: WebhookPayload;
}

export interface WebhookFailure {
  ok: false;
  status: number;
  message: string;
}

export type WebhookResult = WebhookSuccess | WebhookFailure;
