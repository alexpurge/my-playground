import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { Server as SocketIOServer } from 'socket.io';
import nodemailer from 'nodemailer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NICKNAMES_PATH = join(__dirname, 'data', 'agent-nicknames.json');

function readNicknames() {
  try {
    if (existsSync(NICKNAMES_PATH)) return JSON.parse(readFileSync(NICKNAMES_PATH, 'utf-8'));
  } catch { /* ignore */ }
  return {};
}

function writeNicknames(data) {
  writeFileSync(NICKNAMES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const PORT = Number(globalThis.process?.env?.PORT || 8787);
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

let stripe = null;
let anthropicApiKey = null;

const newlyCreatedCustomerIds = new Set();
let lastWebhookReceivedAt = null;

// ---------------------------------------------------------------------------
// EMAIL NOTIFICATIONS (Nodemailer / Gmail)
// ---------------------------------------------------------------------------
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendNotificationEmail(subject, htmlContent) {
  try {
    await emailTransporter.sendMail({
      from: process.env.NOTIFY_FROM,
      to: process.env.NOTIFY_TO,
      subject: subject,
      html: htmlContent,
    });
    console.log(`\x1b[1;92m📧 Email sent: ${subject}\x1b[0m`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

app.use(cors());

// ---------------------------------------------------------------------------
// STRIPE WEBHOOK
// ---------------------------------------------------------------------------
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    event = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  lastWebhookReceivedAt = Date.now();
  console.log(`\n\x1b[1;95m🔔 [STRIPE EVENT RECEIVED] -> ${event.type}\x1b[0m`);

  // ========================================================================
  // EVENT: customer.created
  // ========================================================================
  if (event.type === 'customer.created') {
    const customer = event.data.object;
    if (customer?.id) {
      newlyCreatedCustomerIds.add(customer.id);
    }

    // Send email notification
    const businessName = customer.metadata?.business_name || customer.name || 'No business name provided';

    const subject = '🎉 New Stripe Customer Added!';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Awesome news! A new customer just joined.</h2>
        <p><strong>Name:</strong> ${customer.name || 'No name provided'}</p>
        <p><strong>Business:</strong> ${businessName}</p>
        <p><strong>Customer ID:</strong> ${customer.id}</p>
        <p><strong>Email:</strong> ${customer.email || 'No email provided'}</p>

        <a href="https://dashboard.stripe.com/customers/${customer.id}"
           style="background-color: #ff7300; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; font-weight: bold; font-size: 16px;">
           View Customer in Stripe
        </a>
      </div>
    `;
    sendNotificationEmail(subject, htmlContent);
  }

  // ========================================================================
  // EVENT: customer.subscription.created
  // ========================================================================
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const planDescription = subscription.items?.data?.[0]?.plan?.nickname
      || subscription.items?.data?.[0]?.price?.nickname
      || 'Standard Subscription';
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || 'Unknown';

    let customerName = 'Unknown';
    let businessName = 'Unknown';
    if (stripe && customerId !== 'Unknown') {
      try {
        const cust = await stripe.customers.retrieve(customerId);
        customerName = cust.name || 'Unknown';
        businessName = cust.metadata?.business_name || cust.name || 'Unknown';
      } catch (e) {
        console.error('Could not fetch customer for subscription email:', e.message);
      }
    }

    const subject = '💰 New Subscription Started!';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Ka-ching! A new subscription has just been created.</h2>
        <p><strong>Name:</strong> ${customerName}</p>
        <p><strong>Business:</strong> ${businessName}</p>
        <p><strong>Customer ID:</strong> ${customerId}</p>
        <p><strong>Subscription Plan:</strong> ${planDescription}</p>
        <p><strong>Subscription ID:</strong> ${subscription.id}</p>

        <a href="https://dashboard.stripe.com/customers/${customerId}"
           style="background-color: #ff7300; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; font-weight: bold; font-size: 16px;">
           View Customer in Stripe
        </a>
      </div>
    `;
    sendNotificationEmail(subject, htmlContent);
  }

  // ========================================================================
  // EVENT: checkout.session.completed / payment_intent.succeeded (existing)
  // ========================================================================
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const session = event.data.object;
    const customerId = session?.customer;
    const isNewlyCreatedCustomer = customerId ? newlyCreatedCustomerIds.has(customerId) : false;

    console.log(`checkout.session.completed customerId: ${customerId || 'none'}`);
    console.log(`newlyCreatedCustomerIds has customerId: ${isNewlyCreatedCustomer}`);

    const amountCents = Number(session?.amount_total ?? session?.amount_received ?? session?.amount ?? 0);
    const customerName =
      session?.customer_details?.name ||
      session?.shipping?.name ||
      session?.metadata?.customer_name ||
      'Unknown Customer';
    const businessName = session?.metadata?.business_name || customerName;

    // Get the actual product name from line items → product object
    let packageName = session?.metadata?.package_name || '';
    if (!packageName && stripe && session?.id && event.type === 'checkout.session.completed') {
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1, expand: ['data.price.product'] });
        if (lineItems?.data?.[0]) {
          const li = lineItems.data[0];
          // Product name from the expanded product object (this is the name set in Stripe)
          const productName = typeof li.price?.product === 'object' ? li.price.product.name : '';
          packageName = productName || li.description || li.price?.nickname || '';
        }
      } catch (e) {
        console.error('Could not fetch line items:', e.message);
      }
    }

    if (isNewlyCreatedCustomer) {
      io.emit('sale_cleared', {
        customerName,
        businessName,
        paymentAmount: amountCents / 100,
        packageName,
      });

      // Send email notification with package info
      const subject = packageName ? `🎉 New customer signed up to ${packageName}!` : '🎉 New Sale Cleared!';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Awesome news! A new customer just signed up${packageName ? ` to ${packageName}` : ''}.</h2>
          <p><strong>Name:</strong> ${customerName}</p>
          <p><strong>Business:</strong> ${businessName}</p>
          <p><strong>Customer ID:</strong> ${customerId}</p>
          <p><strong>Email:</strong> ${session?.customer_details?.email || 'No email provided'}</p>
          <p><strong>Amount:</strong> $${(amountCents / 100).toFixed(2)}</p>
          ${packageName ? `<p><strong>Package:</strong> ${packageName}</p>` : ''}

          <a href="https://dashboard.stripe.com/customers/${customerId}"
             style="background-color: #ff7300; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; font-weight: bold; font-size: 16px;">
             View Customer in Stripe
          </a>
        </div>
      `;
      sendNotificationEmail(subject, htmlContent);
    } else {
      console.log('Ignoring successful payment: Customer is not new or ID is missing.');
    }

    if (customerId && isNewlyCreatedCustomer) {
      newlyCreatedCustomerIds.delete(customerId);
    }
  }

  res.status(200).json({ received: true });
});

app.use(express.json());

// ---------------------------------------------------------------------------
// TRANSCRIPT SUMMARY (Claude Haiku via Anthropic API)
// ---------------------------------------------------------------------------
app.post('/api/summarize-transcript', async (req, res) => {
  if (!anthropicApiKey) {
    return res.status(400).json({ error: 'Anthropic API key not configured' });
  }

  const { transcript } = req.body;
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Missing transcript' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Summarize this sales call transcript in 1-2 short sentences. Focus on the outcome (did they book, reschedule, not interested, etc). Be concise.\n\nTranscript:\n${transcript}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', errBody);
      return res.status(response.status).json({ error: 'Anthropic API error' });
    }

    const data = await response.json();
    const summary = data.content?.[0]?.text || 'Could not generate summary.';
    res.json({ summary });
  } catch (error) {
    console.error('Transcript summary error:', error);
    res.status(500).json({ error: 'Failed to summarize' });
  }
});

// ---------------------------------------------------------------------------
// AGENT NICKNAMES
// ---------------------------------------------------------------------------
app.get('/api/agent-nicknames', (_req, res) => {
  res.json(readNicknames());
});

app.put('/api/agent-nicknames/:agentId', (req, res) => {
  const { agentId } = req.params;
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const nicknames = readNicknames();
  nicknames[agentId] = name.trim();
  writeNicknames(nicknames);
  res.json({ ok: true, agentId, name: name.trim() });
});

// ---------------------------------------------------------------------------
// AIRCALL SERVER-SIDE PROXY — fetches ALL pages, caches complete dataset
// Frontend makes 0 Aircall API requests, just reads from here.
// ---------------------------------------------------------------------------
let aircallCredentials = null;
let aircallCallsCache = new Map();    // callId → call object
let aircallUsersCache = null;         // { userId: { name, email, status } }
let aircallTeamsCache = null;         // array of allowed user ID strings
let aircallPollingInterval = null;
let aircallLastFullSync = 0;
let aircallSyncInProgress = false;
const AIRCALL_FULL_SYNC_INTERVAL = 5 * 60 * 1000; // Full re-pagination every 5 min

// Rate limiter: max 2 Aircall API requests per 60 seconds
const aircallRequestLog = [];
async function aircallRateWait() {
  while (true) {
    const now = Date.now();
    while (aircallRequestLog.length && now - aircallRequestLog[0] >= 60000) aircallRequestLog.shift();
    if (aircallRequestLog.length < 2) { aircallRequestLog.push(Date.now()); return; }
    const wait = 60000 - (now - aircallRequestLog[0]) + 100;
    await new Promise(r => setTimeout(r, wait));
  }
}

function getBrisbaneStartOfDay() {
  const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;
  const nowUtc = Date.now();
  return Math.floor(
    (Math.floor((nowUtc + BRISBANE_OFFSET_MS) / 86400000) * 86400000 - BRISBANE_OFFSET_MS) / 1000
  );
}

async function aircallFetchPage(page, from, headers) {
  await aircallRateWait();
  const url = `https://api.aircall.io/v1/calls?from=${from}&order=desc&per_page=50&page=${page}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 429) { console.warn('[Aircall Server] Rate limit hit'); return null; }
    throw new Error(`Aircall API ${res.status}`);
  }
  return res.json();
}

async function aircallFetchUsers(headers) {
  if (aircallUsersCache) return;
  const users = {};
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    await aircallRateWait();
    const res = await fetch(`https://api.aircall.io/v1/users?per_page=50&page=${page}`, { headers });
    if (!res.ok) throw new Error(`Users fetch: ${res.status}`);
    const data = await res.json();
    data.users.forEach(u => {
      users[u.id] = { name: u.name, email: u.email || '', status: u.availability_status || u.status || 'unavailable' };
    });
    hasMore = Boolean(data.meta?.next_page_link);
    if (hasMore) page++;
  }
  aircallUsersCache = users;
  console.log(`[Aircall Server] Fetched ${Object.keys(users).length} users`);

  // Teams
  await aircallRateWait();
  const teamsRes = await fetch('https://api.aircall.io/v1/teams', { headers });
  if (teamsRes.ok) {
    const teamsData = await teamsRes.json();
    const salesTeam = teamsData.teams.find(t => t.name.toLowerCase().includes('sales'));
    if (salesTeam?.users) {
      aircallTeamsCache = salesTeam.users.map(u => String(u.id));
      console.log(`[Aircall Server] Sales team: ${aircallTeamsCache.length} members`);
    }
  }
}

