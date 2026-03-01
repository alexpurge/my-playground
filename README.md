# Aircall Agent Status Dashboard

This project contains a React dashboard (`src/App.jsx`) that pulls Aircall users and calls directly from the Aircall API.

## Live update behavior

- The dashboard performs an initial full sync for the day.
- It then refreshes every 30 seconds (twice per minute) to keep dials, talk time, and agent availability current.
- Agent status is sourced from Aircall user availability fields (`availability_status`/`status`) during each poll.

## Run the frontend

```bash
npm run dev
```

## Optional helper server

A minimal helper server exists in `server.js` and exposes only:

- `GET /health`

Run it with:

```bash
npm run server
```
