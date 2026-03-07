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

<<<<<<< HEAD
A small helper server exists in `server.js` and currently exposes:
=======
A minimal helper server exists in `server.js` and exposes only:
>>>>>>> parent of a898c37 (Add Stripe webhook bridge and onboarding celebration flow)

- `GET /health`

Run it with:

```bash
npm run server
```
