# Aircall Agent Status Dashboard

This project contains a React dashboard (`src/App.jsx`) and a local Stripe helper server (`server.js`) used to trigger the existing **New Client Onboarding Success** popup from real Stripe test payments.

## Run the frontend

```bash
npm run dev
```

## Run the local Stripe server

```bash
npm run server
```

Default backend URL is `http://localhost:3000`.

## Environment variables

Create a `.env` file in the repo root:

```bash
PORT=3000
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

## Stripe localhost flow

1. Start frontend + server.
2. Start Stripe webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Create a Checkout session from your app/client by calling:

```bash
POST /api/stripe/create-checkout-session
{
  "customerName": "Jane Smith",
  "businessName": "Acme Pty Ltd",
  "email": "jane@acme.com"
}
```

4. Redirect to returned `url` and complete payment with test card `4242 4242 4242 4242`.
5. Stripe sends `checkout.session.completed` to the webhook.
6. Server stores the success event and frontend polling (`GET /api/latest-success`) triggers the existing onboarding popup with Stripe customer + business data.

## Stripe endpoints

- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/webhook`
- `GET /api/latest-success`
- `GET /health`
