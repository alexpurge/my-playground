import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

const clients = new Set();
const latestStatuses = new Map();

const normalizeAvailability = (status) => {
  if (!status || typeof status !== 'string') return 'unavailable';
  const normalized = status.toLowerCase().trim();

  if (['available', 'online', 'ready'].includes(normalized)) return 'available';

  if (
    [
      'busy',
      'on_call',
      'in_call',
      'in call',
      'calling',
      'oncall',
      'on a call',
      'in_a_call',
      'on_phone',
      'on the phone',
    ].includes(normalized)
  ) {
    return 'in_call';
  }

  return 'unavailable';
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
};

const sendSse = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const broadcast = (event, payload) => {
  for (const client of clients) {
    sendSse(client, event, payload);
  }
};

const getStatusPayload = (body) => {
  const userId =
    body?.data?.user?.id ||
    body?.data?.user_id ||
    body?.user?.id ||
    body?.user_id ||
    body?.agent?.id ||
    body?.agent_id;

  const userName =
    body?.data?.user?.name ||
    body?.user?.name ||
    body?.agent?.name ||
    null;

  const rawStatus =
    body?.data?.availability_status ||
    body?.data?.status ||
    body?.status ||
    body?.availability_status ||
    body?.agent?.status;

  if (!userId || !rawStatus) return null;

  return {
    userId: String(userId),
    userName,
    availabilityStatus: normalizeAvailability(rawStatus),
    rawStatus,
    sourceEvent: body?.event || body?.type || 'unknown',
    updatedAt: new Date().toISOString(),
  };
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: clients.size, statuses: latestStatuses.size }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/events/agent-status') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(': connected\n\n');

    clients.add(res);

    if (latestStatuses.size) {
      sendSse(res, 'snapshot', {
        agents: Array.from(latestStatuses.values()),
      });
    }

    req.on('close', () => {
      clients.delete(res);
    });

    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhooks/aircall/status') {
    try {
      if (WEBHOOK_SECRET && req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
        res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid webhook secret' }));
        return;
      }

      const body = await readJsonBody(req);
      const payload = getStatusPayload(body);

      if (!payload) {
        res.writeHead(422, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Missing user id or status' }));
        return;
      }

      latestStatuses.set(payload.userId, payload);
      broadcast('agent-status-updated', payload);

      res.writeHead(202, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ accepted: true, payload }));
      return;
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload', detail: error.message }));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Aircall webhook server listening on http://0.0.0.0:${PORT}`);
});