async function aircallSync(headers) {
  if (aircallSyncInProgress) return;
  aircallSyncInProgress = true;

  try {
    const startOfDay = getBrisbaneStartOfDay();
    const now = Date.now();
    const doFullSync = !aircallLastFullSync || (now - aircallLastFullSync > AIRCALL_FULL_SYNC_INTERVAL);

    if (doFullSync) {
      // Full pagination — rebuild complete cache for today
      const newCache = new Map();
      let page = 1;
      let keepGoing = true;
      while (keepGoing) {
        const data = await aircallFetchPage(page, startOfDay, headers);
        if (!data) break;
        data.calls.forEach(c => newCache.set(c.id, c));
        if (data.meta?.next_page_link) { page++; } else { keepGoing = false; }
      }
      aircallCallsCache = newCache;
      aircallLastFullSync = Date.now();
      console.log(`[Aircall Server] Full sync: ${page} page(s), ${aircallCallsCache.size} calls cached`);
    } else {
      // Incremental — page 1 only, merge into cache
      const data = await aircallFetchPage(1, startOfDay, headers);
      if (data) {
        data.calls.forEach(c => aircallCallsCache.set(c.id, c));
      }
      console.log(`[Aircall Server] Incremental sync: ${aircallCallsCache.size} calls cached`);
    }
  } catch (err) {
    console.error('[Aircall Server] Sync error:', err.message);
  } finally {
    aircallSyncInProgress = false;
  }
}

