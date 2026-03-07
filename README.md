# Aircall Agent Status Dashboard

This project contains a React dashboard (`src/App.jsx`) that pulls Aircall users and calls directly from the Aircall API.

## Live update behavior

- The dashboard performs an initial full sync for the day.
- It then refreshes every 30 seconds (twice per minute) to keep dials, talk time, and agent availability current.
- Agent status is sourced from active call state (live calls + call webhook events), with Aircall availability fields as fallback when no active call signal is present.

## Run the frontend

```bash
npm run dev
```

## Optional helper server

A helper server exists in `server.js` with health, Stripe webhook handling, event streaming, and simulation endpoints:

- `GET /health`
- `POST /api/stripe/config` (registers Stripe secret key from login)
- `POST /api/stripe/webhook` (accepts Stripe events, emits success events)
- `GET /api/latest-success` (returns latest unconsumed Stripe success event and marks it consumed)
- `GET /api/stripe/events` (SSE stream consumed by dashboard)
- `POST /api/stripe/simulate-success` (manual UI testing)
- `POST /api/stripe/create-checkout-session` (creates Stripe Checkout test session with business metadata)
- `POST /api/stripe/request` (generic Stripe API passthrough)


The frontend listens to this helper via `EventSource` at `VITE_STRIPE_BRIDGE_URL` (default `http://localhost:8787`) and auto-registers the Stripe secret key from the login form so real Stripe webhook events trigger the onboarding modal.

Run it with:

```bash
npm run server
```

Set the following env vars before launching `npm run server`:

- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

Webhook forwarding for localhost:

```bash
stripe listen --forward-to localhost:8787/api/stripe/webhook
```
