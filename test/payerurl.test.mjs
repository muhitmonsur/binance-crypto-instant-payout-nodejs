import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import {
  Payerurl,
  buildQueryString,
  createAuthHeader,
  parseAuthToken,
  safeEqual,
  signPayload,
} from '../dist/index.js';

const publicKey = 'public-key';
const secretKey = 'secret-key';

test('buildQueryString matches PHP http_build_query semantics', () => {
  const query = buildQueryString({
    value: "A B!~*()'",
    truthy: true,
    falsy: false,
    empty: null,
    items: [{ name: 'Hello World', qty: 1, price: '10.00' }],
  });

  assert.equal(
    query,
    'falsy=0&items%5B0%5D%5Bname%5D=Hello+World&items%5B0%5D%5Bqty%5D=1&items%5B0%5D%5Bprice%5D=10.00&truthy=1&value=A+B%21%7E%2A%28%29%27'
  );
});

test('authentication helpers round-trip valid tokens and reject malformed base64', () => {
  const signature = signPayload('amount=1000', secretKey);
  const header = createAuthHeader(publicKey, signature);

  assert.deepEqual(parseAuthToken(header), { publicKey, signature });
  assert.equal(parseAuthToken('Bearer !!!'), null);
  assert.equal(safeEqual(signature, signature), true);
  assert.equal(safeEqual(signature, `${signature}0`), false);
});

test('payment sends a signed Laravel-compatible form request', async () => {
  let captured;
  const client = new Payerurl({
    publicKey,
    secretKey,
    apiUrl: 'https://example.test/payment',
    fetch: async (url, init) => {
      captured = { url, init };
      return {
        status: 200,
        json: async () => ({ redirectTO: 'https://checkout.test/order' }),
      };
    },
  });

  const result = await client.payment({
    invoiceId: 'ORDER 1',
    amount: 1000,
    currency: 'USD',
    data: {
      first_name: 'Alice',
      redirect_url: 'https://shop.test/success',
      cancel_url: 'https://shop.test/cancel',
      notify_url: 'https://shop.test/webhook',
    },
    orderItems: [{ name: 'Test item', qty: 1, price: '10.00' }],
  });

  assert.deepEqual(result, {
    status: true,
    redirectUrl: 'https://checkout.test/order',
  });
  assert.equal(captured.url, 'https://example.test/payment');
  assert.equal(captured.init.method, 'POST');
  assert.match(captured.init.body, /currency=usd/);
  assert.match(captured.init.body, /Test_item/);

  const expectedSignature = createHmac('sha256', secretKey)
    .update(captured.init.body)
    .digest('hex');
  assert.equal(
    captured.init.headers.Authorization,
    createAuthHeader(publicKey, expectedSignature)
  );
});

test('payment validates input and preserves API error messages', async () => {
  const client = new Payerurl({
    publicKey,
    secretKey,
    fetch: async () => ({
      status: 422,
      json: async () => ({ message: 'Unsupported currency' }),
    }),
  });
  const data = {
    redirect_url: 'https://shop.test/success',
    cancel_url: 'https://shop.test/cancel',
    notify_url: 'https://shop.test/webhook',
  };

  assert.deepEqual(await client.payment({ invoiceId: '1', amount: 0, data }), {
    status: false,
    message: 'amount must be a positive integer',
  });
  assert.deepEqual(await client.payment({ invoiceId: '1', amount: 1, data }), {
    status: false,
    message: 'Unsupported currency',
  });
});

test('verifyWebhook accepts correctly signed payloads and rejects tampering', () => {
  const client = new Payerurl({ publicKey, secretKey, fetch: async () => undefined });
  const body = {
    order_id: 'ORDER-1',
    ext_transaction_id: 'EXT-1',
    transaction_id: 'TX-1',
    status_code: '200',
    note: 'Paid',
    confirm_rcv_amnt: '10.00',
    confirm_rcv_amnt_curr: 'USD',
    coin_rcv_amnt: '9.95',
    coin_rcv_amnt_curr: 'USDT',
    txn_time: '1700000000',
  };
  const signature = signPayload(buildQueryString(body), secretKey);
  const authorization = createAuthHeader(publicKey, signature);

  const verified = client.verifyWebhook({ authorization, body });
  assert.equal(verified.ok, true);
  assert.equal(verified.status, 2040);
  assert.deepEqual(verified.payload, body);

  assert.deepEqual(
    client.verifyWebhook({ authorization, body: { ...body, note: 'Changed' } }),
    { ok: false, status: 2030, message: 'Signature not matched' }
  );
});
