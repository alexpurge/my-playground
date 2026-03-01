/* eslint-env node */
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8787);
const clients = new Set();
const agentStatuses = new Map();
const WEBHOOK_PATH = '/api/aircall/webhook';
const DB_FILE = resolve(__dirname, process.env.AIRCALL_WEBHOOK_DB_FILE || 'data/aircall-webhook-db.json');
const MAX_STORED_EVENTS = Number(process.env.AIRCALL_MAX_STORED_EVENTS || 10000);

const writeJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const getDateKey = (value) => {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) return new Date().toISOString().slice(0, 10);
  return source.toISOString().slice(0, 10);
};

const loadDb = () => {
  try {
    const raw = readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      calls: parsed.calls && typeof parsed.calls === 'object' ? parsed.calls : {},
      dailyMetrics: parsed.dailyMetrics && typeof parsed.dailyMetrics === 'object' ? parsed.dailyMetrics : {},
    };
  } catch {
    return { events: [], calls: {}, dailyMetrics: {} };
  }
};

const persistDb = (db) => {
  mkdirSync(dirname(DB_FILE), { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

const db = loadDb();

const ensureAgentMetrics = ({ dateKey, agentId, agentName }) => {
  if (!db.dailyMetrics[dateKey]) db.dailyMetrics[dateKey] = {};
  const key = String(agentId ?? agentName ?? '').trim().toLowerCase();
  if (!key) return null;

  if (!db.dailyMetrics[dateKey][key]) {
    db.dailyMetrics[dateKey][key] = {
      id: agentId ?? null,
      name: agentName ?? null,
      dials: 0,
      talkTime: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const row = db.dailyMetrics[dateKey][key];
  if (agentId !== undefined && agentId !== null) row.id = agentId;
  if (agentName) row.name = agentName;
  row.updatedAt = new Date().toISOString();
  return row;
};

const eventToStatus = (event) => {
  if (!event) return null;
  const normalized = String(event).toLowerCase();
  if (normalized.includes('in_call') || normalized.includes('incall') || normalized.includes('call.started') || normalized.includes('call.answered')) return 'in_call';
  if (normalized.includes('available') && !normalized.includes('unavailable')) return 'available';
  if (normalized.includes('unavailable') || normalized.includes('offline') || normalized.includes('away')) return 'unavailable';
  if (normalized.includes('call.ended')) return 'available';
  return null;
};

const extractAgent = (payload = {}) => {
  const callUser = payload?.call?.user || payload?.data?.call?.user || {};
  const candidate = payload?.agent || payload?.user || payload?.data?.agent || payload?.data?.user || payload?.resource || callUser || {};
  return {
    id: candidate.id ?? payload?.agent_id ?? payload?.user_id ?? payload?.data?.agent_id ?? payload?.data?.user_id ?? payload?.call?.user_id ?? payload?.data?.call?.user_id ?? null,
    name: candidate.name ?? payload?.agent_name ?? payload?.user_name ?? payload?.data?.agent_name ?? payload?.data?.user_name ?? null,
  };
};

const extractEventName = (payload = {}) => payload.event || payload.event_name || payload.type || payload.name || payload?.data?.event || payload?.webhook_event || '';

const extractCallData = (payload = {}) => {
  const call = payload?.call || payload?.data?.call || payload?.resource || {};
  const numberLike = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  return {
    id: call.id ?? payload?.call_id ?? payload?.data?.call_id ?? null,
    direction: call.direction ?? payload?.direction ?? payload?.data?.direction ?? null,
    duration: numberLike(call.duration ?? payload?.duration ?? payload?.data?.duration),
    startedAt: call.started_at ?? call.startedAt ?? payload?.started_at ?? payload?.data?.started_at ?? payload?.created_at ?? payload?.data?.created_at ?? null,
    answeredAt: call.answered_at ?? call.answeredAt ?? payload?.answered_at ?? payload?.data?.answered_at ?? null,
    endedAt: call.ended_at ?? call.endedAt ?? payload?.ended_at ?? payload?.data?.ended_at ?? null,
  };
};

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

  const eventSets = [[
    'user.opened',
    'user.closed',
    'user.connected',
    'user.disconnected',
    'call.created',
    'call.answered',
    'call.ended',
  ]];

  const authHeader = `Basic ${Buffer.from(`${apiId}:${apiToken}`).toString('base64')}`;

  for (const events of eventSets) {
    const payload = { custom_name: 'Agent Webhook Metrics', url: webhookUrl, events };

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

    const responseText = text.toLowerCase();
    const duplicateRegistration = responseText.includes('already') || responseText.includes('taken') || responseText.includes('exists');

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

    return { ok: false, status: response.status, data, webhookUrl, events };
  }

  return {
    ok: false,
    status: 422,
    data: { message: 'Failed to register webhook with all supported event combinations.' },
    webhookUrl,
    events: eventSets.flat(),
  };
};

const applyWebhookToMetrics = ({ payload, eventName, agent }) => {
  const call = extractCallData(payload);
  const eventLower = String(eventName || '').toLowerCase();
  const dateKey = getDateKey(call.startedAt || payload?.created_at || payload?.timestamp || Date.now());

  const eventRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    receivedAt: new Date().toISOString(),
    eventName,
    agent,
    call,
  };
  db.events.push(eventRecord);
  if (db.events.length > MAX_STORED_EVENTS) db.events.splice(0, db.events.length - MAX_STORED_EVENTS);

  if (!call.id) return;

  if (!db.calls[call.id]) {
    db.calls[call.id] = {
      id: call.id,
      dateKey,
      agentId: agent.id ?? null,
      agentName: agent.name ?? null,
      dialApplied: false,
      talkApplied: false,
      duration: 0,
    };
  }

  const record = db.calls[call.id];
  record.agentId = agent.id ?? record.agentId;
  record.agentName = agent.name ?? record.agentName;
  record.dateKey = dateKey;

  const metricsRow = ensureAgentMetrics({
    dateKey: record.dateKey,
    agentId: record.agentId,
    agentName: record.agentName,
  });

  if (!metricsRow) return;

  if (eventLower.includes('call.created') && !record.dialApplied) {
    metricsRow.dials += 1;
    record.dialApplied = true;
  }

  if (eventLower.includes('call.ended') && !record.talkApplied) {
    const talkTime = Number.isFinite(call.duration) ? call.duration : 0;
    metricsRow.talkTime += Math.max(0, talkTime);
    record.duration = Math.max(record.duration, talkTime);
    record.talkApplied = true;
  }
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
    return writeJson(res, 200, {
      ok: true,
      clients: clients.size,
      trackedAgents: agentStatuses.size,
      storedEvents: db.events.length,
      dbFile: DB_FILE,
    });
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

  if (req.method === 'GET' && url.pathname === '/api/aircall/metrics/daily') {
    const date = url.searchParams.get('date') || getDateKey(new Date());
    const rows = Object.values(db.dailyMetrics[date] || {});
    const agents = rows
      .map((row) => ({
        id: row.id,
        name: row.name || String(row.id || 'Unknown'),
        dials: Number(row.dials) || 0,
        talkTime: Number(row.talkTime) || 0,
      }))
      .sort((a, b) => (b.dials + Math.floor(b.talkTime / 60)) - (a.dials + Math.floor(a.talkTime / 60)));

    const totals = agents.reduce((acc, row) => ({
      dials: acc.dials + row.dials,
      talkTime: acc.talkTime + row.talkTime,
    }), { dials: 0, talkTime: 0 });

    return writeJson(res, 200, { ok: true, date, agents, totals });
  }

  if (req.method === 'GET' && url.pathname === '/api/aircall/events') {
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 50)));
    return writeJson(res, 200, { ok: true, events: db.events.slice(-limit).reverse() });
  }

  if (req.method === 'POST' && url.pathname === WEBHOOK_PATH) {
    try {
      const payload = await parseBody(req);
      const agent = extractAgent(payload);
      const eventName = extractEventName(payload);
      const status = eventToStatus(eventName) || eventToStatus(payload?.status) || eventToStatus(payload?.availability_status);

      applyWebhookToMetrics({ payload, eventName, agent });
      persistDb(db);

      if (agent.id || agent.name) {
        const key = String(agent.id ?? agent.name).toLowerCase();
        if (status) {
          agentStatuses.set(key, { id: agent.id ?? null, name: agent.name ?? null, status, updatedAt: new Date().toISOString() });
          broadcast({ type: 'status_update', agent: { id: agent.id ?? null, name: agent.name ?? null }, status, eventName, updatedAt: new Date().toISOString() });
        }
      }

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
