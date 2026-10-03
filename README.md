#  Crypto gateway || Binance API ( do not need merchant account) || all instant payout  

[![npm version](https://img.shields.io/npm/v/binance-crypto-instant-payout-nodejs.svg)](https://www.npmjs.com/package/binance-crypto-instant-payout-nodejs)
[![npm downloads](https://img.shields.io/npm/dm/binance-crypto-instant-payout-nodejs.svg)](https://www.npmjs.com/package/binance-crypto-instant-payout-nodejs)
[![license](https://img.shields.io/npm/l/binance-crypto-instant-payout-nodejs.svg)](LICENSE)

Server-side SDK for connecting **Node.js** applications through payerurl api . Use it with Express, Next.js, NestJS, Nuxt, or any Node backend serving React, Vue, Angular, and other frontends.

> Get paid directly to your crypto wallet instantly. Accept BTC, ETH, USDT, and USDC from customers across all major networks.
> Accept payment using your binance regular account QR code payment (C2C). 

**Powered by [PayerURL](https://payerurl.com)**

 🔑 [Get API Key](https://dash.payerurl.com) | 💬 [Telegram Support](https://t.me/Payerurl)

---

## Overview

This payment gateway lets customers pay directly on your store's checkout page. Once paid, the order automatically confirms via instant webhooks. Store owners can view complete transaction records in their PayerURL dashboard. PayerURL is safe, secure, and uses real-time exchange rates.

Depending on your PayerURL settings, your checkout offers:

- Popular Cryptos: Accepts Bitcoin, Ethereum, USDT, and USDC.
- Major Networks: Works on TRON (TRC20), Ethereum (ERC20), Binance Smart Chain (BEP20), and Bitcoin networks.
- Binance QR Code: Customers can pay by scanning a QR code with a personal Binance account—no merchant account needed.
- Global Currencies: Supports 169+ local currencies with automatic, live conversion to crypto.
- Card Payments: Options to buy crypto and pay instantly using credit cards, debit cards, Google Pay, or Apple Pay.
- New Address Per Order: Creates a unique receiving address for every order using XPUB to keep payments private and secure.

---


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

## Support

| Channel | Link |
|---|---|
| Telegram | [t.me/Payerurl](https://t.me/Payerurl) |
| Website | [payerurl.com](https://payerurl.com) |
| Dashboard | [dash.payerurl.com](https://dash.payerurl.com) |

## License

MIT
