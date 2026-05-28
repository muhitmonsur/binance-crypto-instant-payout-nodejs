# Accept USDT, USDC, BTC & ETH in Node.js: 10-Minute Binance Payment Gateway Integration: No Binance Merchant Account Required

<img src="https://raw.githubusercontent.com/muhitmonsur/assets/refs/heads/main/banner-772x250.png">

---

## Introduction

The Binance and Crypto Payment Gateway for Node.js is powered by PayerURL. This package acts as a robust cryptocurrency payment processor, allowing merchants and developers to receive customer payments directly into their crypto wallets — without the need for a middleman or intermediary account. We specialize in Binance QR code payments, providing a smooth, integrated experience where users never have to leave your Node.js application to complete a transaction.

---

### Binance QR Code Payment

<img src="https://raw.githubusercontent.com/muhitmonsur/assets/refs/heads/main/screenshot-5.png">

This package is the ideal solution for developers seeking a secure Binance payment integration for Node.js and Express.js. Binance payment is a contactless, borderless, and highly secure payment method. By using this package, you can accept payments via Binance QR codes and process transactions through the Binance personal account API.

The package serves as a seamless bridge between Binance and your Node.js application. Customers simply scan the QR code on your checkout page to finish the transaction. This process is:

* **Fast and Simple**: No complex redirects or external logins for the user.
* **Cost-Effective**: Incurs no network fees or additional hidden costs.
* **Secure**: Enhanced security protocols help avoid scams and ensure transaction safety.

---

### How This Package Works

The Binance and Crypto Payment Gateway automatically converts any fiat currency to the selected cryptocurrency using live exchange rates. Once the payment is verified, funds are credited instantly to the merchant's wallet. The package then utilizes a secure API response to update your application's order status (e.g., from "Pending" to "Processing") in real-time.

---

### Key Features

* **Extensive Network Support**: Supports Binance QR payment, Binance Pay, USDT (TRC20/ERC20), USDC (ERC20), Bitcoin (BTC), and Ethereum (ETH ERC20).
* **Fiat Compatibility**: Supports over 169+ fiat currencies (USD, CAD, GBP, EUR, etc.) with real-time exchange rates powered by payerurl.com.
* **Developer Friendly**: 100% Free Open Source package designed specifically for the Node.js ecosystem.
* **Privacy Focused**: No bank account or mandatory personal identity verification required.
* **Simple Integration**: Streamlined signup process with easy API key integration.
* **Accessibility**: No KYC required for withdrawals on Basic accounts.
* **Dedicated Support**: 24/7 technical assistance for integration via Telegram: https://t.me/Payerurl.

---

### About PayerURL

PayerURL is a premier payment processor enabling direct cryptocurrency transfers from customers to merchant wallets. Merchants can integrate Binance personal/merchant APIs alongside various receiving wallets including USDT, BTC, ETH, and USDC. We utilize live market rates to ensure accurate conversion from local fiat currencies to the corresponding cryptocurrency amount.

---

### 🔴 [LIVE DEMO](https://telegram.payerurl.com/)

---

## 🚀 How It Works

1. Collect user and order info on your platform.
2. Build and sign the payment request using HMAC SHA256.
3. POST the request to the PayerURL API and get a redirect URL.
4. Redirect the user to the PayerURL payment page.
5. After payment:
   - User is redirected to your `redirect_to` URL.
   - Your backend receives a callback at `notify_url` with full transaction details.
   - On cancellation, the user is returned to your `cancel_url`.

---

## 📞 Contact Us

#### 🌐 Website: [https://payerurl.com](https://payerurl.com)
#### 📞 Telegram: [https://t.me/Payerurl](https://t.me/Payerurl) (live chat)
#### 📧 Email: support@payerurl.com

---

## Prerequisites

