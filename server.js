/* eslint-env node */
import { createServer } from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PORT || 8787);
const clients = new Set();
const agentStatuses = new Map();
const WEBHOOK_PATH = '/api/aircall/webhook';

const writeJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const eventToStatus = (event) => {
  if (!event) return null;
  const normalized = String(event).toLowerCase();
  if (normalized.includes('in_call') || normalized.includes('incall') || normalized.includes('call.started') || normalized.includes('call.answered')) return 'in_call';
  if (normalized.includes('available') && !normalized.includes('unavailable')) return 'available';
  if (normalized.includes('unavailable') || normalized.includes('offline') || normalized.includes('away')) return 'unavailable';
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


const resolvePublicWebhookUrl = (req, providedUrl) => {
  if (providedUrl) return String(providedUrl).trim();

  if (process.env.PUBLIC_WEBHOOK_BASE_URL) return String(process.env.PUBLIC_WEBHOOK_BASE_URL).trim();
  if (process.env.PUBLIC_WEBHOOK_URL) return String(process.env.PUBLIC_WEBHOOK_URL).trim();

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const origin = req.headers.origin;
  if (origin) return String(origin).trim();

  const referer = req.headers.referer;
  if (referer) {
    try {
      const parsed = new URL(referer);
      return parsed.origin;
    } catch {
      // ignore malformed referer
    }
  }

  const host = req.headers.host;
  if (host) return `http://${host}`;

  return '';
};

const registerWebhook = async ({ apiId, apiToken, publicWebhookUrl }) => {
  const normalizedInput = String(publicWebhookUrl).trim().replace(/\/$/, '');
  const webhookUrl = normalizedInput.endsWith(WEBHOOK_PATH)
    ? normalizedInput
    : `${normalizedInput}${WEBHOOK_PATH}`;

  const eventSets = [
    ['user.opened', 'user.closed', 'user.connected', 'user.disconnected', 'call.created', 'call.answered', 'call.ended'],
    ['user.available', 'user.unavailable', 'user.in_call'],
  ];

  const authHeader = `Basic ${Buffer.from(`${apiId}:${apiToken}`).toString('base64')}`;

  for (const events of eventSets) {
    const payload = { custom_name: 'Agent Status Stream', url: webhookUrl, events };

    const response = await fetch('https://api.aircall.io/v1/webhooks', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (response.ok) return { ok: true, status: response.status, data, webhookUrl, events };

    // Aircall may return a duplicate/validation error if this webhook already exists.
    // In that case treat the registration as successful and return the existing record.
    const responseText = text.toLowerCase();
    const duplicateRegistration = responseText.includes('already')
      || responseText.includes('taken')
      || responseText.includes('exists');

    if (duplicateRegistration) {
      const existingRes = await fetch('https://api.aircall.io/v1/webhooks', {
        method: 'GET',
        headers: { Authorization: authHeader },
      });

      const existingPayload = await existingRes.json().catch(() => ({}));
      const existingWebhooks = existingPayload?.webhooks || existingPayload?.data || [];
      const existing = Array.isArray(existingWebhooks)
        ? existingWebhooks.find((webhook) => String(webhook?.url || '').replace(/\/$/, '') === webhookUrl)
        : null;

      if (existing) {
        return {
          ok: true,
          status: 200,
          data: { webhook: existing, note: 'Webhook already existed and was reused.' },
          webhookUrl,
          events,
        };
      }
    }

    const invalidEvents = responseText.includes('event') && (responseText.includes('invalid') || responseText.includes('unknown'));
    if (!invalidEvents) return { ok: false, status: response.status, data, webhookUrl, events };
  }

  return {
    ok: false,
    status: 422,
    data: { message: 'Failed to register webhook with all supported event combinations.' },
    webhookUrl,
    events: eventSets.flat(),
  };
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return writeJson(res, 200, { ok: true, clients: clients.size, trackedAgents: agentStatuses.size });
  }

  if (req.method === 'GET' && url.pathname === '/api/aircall/stream') {
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

  if (req.method === 'POST' && url.pathname === WEBHOOK_PATH) {
    try {
      const payload = await parseBody(req);
      const { id, name } = extractAgent(payload);
      const eventName = extractEventName(payload);
      const status = eventToStatus(eventName) || eventToStatus(payload?.status) || eventToStatus(payload?.availability_status);

      if (!id && !name) return writeJson(res, 400, { ok: false, message: 'Agent identity not found in webhook payload.' });
      if (!status) return writeJson(res, 202, { ok: true, ignored: true, message: `Unsupported event ${eventName || 'unknown'}.` });

      const key = String(id ?? name).toLowerCase();
      agentStatuses.set(key, { id: id ?? null, name: name ?? null, status, updatedAt: new Date().toISOString() });
      broadcast({ type: 'status_update', agent: { id: id ?? null, name: name ?? null }, status, eventName, updatedAt: new Date().toISOString() });
      return writeJson(res, 200, { ok: true });
    } catch (error) {
      return writeJson(res, 400, { ok: false, message: error.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/aircall/register-webhook') {
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
