/* eslint-env node */
import { createServer } from 'node:http';
import { URL } from 'node:url';
import crypto from 'node:crypto';

const port = Number(process.env.PORT || 8787);
const clients = new Set();
const agentStatuses = new Map();

const WEBHOOK_PATHS = new Set(['/api/aircall/webhook', '/webhooks/aircall', '/webhooks/aircall/status']);
const STREAM_PATHS = new Set(['/api/aircall/stream', '/events/agent-status']);
const REGISTER_PATHS = new Set(['/api/aircall/register-webhook', '/webhooks/aircall/register']);

const writeJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret, X-Aircall-Signature',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const eventToStatus = (event) => {
  if (!event) return null;
  const normalized = String(event).toLowerCase();
  if (normalized.includes('in_call') || normalized.includes('incall') || normalized.includes('call.started') || normalized.includes('call.answered') || normalized.includes('call.created')) return 'in_call';
  if (normalized.includes('available') || normalized.includes('user.opened') || normalized.includes('user.connected')) return 'available';
  if (normalized.includes('unavailable') || normalized.includes('offline') || normalized.includes('away') || normalized.includes('user.closed') || normalized.includes('user.disconnected')) return 'unavailable';
  if (normalized.includes('call.ended')) return 'available';
  return null;
};

const extractAgent = (payload = {}) => {
  const candidate = payload?.agent || payload?.user || payload?.data?.agent || payload?.data?.user || payload?.resource || {};
  return {
    id: candidate.id ?? payload?.agent_id ?? payload?.user_id ?? payload?.data?.agent_id ?? payload?.data?.user_id ?? null,
    name: candidate.name ?? payload?.agent_name ?? payload?.user_name ?? payload?.data?.agent_name ?? payload?.data?.user_name ?? null,
  };
};

const extractEventName = (payload = {}) => payload.event || payload.event_name || payload.type || payload.name || payload?.data?.event || payload?.webhook_event || '';

const broadcast = (message) => {
  const serialized = `data: ${JSON.stringify(message)}\n\n`;
  for (const client of clients) client.write(serialized);
};

const parseBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      req.socket.destroy();
      reject(new Error('Payload too large'));
    }
  });
  req.on('end', () => {
    if (!body) return resolve({});
    try {
      resolve(JSON.parse(body));
    } catch {
      reject(new Error('Invalid JSON'));
    }
  });
  req.on('error', reject);
});

const parseRawBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const resolvePublicWebhookUrl = (req, providedUrl) => {
  if (providedUrl) return String(providedUrl).trim();
  if (process.env.PUBLIC_WEBHOOK_BASE_URL) return String(process.env.PUBLIC_WEBHOOK_BASE_URL).trim();
  if (process.env.PUBLIC_WEBHOOK_URL) return String(process.env.PUBLIC_WEBHOOK_URL).trim();

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const origin = req.headers.origin;
  if (origin) return String(origin).trim();

  const host = req.headers.host;
  if (host) return `http://${host}`;

  return '';
};

const registerWebhook = async ({ apiId, apiToken, publicWebhookUrl }) => {
  const webhookUrl = `${String(publicWebhookUrl).replace(/\/$/, '')}/api/aircall/webhook`;
  const events = ['user.available', 'user.unavailable', 'user.in_call', 'user.opened', 'user.closed', 'user.connected', 'user.disconnected', 'call.created', 'call.answered', 'call.ended'];
  const response = await fetch('https://api.aircall.io/v1/webhooks', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiId}:${apiToken}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ custom_name: 'Agent Status Stream', url: webhookUrl, events }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  return { ok: response.ok, status: response.status, data, webhookUrl, events };
};

const validateWebhookAuth = (headers, rawBody) => {
  const expectedSecret = process.env.WEBHOOK_SECRET || process.env.AIRCALL_WEBHOOK_SECRET;
  if (expectedSecret) {
    const secret = headers['x-webhook-secret'];
    if (!secret || String(secret) !== String(expectedSecret)) {
      return { ok: false, message: 'Invalid webhook secret.' };
    }
  }

  const signingSecret = process.env.AIRCALL_SIGNING_SECRET;
  if (signingSecret) {
    const signature = headers['x-aircall-signature'];
    if (!signature) return { ok: false, message: 'Missing Aircall signature.' };

    const digest = crypto.createHmac('sha256', signingSecret).update(rawBody).digest('hex');
    if (digest !== signature) return { ok: false, message: 'Invalid Aircall signature.' };
  }

  return { ok: true };
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret, X-Aircall-Signature',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return writeJson(res, 200, { ok: true, clients: clients.size, trackedAgents: agentStatuses.size });
  }

  if (req.method === 'GET' && STREAM_PATHS.has(url.pathname)) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    clients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'snapshot', statuses: Object.fromEntries(agentStatuses.entries()) })}\n\n`);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && WEBHOOK_PATHS.has(url.pathname)) {
    try {
      const rawBody = await parseRawBody(req);
      const authCheck = validateWebhookAuth(req.headers, rawBody);
      if (!authCheck.ok) return writeJson(res, 401, { ok: false, message: authCheck.message });

      const payload = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {};
      const { id, name } = extractAgent(payload);
      const eventName = extractEventName(payload);
      const status = eventToStatus(payload?.availability_status) || eventToStatus(payload?.status) || eventToStatus(eventName);

      if (!id && !name) return writeJson(res, 400, { ok: false, message: 'Agent identity not found in webhook payload.' });
      if (!status) return writeJson(res, 202, { ok: true, ignored: true, message: `Unsupported event ${eventName || 'unknown'}.` });

      const key = String(id ?? name).toLowerCase();
      const now = new Date().toISOString();
      agentStatuses.set(key, { id: id ?? null, name: name ?? null, status, updatedAt: now });
      broadcast({ type: 'status_update', agent: { id: id ?? null, name: name ?? null }, status, eventName, updatedAt: now });
      return writeJson(res, 200, { ok: true });
    } catch (error) {
      return writeJson(res, 400, { ok: false, message: error.message });
    }
  }

  if (req.method === 'POST' && REGISTER_PATHS.has(url.pathname)) {
    try {
      const body = await parseBody(req);
      const apiId = body.apiId || process.env.AIRCALL_API_ID;
      const apiToken = body.apiToken || body.apiKey || process.env.AIRCALL_API_KEY;
      const { publicWebhookUrl } = body;

      if (!apiId || !apiToken) return writeJson(res, 400, { ok: false, message: 'apiId and apiToken are required.' });

      const resolvedPublicWebhookUrl = resolvePublicWebhookUrl(req, publicWebhookUrl);
      if (!resolvedPublicWebhookUrl) return writeJson(res, 400, { ok: false, message: 'Could not determine a webhook base URL. Set PUBLIC_WEBHOOK_BASE_URL or provide publicWebhookUrl.' });

      const registration = await registerWebhook({ apiId, apiToken, publicWebhookUrl: resolvedPublicWebhookUrl });
      if (!registration.ok) return writeJson(res, registration.status, { ok: false, message: 'Failed to register webhook with Aircall.', details: registration.data });
      return writeJson(res, 200, { ok: true, webhook: registration.data, webhookUrl: registration.webhookUrl, events: registration.events });
    } catch (error) {
      return writeJson(res, 500, { ok: false, message: error.message });
    }
  }

  return writeJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(port, () => {
  console.log(`Aircall webhook bridge running on :${port}`);
});