1. Obtain your API public key and secret key from the [PayerURL Dashboard](https://dash.payerurl.com/).

---

## Request Setup

### Step 1: Install Node.js and Set Up Express.js

Follow the instructions at [Express.js](https://expressjs.com/) to set up your Express.js application.

### Step 2: Define Payment Route

Define a route for payment requests (e.g., "request" route).

### Step 3: Define Response Route

Define a response route to handle successful payment responses.

### Step 4: Prepare Request Object

Prepare an object with payment details:

```javascript
const paymentRequest = {
  order_id: 1922658446,
  amount: 123,
  items: [
    {
      name: "Order item name",
      qty: "1",
      price: "123",
    },
  ],
  currency: "usd",
  billing_fname: "Mohi Uddin",
  billing_lname: "Mahim",
  billing_email: "mahim@gmail.com",
  redirect_to: "http://localhost:3000/success",
  notify_url: "http://localhost:4000/response",
  cancel_url: "http://localhost:3000/cancel",
  type: "nodejs",
};
```

> ⚠️ `order_id` must be unique. Make sure all parameters are included.  
> Provide the success and cancel page URLs of your frontend, and the notify URL of your backend.

---

### Step 5: Write a View for the Request Route

Sort the object keys, build the query string, create an HMAC signature, and encode it in base64.

```javascript
// Sort the object keys in ascending order
const sortedArgsKeys = {};
Object.keys(paymentRequest)
  .sort()
  .forEach((key) => {
    sortedArgsKeys[key] = paymentRequest[key];
  });

// Build the required query string
function buildQueryString(obj, prefix) {
  let queryString = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const propName = prefix ? `${prefix}[${key}]` : key;
      if (value !== null && typeof value === "object") {
        queryString.push(buildQueryString(value, propName));
      } else {
        queryString.push(`${propName}=${encodeURIComponent(value)}`);
      }
    }
  }
  queryString = queryString.join("&");
  const argsString = new URLSearchParams(queryString).toString();
  return argsString;
}

// Create HMAC signature with sha256 hash
const argsString = buildQueryString(sortedArgsKeys);
const signature = crypto
  .createHmac("sha256", securityKey)
  .update(argsString)
  .digest("hex");

// Create auth string in base64 format
const authStr = btoa(`${publicKey}:${signature}`);
```

---

### Step 6: Prepare Request Headers and Make the API Call

```javascript
const url = "https://test.payerurl.com/api/payment";
const headers = {
  "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
  Authorization: `Bearer ${authStr}`,
};

const requestOptions = {
  method: "POST",
  headers: headers,
  body: argsString,
};

const response = await fetch(url, requestOptions);
const reData = await response.json();
```

---

### Step 7: Get Redirect URL

Extract `redirectTO` from the response and redirect the user:

```javascript
if (reData && reData.redirectTO) {
  res.redirect(reData.redirectTO);
} else {
  res.status(500).json({ message: "Payment initiation failed." });
}
```

---

## Response Handling

### Step 1: Decode Authorization Header

```javascript
const authStr = req.get("Authorization");
let auth;

if (!authStr || !authStr.startsWith("Bearer ")) {
  const authStrPost = Buffer.from(req.body.authStr, "base64").toString("utf8");
  auth = authStrPost.split(":");
} else {
  const authStrDecoded = Buffer.from(
    authStr.replace("Bearer ", ""),
    "base64"
  ).toString("utf8");
  auth = authStrDecoded.split(":");
}
```

---

### Step 2: Process Response

```javascript
if (payerurl_public_key !== auth[0]) {
  res.status(200).json({ status: 2030, message: "Public key doesn't match" });
} else {
  const GETDATA = {
    order_id: req.body.order_id,
    ext_transaction_id: req.body.ext_transaction_id,
    transaction_id: req.body.transaction_id,
    status_code: req.body.status_code,
    note: req.body.note,
    confirm_rcv_amnt: req.body.confirm_rcv_amnt,
    confirm_rcv_amnt_curr: req.body.confirm_rcv_amnt_curr,
    coin_rcv_amnt: req.body.coin_rcv_amnt,
    coin_rcv_amnt_curr: req.body.coin_rcv_amnt_curr,
    txn_time: req.body.txn_time,
  };

  if (!GETDATA.transaction_id) {
    res.status(200).json({ status: 2050, message: "Transaction ID not found" });
  } else if (!GETDATA.order_id) {
    res.status(200).json({ status: 2050, message: "Order ID not found" });
  } else if (GETDATA.status_code === 20000) {
    res.status(200).json({ status: 20000, message: "Order Cancelled" });
  } else if (GETDATA.status_code !== 200) {
    res.status(200).json({ status: 2050, message: "Order not complete" });
  } else {
    const data = { status: 2040, message: GETDATA };

    // 🔥 YOUR BUSINESS LOGIC GOES HERE
    // Example:
    // await Order.findOneAndUpdate(
    //   { order_id: GETDATA.order_id },
    //   { status: "paid", transaction_id: GETDATA.transaction_id }
    // );

    fs.appendFile("payerurl.log", JSON.stringify(data), (err) => {
      if (err) console.error("Error writing to log file", err);
    });

    res.status(200).json(data);
  }
}
```

---

## Screenshots

<img src="https://raw.githubusercontent.com/muhitmonsur/assets/refs/heads/main/screenshot-1.png">
<img src="https://raw.githubusercontent.com/muhitmonsur/assets/refs/heads/main/screenshot-2.png">
<img src="https://raw.githubusercontent.com/muhitmonsur/assets/refs/heads/main/screenshot-4.png">
<img src="https://raw.githubusercontent.com/muhitmonsur/assets/refs/heads/main/screenshot-6.png">
<img src="https://raw.githubusercontent.com/muhitmonsur/assets/refs/heads/main/screenshot-7.png">
<img src="https://raw.githubusercontent.com/muhitmonsur/assets/refs/heads/main/screenshot-8.png">

---

## License

This package is open-sourced software licensed under the [MIT License](LICENSE).
