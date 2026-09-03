# Binance Crypto Instant Payout for Node.js

[![npm version](https://img.shields.io/npm/v/binance-crypto-instant-payout-nodejs.svg)](https://www.npmjs.com/package/binance-crypto-instant-payout-nodejs)
[![npm downloads](https://img.shields.io/npm/dm/binance-crypto-instant-payout-nodejs.svg)](https://www.npmjs.com/package/binance-crypto-instant-payout-nodejs)
[![license](https://img.shields.io/npm/l/binance-crypto-instant-payout-nodejs.svg)](LICENSE)

Server-side SDK for connecting **Node.js** applications to PayerURL's non-custodial cryptocurrency checkout. Use it with Express, Next.js, NestJS, Nuxt, or any Node backend serving React, Vue, Angular, and other frontends.

> Accept Bitcoin, Ethereum, USDT, USDC, TON, Binance Pay, and other supported payment methods, with settlement directed to your configured wallet or Binance account.

**Powered by [PayerURL](https://payerurl.com)**

🔴 [CHECKOUT DEMO](https://plugin.payerurl.com/) | 🔑 [Get API Key](https://dash.payerurl.com) | 💬 [Telegram Support](https://t.me/Payerurl)

---

## Overview

PayerURL connects your application to a hosted cryptocurrency checkout while keeping settlement non-custodial. PayerURL does not hold your private keys or merchant funds: customers pay through the hosted checkout and completed payments are confirmed to your application through a signed webhook.

Depending on the wallets and payment methods enabled in your PayerURL account, the checkout can provide:

- Bitcoin, Ethereum, USDT, USDC, TON, Binance Pay, and Binance QR payments
- More than 10 cryptocurrency networks, including TRC20, ERC20, and BEP20 options
- Prices in 169+ fiat currencies with live fiat-to-crypto conversion
- Card or bank payment options that settle to the merchant in cryptocurrency, where available
- XPUB-based address rotation for generating a fresh receiving address per order
- Direct settlement to a configured wallet, hardware wallet, cold storage, or Binance account

Payment methods, currencies, networks, and regional availability are controlled by PayerURL and your account configuration. This SDK creates checkout sessions and verifies callbacks; wallet and XPUB configuration is managed in the [PayerURL dashboard](https://dash.payerurl.com).

---

## Why use PayerURL with Node.js?

| Feature | Detail |
|---|---|
| Non-custodial settlement | Payments are routed to the wallet or Binance account configured by the merchant |
| Framework-independent | Works in Node.js server routes, controllers, services, and serverless functions with a Node runtime |
| Signed requests and webhooks | HMAC-SHA256 signing is built into the SDK |
| Hosted checkout | Your backend receives a checkout URL and redirects the customer |
| Live conversion | Local fiat prices are converted to the selected cryptocurrency at checkout |
| XPUB-ready | Rotating receiving addresses can be configured in the PayerURL dashboard |
| No runtime dependencies | The published SDK uses the Node.js platform APIs |

---

## Install

Requires Node.js 18 or newer.

### npm

```bash
npm install binance-crypto-instant-payout-nodejs
```

### Yarn

```bash
yarn add binance-crypto-instant-payout-nodejs
```

### pnpm

```bash
pnpm add binance-crypto-instant-payout-nodejs
```

### Import

ES modules and TypeScript:

```js
import { Payerurl } from 'binance-crypto-instant-payout-nodejs';
```

CommonJS:

```js
const { Payerurl } = require('binance-crypto-instant-payout-nodejs');
```

---

## Important: server-side only

This package uses your **secret key** for HMAC signing.  
**Do not** import it in browser React / Vue / Angular code.

| Layer | What to do |
|---|---|
| Backend (Express, Next API, Nest, Nuxt server) | Create payment + verify webhook with this SDK |
| Frontend (React, Vue, Angular) | Call your API → redirect user to `redirectUrl` |

---

## Environment

```env
PAYERURL_PUBLIC_KEY=your_public_key
PAYERURL_SECRET_KEY=your_secret_key
```

Get keys: https://dash.payerurl.com/profile/get-api-credentials

Most frameworks load `.env` files automatically. For a plain Node.js application, Node 20.6+ can load the file directly:

```bash
node --env-file=.env server.js
```

Fail fast when credentials are missing instead of starting a payment server with an invalid configuration:

```js
const { PAYERURL_PUBLIC_KEY, PAYERURL_SECRET_KEY } = process.env;

if (!PAYERURL_PUBLIC_KEY || !PAYERURL_SECRET_KEY) {
  throw new Error('Missing PayerURL API credentials');
}
```

---

## Quick start

```js
import { Payerurl } from 'binance-crypto-instant-payout-nodejs';

const payerurl = new Payerurl({
  publicKey: process.env.PAYERURL_PUBLIC_KEY,
  secretKey: process.env.PAYERURL_SECRET_KEY,
});

const result = await payerurl.payment({
  invoiceId: `ORD-${Date.now()}`,
  amount: 1000, // cents / smallest unit
  currency: 'usd',
  data: {
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@example.com',
    redirect_url: 'https://yourdomain.com/success',
    cancel_url: 'https://yourdomain.com/checkout',
    notify_url: 'https://yourdomain.com/api/payerurl/notify', // required
  },
  orderItems: [
    { name: 'Order_item_name', qty: 1, price: '10.00' },
  ],
});

if (result.status) {
  // Redirect customer to hosted checkout
  console.log(result.redirectUrl);
} else {
  console.error(result.message);
}
```

Unlike the Laravel package, **you must pass `notify_url`** — there is no auto-registered route in Node.

---

## Webhook verification

```js
const result = payerurl.verifyWebhook({
  authorization: req.headers.authorization,
  authStr: req.body?.authStr, // fallback if Authorization header missing
  body: req.body,
});

if (result.ok) {
  const { order_id, transaction_id } = result.payload;
  // mark order paid
  res.json({ status: 2040, message: result.payload });
} else {
  res.status(400).json({ status: result.status, message: result.message });
}
```

---

## Framework examples

### Express

```js
import express from 'express';
import { Payerurl } from 'binance-crypto-instant-payout-nodejs';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const payerurl = new Payerurl({
  publicKey: process.env.PAYERURL_PUBLIC_KEY,
  secretKey: process.env.PAYERURL_SECRET_KEY,
});

app.post('/api/pay', async (req, res) => {
  const result = await payerurl.payment({
    invoiceId: `ORD-${Date.now()}`,
    amount: Number(req.body.amount),
    currency: 'usd',
    data: {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      redirect_url: 'https://yourdomain.com/success',
      cancel_url: 'https://yourdomain.com/checkout',
      notify_url: 'https://yourdomain.com/api/payerurl/notify',
    },
  });

  if (result.status) return res.json({ redirectUrl: result.redirectUrl });
  return res.status(400).json({ error: result.message });
});

app.post('/api/payerurl/notify', (req, res) => {
  const result = payerurl.verifyWebhook({
    authorization: req.headers.authorization,
    authStr: req.body?.authStr,
    body: req.body,
  });

  if (!result.ok) {
    return res.status(400).json({ status: result.status, message: result.message });
  }

  // update order: result.payload.order_id
  return res.json({ status: result.status, message: result.payload });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

### React / Vue / Angular (frontend)

Frontend only redirects after your backend returns the URL:

```js
// React / Vue / Angular service
async function payWithCrypto(order) {
  const res = await fetch('/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  const data = await res.json();
  if (data.redirectUrl) {
    window.location.href = data.redirectUrl;
  }
}
```

### Next.js (App Router API route)

```ts
// app/api/pay/route.ts
import { Payerurl } from 'binance-crypto-instant-payout-nodejs';
import { NextResponse } from 'next/server';

const payerurl = new Payerurl({
  publicKey: process.env.PAYERURL_PUBLIC_KEY!,
  secretKey: process.env.PAYERURL_SECRET_KEY!,
});

export async function POST(req: Request) {
  const body = await req.json();
  const result = await payerurl.payment({
    invoiceId: body.invoiceId,
    amount: body.amount,
    currency: body.currency || 'usd',
    data: {
      ...body.customer,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payerurl/notify`,
    },
  });

  return NextResponse.json(result);
}
```

```ts
// app/api/payerurl/notify/route.ts
import { Payerurl } from 'binance-crypto-instant-payout-nodejs';
import { NextResponse } from 'next/server';

const payerurl = new Payerurl({
  publicKey: process.env.PAYERURL_PUBLIC_KEY!,
  secretKey: process.env.PAYERURL_SECRET_KEY!,
});

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await req.json()
    : Object.fromEntries(new URLSearchParams(await req.text()));

  const result = payerurl.verifyWebhook({
    authorization: req.headers.get('authorization'),
    authStr: body.authStr,
    body,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: result.status, message: result.message },
      { status: 400 }
    );
  }

  // update order from result.payload
  return NextResponse.json({ status: result.status, message: result.payload });
}
```

### NestJS

```ts
import { Injectable } from '@nestjs/common';
import { Payerurl } from 'binance-crypto-instant-payout-nodejs';

@Injectable()
export class PaymentService {
  private client = new Payerurl({
    publicKey: process.env.PAYERURL_PUBLIC_KEY!,
    secretKey: process.env.PAYERURL_SECRET_KEY!,
  });

  createPayment(input: Parameters<Payerurl['payment']>[0]) {
    return this.client.payment(input);
  }

  handleNotify(authorization: string | undefined, body: Record<string, unknown>) {
    return this.client.verifyWebhook({ authorization, body, authStr: body.authStr as string });
  }
}
```

---

## API

### `new Payerurl(config)`

| Option | Type | Required | Description |
|---|---|---|---|
| `publicKey` | string | Yes | API public key |
| `secretKey` | string | Yes | API secret key (server only) |
| `apiUrl` | string | No | Default `https://api-v2.payerurl.com/api/payment` |
| `fetch` | function | No | Custom Fetch-compatible transport |

The constructor throws if either API key is missing. Keep both credentials in server-side environment variables; never send the secret key to a browser.

### `payment(request)`

| Field | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | string | Yes | Unique order ID |
| `amount` | number | Yes | Amount in smallest unit |
| `currency` | string | No | Default `usd` |
| `data` | object | Yes | Customer and callback information |
| `data.first_name` | string | No | Customer first name |
| `data.last_name` | string | No | Customer last name |
| `data.email` | string | No | Customer email address |
| `data.notify_url` | string | Yes | Webhook URL |
| `data.redirect_url` | string | Yes | Success redirect |
| `data.cancel_url` | string | Yes | Cancel redirect |
| `orderItems` | array | No | Checkout line items |
| `type` | string | No | Integration identifier; default `nodejs` |

Each `orderItems` entry accepts:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Product name; spaces are converted to underscores |
| `qty` | number or string | Yes | Quantity |
| `price` | number or string | Yes | Item price |

**Success:** `{ status: true, redirectUrl: '...' }`

**Error:** `{ status: false, message: '...' }`

`payment()` resolves to a result object for API, validation, and network failures. Check `result.status` before using `redirectUrl`.

### `verifyWebhook({ authorization, authStr, body })`

**Success:** `{ ok: true, status: 2040, payload }`

**Failure:** `{ ok: false, status, message }`

| Input | Required | Description |
|---|---|---|
| `authorization` | Preferred | Raw `Authorization` header, normally `Bearer ...` |
| `authStr` | Fallback | Base64 token supplied in the request body when the header is unavailable |
| `body` | Yes | Parsed JSON or URL-encoded webhook fields |

Application status codes returned by webhook verification:

| Status | Meaning |
|---|---|
| `2040` | Signature is valid and the order is complete |
| `2030` | Authorization, public key, or signature validation failed |
| `2050` | Required order data is missing or the order is not complete |
| `20000` | Order was cancelled |

Only fulfill an order when `result.ok === true`. Store the `transaction_id` and make webhook processing idempotent so a repeated callback cannot fulfill an order twice.

### Utility exports

Advanced integrations may also import `buildQueryString`, `signPayload`, `createAuthHeader`, `parseAuthToken`, and `safeEqual`. Most applications should use `payment()` and `verifyWebhook()` rather than assembling signatures manually.

---

## Production checklist

- Keep `PAYERURL_SECRET_KEY` on the server and out of frontend bundles and public logs.
- Serve `notify_url`, `redirect_url`, and `cancel_url` over HTTPS in production.
- Verify every webhook before changing an order or delivering a product.
- Match the webhook `order_id` to an existing order and verify the expected amount and currency in your own database.
- Make webhook handling idempotent by recording processed transaction IDs.
- Return a response promptly, then move slow fulfillment work to a queue where appropriate.

---

## Payment flow

```
Your Node API → PayerURL API → Checkout Page → Customer Pays (Binance/Crypto)
                                                       ↓
Your Wallet ← Funds ← Blockchain confirmation
                                                       ↓
              Your notify_url ← Webhook (verify with SDK)
```

---

## Supported cryptocurrencies and payment methods

The hosted checkout exposes the methods enabled for your PayerURL account.

| Currency or method | Network or behavior |
|---|---|
| Bitcoin (BTC) | Bitcoin network; XPUB address rotation can be configured |
| Ethereum (ETH) | Ethereum/ERC20 receiving wallet |
| USDT | TRC20, ERC20, and supported BEP20 options |
| USDC | ERC20 and supported BEP20 options |
| TON | The Open Network |
| Binance Pay | Binance account payment and QR scan-to-pay |
| Card or bank | Fiat payment converted to cryptocurrency, where available |

### XPUB wallet integration

Add a supported extended public key (`xpub`, `ypub`, or `zpub`) in the PayerURL dashboard to derive a unique receiving address for each order. This avoids address reuse and supports high-volume checkout without exposing a private key to this SDK. Address derivation and supported HD wallet paths are handled by PayerURL, not by your Node application.

### Binance Pay and QR checkout

Customers can complete a payment by scanning the Binance QR code shown on the hosted checkout. Settlement goes to the Binance account connected in your PayerURL configuration. Binance personal and merchant configurations may be available depending on the account.

### Fiat-to-crypto checkout

Where enabled, customers can pay by supported credit card, debit card, or bank method while the merchant receives cryptocurrency. Conversion uses the checkout's live market rate. Availability and compliance requirements vary by country, provider, and PayerURL account.

---

## Support

| Channel | Link |
|---|---|
| Telegram | [t.me/Payerurl](https://t.me/Payerurl) |
| Website | [payerurl.com](https://payerurl.com) |
| Dashboard | [dash.payerurl.com](https://dash.payerurl.com) |
| WordPress integration | [ABC Crypto Checkout on WordPress.org](https://wordpress.org/plugins/payerurl-crypto-currency-payment-gateway-for-woocommerce/) |

## License

MIT
