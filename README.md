# @payerurl/crypto-checkout

Binance & crypto payment gateway SDK for **Node.js** — use with Express, Next.js, NestJS, Nuxt, or any backend behind React / Vue / Angular.

> Accept Bitcoin, USDT, USDC, ETH, and Binance payments directly into your wallet.

**Powered by [PayerURL](https://payerurl.com)**

🔴 [LIVE DEMO](https://laravel.payerurl.com/) | 🔑 [Get API Key](https://dash.payerurl.com) | 💬 [Telegram Support](https://t.me/Payerurl)

---

## Install

```bash
npm install @payerurl/crypto-checkout
```

Local development (this repo):

```bash
cd cripto-node
npm install
npm run build
```

Then in your app:

```bash
npm install /path/to/binance-and-crypto-checkout/cripto-node
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

---

## Quick start

```js
import { Payerurl } from '@payerurl/crypto-checkout';

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
import { Payerurl } from '@payerurl/crypto-checkout';

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
import { Payerurl } from '@payerurl/crypto-checkout';
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
import { Payerurl } from '@payerurl/crypto-checkout';
import { NextResponse } from 'next/server';

const payerurl = new Payerurl({
  publicKey: process.env.PAYERURL_PUBLIC_KEY!,
  secretKey: process.env.PAYERURL_SECRET_KEY!,
});

export async function POST(req: Request) {
  const body = await req.json().catch(async () => {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text));
  });

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
import { Payerurl } from '@payerurl/crypto-checkout';

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

### `payment(request)`

| Field | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | string | Yes | Unique order ID |
| `amount` | number | Yes | Amount in smallest unit |
| `currency` | string | No | Default `usd` |
| `data` | object | Yes | Customer + URLs |
| `data.notify_url` | string | Yes | Webhook URL |
| `data.redirect_url` | string | Yes | Success redirect |
| `data.cancel_url` | string | Yes | Cancel redirect |
| `orderItems` | array | No | Line items (`name` with `_` instead of spaces) |

**Success:** `{ status: true, redirectUrl: '...' }`  
**Error:** `{ status: false, message: '...' }`

### `verifyWebhook({ authorization, authStr, body })`

**Success:** `{ ok: true, status: 2040, payload }`  
**Failure:** `{ ok: false, status, message }`

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

## Supported crypto

| Currency | Networks |
|---|---|
| USDT | TRC20, ERC20, BEP20 |
| USDC | ERC20, BEP20 |
| BTC | Bitcoin |
| ETH | ERC20 |
| Binance Pay | QR |

---

## Support

| Channel | Link |
|---|---|
| Telegram | [t.me/Payerurl](https://t.me/Payerurl) |
| Website | [payerurl.com](https://payerurl.com) |
| Dashboard | [dash.payerurl.com](https://dash.payerurl.com) |

## License

MIT
