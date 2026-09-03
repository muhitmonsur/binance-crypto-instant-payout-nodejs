import {
  buildQueryString,
  createAuthHeader,
  parseAuthToken,
  safeEqual,
  signPayload,
} from './signature.js';
import type {
  PaymentRequest,
  PaymentResponse,
  PayerurlConfig,
  WebhookPayload,
  WebhookResult,
  WebhookVerifyInput,
} from './types.js';

const DEFAULT_API_URL = 'https://api-v2.payerurl.com/api/payment';

export class Payerurl {
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly apiUrl: string;
  private readonly fetch: typeof globalThis.fetch;

  constructor(config: PayerurlConfig) {
    if (!config?.publicKey || !config?.secretKey) {
      throw new Error(
        'Payerurl requires publicKey and secretKey. Get them at https://dash.payerurl.com/profile/get-api-credentials'
      );
    }

    this.publicKey = config.publicKey;
    this.secretKey = config.secretKey;
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.fetch = config.fetch ?? globalThis.fetch;

    if (typeof this.fetch !== 'function') {
      throw new Error(
        'Payerurl requires a Fetch-compatible runtime (Node.js 18 or newer) or config.fetch'
      );
    }
  }

  /**
   * Create a payment and return a redirect URL to the PayerURL checkout page.
   * Call this from your backend only — never from browser code with secret keys.
   */
  async payment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const {
        invoiceId,
        amount,
        currency = 'usd',
        data,
        orderItems,
        type = 'nodejs',
      } = request;

      if (typeof invoiceId !== 'string' || !invoiceId.trim()) {
        return { status: false, message: 'invoiceId is required' };
      }
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        return { status: false, message: 'amount must be a positive integer' };
      }
      if (!data?.redirect_url || !data?.cancel_url || !data?.notify_url) {
        return {
          status: false,
          message: 'data.redirect_url, data.cancel_url, and data.notify_url are required',
        };
      }

      const items = (orderItems ?? []).map((item) => ({
        name: String(item.name).replace(/ /g, '_'),
        qty: item.qty,
        price: item.price,
      }));

      const args: Record<string, unknown> = {
        order_id: invoiceId,
        amount,
        currency: currency.trim().toLowerCase(),
        billing_fname: data.first_name ?? 'First name',
        billing_lname: data.last_name ?? 'Last name',
        billing_email: data.email ?? 'test@email.com',
        redirect_to: data.redirect_url,
        notify_url: data.notify_url,
        cancel_url: data.cancel_url,
        type,
      };

      if (items.length > 0) {
        args.items = items;
      }

      const query = buildQueryString(args);
      const signature = signPayload(query, this.secretKey);
      const authorization = createAuthHeader(this.publicKey, signature);

      const response = await this.fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Authorization: authorization,
        },
        body: query,
      });

      const httpCode = response.status;
      let body: { redirectTO?: string; [key: string]: unknown } = {};

      try {
        body = (await response.json()) as typeof body;
      } catch {
        return { status: false, message: 'Invalid response from payment API' };
      }

      if (httpCode === 200 && body.redirectTO) {
        return {
          status: true,
          redirectUrl: String(body.redirectTO),
        };
      }

      const apiMessage =
        typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'Something went wrong';

      return { status: false, message: apiMessage };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong';
      return { status: false, message };
    }
  }

  /**
   * Verify an incoming PayerURL webhook (notify) request.
   * Use on your notify_url endpoint (Express, Next.js API route, NestJS, etc.).
   */
  verifyWebhook(input: WebhookVerifyInput): WebhookResult {
    const auth = parseAuthToken(input.authorization, input.authStr);

    if (!auth) {
      return { ok: false, status: 2030, message: 'Authorization not found' };
    }

    if (auth.publicKey !== this.publicKey) {
      return { ok: false, status: 2030, message: "Public key doesn't match" };
    }

    const payload: WebhookPayload = {
      order_id: String(input.body.order_id ?? ''),
      ext_transaction_id:
        input.body.ext_transaction_id !== undefined
          ? String(input.body.ext_transaction_id)
          : undefined,
      transaction_id: String(input.body.transaction_id ?? ''),
      status_code: input.body.status_code as number | string,
      note: input.body.note !== undefined ? String(input.body.note) : undefined,
      confirm_rcv_amnt: input.body.confirm_rcv_amnt as string | number | undefined,
      confirm_rcv_amnt_curr:
        input.body.confirm_rcv_amnt_curr !== undefined
          ? String(input.body.confirm_rcv_amnt_curr)
          : undefined,
      coin_rcv_amnt: input.body.coin_rcv_amnt as string | number | undefined,
      coin_rcv_amnt_curr:
        input.body.coin_rcv_amnt_curr !== undefined
          ? String(input.body.coin_rcv_amnt_curr)
          : undefined,
      txn_time: input.body.txn_time as string | number | undefined,
    };

    if (!payload.transaction_id) {
      return { ok: false, status: 2050, message: 'Transaction ID not found' };
    }

    if (!payload.order_id) {
      return { ok: false, status: 2050, message: 'Order ID not found' };
    }

    const statusCode = Number(payload.status_code);

    if (statusCode === 20000) {
      return { ok: false, status: 20000, message: 'Order Cancelled' };
    }

    if (statusCode !== 200) {
      return { ok: false, status: 2050, message: 'Order not complete' };
    }

    // Sign with the same field set as the Laravel NotifyController (raw body values)
    const signData: Record<string, unknown> = {
      order_id: input.body.order_id,
      ext_transaction_id: input.body.ext_transaction_id,
      transaction_id: input.body.transaction_id,
      status_code: input.body.status_code,
      note: input.body.note,
      confirm_rcv_amnt: input.body.confirm_rcv_amnt,
      confirm_rcv_amnt_curr: input.body.confirm_rcv_amnt_curr,
      coin_rcv_amnt: input.body.coin_rcv_amnt,
      coin_rcv_amnt_curr: input.body.coin_rcv_amnt_curr,
      txn_time: input.body.txn_time,
    };

    const query = buildQueryString(signData);
    const expected = signPayload(query, this.secretKey);

    if (!safeEqual(expected, auth.signature)) {
      return { ok: false, status: 2030, message: 'Signature not matched' };
    }

    return {
      ok: true,
      status: 2040,
      message: payload,
      payload,
    };
  }
}

export default Payerurl;
