# Aircall Agent Status Dashboard

This project contains:

- a React dashboard (`src/App.jsx`) that displays agent availability,
- a lightweight webhook bridge server (`server/aircall-webhook-server.mjs`) that receives Aircall webhook events,
- an SSE stream used by the UI to stay live-updated.

## 1) Run the webhook bridge server

```bash
PORT=8787 npm run webhook:server
```

Optional environment variables:

- `WEBHOOK_SECRET` (or `AIRCALL_WEBHOOK_SECRET`) – expected in `X-Webhook-Secret`.
- `AIRCALL_SIGNING_SECRET` – validates `X-Aircall-Signature` (`sha256` HMAC).
- `AIRCALL_API_ID` / `AIRCALL_API_KEY` – used by the webhook registration endpoint.
- `PUBLIC_WEBHOOK_URL` – public HTTPS URL Aircall can call (for registration endpoint).

### Webhook receiving endpoint

Use one of these Aircall targets:

- `POST /webhooks/aircall`
- `POST /webhooks/aircall/status`

The server responds quickly with `200 OK` and then broadcasts status changes to the UI SSE stream.

### SSE endpoint for the app

- `GET /events/agent-status`

Set this in frontend env if needed:

```bash
VITE_WEBHOOK_EVENTS_URL=http://localhost:8787/events/agent-status
```

## 2) Register webhook in Aircall

### Option A — direct Aircall API

`POST https://api.aircall.io/v1/webhooks` (Basic Auth with API ID + API Key), body:

```json
{
  "custom_name": "My App Status Webhook",
  "url": "https://your-app.com/webhooks/aircall",
  "events": [
    "user.opened",
    "user.closed",
    "user.connected",
    "user.disconnected",
    "call.created",
    "call.answered",
    "call.ended"
  ]
}
```

### Option B — via local helper endpoint

After setting `AIRCALL_API_ID`, `AIRCALL_API_KEY`, and `PUBLIC_WEBHOOK_URL`:

```bash
curl -X POST http://localhost:8787/webhooks/aircall/register
```

## 3) Event-to-status mapping

The server maps events and/or payload status to UI statuses:

- `user.opened`, `user.connected` -> `available`
- `user.closed`, `user.disconnected` -> `unavailable`
- `call.answered`, `call.created` -> `in_call`
- `call.ended` -> `available`

If payload includes explicit status (e.g. `availability_status`), that status is normalized and used first.

## 4) Run the frontend

```bash
npm run dev
```
