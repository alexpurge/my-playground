# Aircall Agent Status Dashboard (Webhook-First)

This app now uses a **webhook-first ingestion pipeline** for Aircall metrics:

- Aircall webhooks are received by `server.js`.
- Webhook payloads are stored in a local JSON-backed database (`data/aircall-webhook-db.json` by default).
- Daily agent metrics (`dials`, `talkTime`) are calculated from webhook events.
- The frontend (`src/App.jsx`) reads those computed metrics from the local server API instead of polling Aircall REST calls.
- Agent availability still updates live via SSE (`/api/aircall/stream`).

## Run

```bash
npm run webhook:server
npm run dev
```

Server environment options:

- `PORT` (default `8787`)
- `AIRCALL_API_ID`, `AIRCALL_API_KEY` (for webhook auto-registration helper)
- `PUBLIC_WEBHOOK_BASE_URL` or `PUBLIC_WEBHOOK_URL` (public HTTPS base URL Aircall can call)
- `AIRCALL_WEBHOOK_DB_FILE` (optional DB path override)
- `AIRCALL_MAX_STORED_EVENTS` (default `10000`)

## Webhook ingestion endpoints

- `POST /api/aircall/webhook` – receives webhook payloads and updates metrics.
- `POST /api/aircall/register-webhook` – helper route to register webhook URL in Aircall.

## Metrics endpoints

- `GET /api/aircall/metrics/daily?date=YYYY-MM-DD`
  - Returns computed daily metrics per agent.
- `GET /api/aircall/events?limit=50`
  - Returns recent raw webhook events.
- `GET /health`
  - Includes DB/event counters.

## Realtime status stream

- `GET /api/aircall/stream` (SSE)

## Aircall setup checklist

1. In Aircall dashboard/API, ensure webhook events include at least:
   - `call.created`
   - `call.ended`
   - `user.opened`
   - `user.closed`
   - `user.connected`
   - `user.disconnected`
2. Set webhook target to your public URL + `/api/aircall/webhook`.
3. If using helper registration, call:

```bash
curl -X POST http://localhost:8787/api/aircall/register-webhook \
  -H 'content-type: application/json' \
  -d '{"apiId":"YOUR_API_ID","apiToken":"YOUR_API_KEY","publicWebhookUrl":"https://your-public-host"}'
```

## Notes on permissions / external prerequisites

I can set up all local ingestion and calculation infrastructure (done in this repo), but you must provide:

- valid Aircall credentials (`AIRCALL_API_ID` + `AIRCALL_API_KEY`) if you want automatic registration, and/or
- webhook configuration in your Aircall account pointing to your publicly reachable URL.

Without that external account-level access, local development can still be tested by posting sample payloads directly to `/api/aircall/webhook`.
