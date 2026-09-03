/**
 * Express example — create payment + webhook notify
 *
 * npm i express @payerurl/binance-crypto-instant-payout-nodejs
 * OR: npm i express && npm link from this package folder
 */

import express from 'express';
import { Payerurl } from '@payerurl/binance-crypto-instant-payout-nodejs';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const payerurl = new Payerurl({
  publicKey: process.env.PAYERURL_PUBLIC_KEY || '',
  secretKey: process.env.PAYERURL_SECRET_KEY || '',
});

app.post('/api/pay', async (req, res) => {
  const result = await payerurl.payment({
    invoiceId: `ORD-${Date.now()}`,
    amount: Number(req.body.amount) || 1000,
    currency: 'usd',
    data: {
      first_name: req.body.first_name || 'Alice',
      last_name: req.body.last_name || 'Smith',
      email: req.body.email || 'alice@example.com',
      redirect_url: 'https://yourdomain.com/payment-success',
      cancel_url: 'https://yourdomain.com/checkout',
      notify_url: 'https://yourdomain.com/api/payerurl/notify',
    },
    orderItems: [
      {
        name: 'Order_item_name',
        qty: 1,
        price: '10.00',
      },
    ],
  });

  if (result.status) {
    return res.json({ redirectUrl: result.redirectUrl });
  }

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

  // Update your order: result.payload.order_id
  console.log('Payment success', result.payload);

  return res.json({ status: result.status, message: result.payload });
});

app.listen(3000, () => {
  console.log('Listening on http://localhost:3000');
});
