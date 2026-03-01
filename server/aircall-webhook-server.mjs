import crypto from 'node:crypto';
import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.AIRCALL_WEBHOOK_SECRET || '';
const AIRCALL_SIGNING_SECRET = process.env.AIRCALL_SIGNING_SECRET || '';

const clients = new Set();
const latestStatuses = new Map();

const normalizeAvailability = (status) => {
  if (!status || typeof status !== 'string') return 'unavailable';
  const normalized = status.toLowerCase().trim();

  if (
    [
      'available',
      'online',
      'ready',
      'open',
      'idle',
      'waiting',
      'free',
      'logged_in',
      'connected',
    ].includes(normalized)
  ) {
    return 'available';
  }

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
      'ringing',
      'after_call_work',
      'wrap_up',
      'in conversation',
    ].includes(normalized)
  ) {
    return 'in_call';
  }

  return 'unavailable';
};

const readRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const parseJson = (rawBodyBuffer) => {
  if (!rawBodyBuffer.length) return {};
  return JSON.parse(rawBodyBuffer.toString('utf8'));
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

const isValidSignature = (rawBodyBuffer, incomingSignature, signingSecret) => {
  if (!signingSecret) return true;
  if (!incomingSignature) return false;

  const expectedHex = crypto.createHmac('sha256', signingSecret).update(rawBodyBuffer).digest('hex');
  const expectedBase64 = crypto.createHmac('sha256', signingSecret).update(rawBodyBuffer).digest('base64');

  const candidates = [incomingSignature, incomingSignature.replace(/^sha256=/i, '')];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const compare = (value) => {
      const a = Buffer.from(candidate);
      const b = Buffer.from(value);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    };

    if (compare(expectedHex) || compare(expectedBase64)) {
      return true;
    }
  }

  return false;
};

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const getStatusPayload = (body) => {
  const userId = pickFirst(
    body?.data?.user?.id,
    body?.data?.user_id,
    body?.user?.id,
    body?.user_id,
    body?.agent?.id,
    body?.agent_id,
    body?.data?.member?.id,
    body?.data?.member_id,
    body?.data?.id,
  );

  const userName = pickFirst(
    body?.data?.user?.name,
    body?.user?.name,
    body?.agent?.name,
    body?.data?.member?.name,
    body?.data?.name,
    null,
  );

  const rawStatus = pickFirst(
    body?.data?.availability_status,
    body?.data?.availability,
    body?.data?.status,
    body?.status,
    body?.availability_status,
    body?.agent?.status,
    body?.agent?.availability_status,
    body?.data?.user?.availability_status,
    body?.data?.user?.status,
    body?.data?.member?.status,
    body?.data?.member?.availability_status,
    body?.data?.old?.status,
    body?.data?.new?.status,
  );

  if (!userId || !rawStatus) return null;

  return {
    userId: String(userId),
    userName,
    availabilityStatus: normalizeAvailability(rawStatus),
    rawStatus: String(rawStatus),
    sourceEvent: body?.event || body?.type || 'unknown',
    updatedAt: new Date().toISOString(),
  };
};

const isWebhookPath = (pathname) => ['/webhooks/aircall/status', '/webhooks/aircall'].includes(pathname);

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
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret, X-Aircall-Signature',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && isWebhookPath(url.pathname)) {
    try {
      const rawBodyBuffer = await readRawBody(req);

      if (WEBHOOK_SECRET && req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
        res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid webhook secret' }));
        return;
      }

      if (!isValidSignature(rawBodyBuffer, req.headers['x-aircall-signature'], AIRCALL_SIGNING_SECRET)) {
        res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid Aircall signature' }));
        return;
      }

      const body = parseJson(rawBodyBuffer);
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
