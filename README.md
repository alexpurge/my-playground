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
- `GET /api/stripe/events` (SSE stream consumed by dashboard)
- `POST /api/stripe/simulate-success` (manual UI testing)
- `POST /api/stripe/request` (generic Stripe API passthrough)


The frontend listens to this helper via `EventSource` at `VITE_STRIPE_BRIDGE_URL` (default `http://localhost:8787`) and auto-registers the Stripe secret key from the login form so real Stripe webhook events trigger the onboarding modal.

Run it with:

```bash
npm run server
```

If you want strict webhook verification, set `STRIPE_WEBHOOK_SECRET` to your Stripe webhook signing secret (`whsec_...`) before launching `npm run server`.