function startAircallPolling(apiId, apiToken) {
  if (aircallPollingInterval) clearInterval(aircallPollingInterval);
  aircallCredentials = { apiId, apiToken };
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${apiId}:${apiToken}`).toString('base64'),
    'Content-Type': 'application/json',
  };

  // Reset caches for fresh credentials
  aircallCallsCache = new Map();
  aircallUsersCache = null;
  aircallTeamsCache = null;
  aircallLastFullSync = 0;

  (async () => {
    try {
      await aircallFetchUsers(headers);
      await aircallSync(headers);
    } catch (err) {
      console.error('[Aircall Server] Initial fetch error:', err.message);
    }
  })();

  aircallPollingInterval = setInterval(() => aircallSync(headers), 30000);
  console.log('[Aircall Server] Polling started (30s interval, max 2 req/min)');
}

app.get('/api/aircall/data', (_req, res) => {
  res.json({
    calls: Array.from(aircallCallsCache.values()),
    users: aircallUsersCache || {},
    allowedUserIds: aircallTeamsCache || null,
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, message: 'Server running.', lastWebhookReceivedAt });
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'Not found.' });
});

io.on('connection', (socket) => {
  console.log(`✅ Frontend socket connected successfully: ${socket.id}`);

  socket.on('set_stripe_key', (stripeKey) => {
    if (!stripeKey || typeof stripeKey !== 'string') {
      return;
    }

    stripe = new Stripe(stripeKey.trim(), {
      apiVersion: '2024-06-20',
    });
  });

  socket.on('set_anthropic_key', (key) => {
    if (!key || typeof key !== 'string') return;
    anthropicApiKey = key.trim();
  });

  socket.on('set_aircall_credentials', ({ apiId, apiToken }) => {
    if (!apiId || !apiToken || apiId === 'demo') return;
    // Only restart polling if credentials changed
    if (aircallCredentials?.apiId === apiId && aircallCredentials?.apiToken === apiToken) return;
    console.log(`[Aircall Server] Credentials received, starting polling...`);
    startAircallPolling(apiId, apiToken);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
