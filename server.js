import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { URL, URLSearchParams } from 'node:url';

const port = Number(globalThis.process.env.PORT || 3000);
const stripeSecretKey = globalThis.process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = globalThis.process.env.STRIPE_WEBHOOK_SECRET || '';
const stripePriceId = globalThis.process.env.STRIPE_PRICE_ID || '';
const frontendUrl = globalThis.process.env.FRONTEND_URL || 'http://localhost:5173';

const successEvents = [];

const writeJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const collectRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(globalThis.Buffer.concat(chunks)));
    req.on('error', reject);
  });

const parseJsonBody = async (req) => {
  const rawBody = await collectRawBody(req);
  if (!rawBody.length) return {};
  return JSON.parse(rawBody.toString('utf8'));
};

const stripeFetch = async (path, options = {}) => {
  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY in .env');
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe API request failed (${response.status})`);
  }

  return data;
};

const parseStripeSignatureHeader = (headerValue) => {
  if (!headerValue || typeof headerValue !== 'string') {
    return { timestamp: null, signatures: [] };
  }

  const parts = headerValue.split(',').map((segment) => segment.trim());
  let timestamp = null;
  const signatures = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = Number(value);
    if (key === 'v1') signatures.push(value);
  }

  return { timestamp, signatures };
};

const safeCompareHex = (a, b) => {
  try {
    const aBuffer = globalThis.Buffer.from(a, 'hex');
    const bBuffer = globalThis.Buffer.from(b, 'hex');
    if (aBuffer.length !== bBuffer.length) return false;
    return timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
};

const verifyStripeWebhook = (rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300) => {
  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) {
    throw new Error('Malformed Stripe-Signature header');
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    throw new Error('Stripe signature timestamp outside tolerance window');
  }

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expectedSignature = createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
  const valid = signatures.some((sig) => safeCompareHex(sig, expectedSignature));

  if (!valid) {
    throw new Error('Webhook signature verification failed');
  }
};

const queueSuccessEvent = ({ customerName, businessName, email }) => {
  successEvents.unshift({
    id: `evt_local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    customerName,
    businessName,
    email,
    timestamp: Date.now(),
    delivered: false,
  });

  if (successEvents.length > 100) {
    successEvents.length = 100;
  }
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return writeJson(res, 200, {
      ok: true,
      stripeConfigured: Boolean(stripeSecretKey),
      webhookConfigured: Boolean(stripeWebhookSecret),
      pendingEvents: successEvents.filter((event) => !event.delivered).length,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/stripe/create-checkout-session') {
    try {
      const body = await parseJsonBody(req);
      const customerName = String(body?.customerName || '').trim();
      const businessName = String(body?.businessName || '').trim();
      const email = String(body?.email || '').trim();

      if (!customerName || !businessName || !email) {
        return writeJson(res, 400, { ok: false, message: 'customerName, businessName and email are required.' });
      }

      if (!stripePriceId) {
        return writeJson(res, 500, { ok: false, message: 'Missing STRIPE_PRICE_ID in .env' });
      }

      const payload = new URLSearchParams();
      payload.set('mode', 'payment');
      payload.set('line_items[0][price]', stripePriceId);
      payload.set('line_items[0][quantity]', '1');
      payload.set('customer_creation', 'always');
      payload.set('customer_email', email);
      payload.set('metadata[customer_name]', customerName);
      payload.set('metadata[business_name]', businessName);
      payload.set('payment_intent_data[metadata][customer_name]', customerName);
      payload.set('payment_intent_data[metadata][business_name]', businessName);
      payload.set('custom_fields[0][key]', 'business_name');
      payload.set('custom_fields[0][label][type]', 'custom');
      payload.set('custom_fields[0][label][custom]', 'Business name');
      payload.set('custom_fields[0][type]', 'text');
      payload.set('success_url', `${frontendUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
      payload.set('cancel_url', `${frontendUrl}?checkout=cancelled`);

      const session = await stripeFetch('checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      });

      return writeJson(res, 200, { ok: true, sessionId: session.id, url: session.url });
    } catch (error) {
      return writeJson(res, 500, { ok: false, message: error.message || 'Unable to create checkout session' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/stripe/webhook') {
    try {
      const rawBody = await collectRawBody(req);
      const signatureHeader = String(req.headers['stripe-signature'] || '');

      if (!stripeWebhookSecret) {
        return writeJson(res, 500, { ok: false, message: 'Missing STRIPE_WEBHOOK_SECRET in .env' });
      }

      verifyStripeWebhook(rawBody, signatureHeader, stripeWebhookSecret);

      const event = JSON.parse(rawBody.toString('utf8'));

      if (event.type === 'checkout.session.completed') {
        const session = event?.data?.object || {};
        const customerName =
          String(session?.customer_details?.name || '').trim() ||
          String(session?.metadata?.customer_name || '').trim() ||
          'Unknown customer';
        const email =
          String(session?.customer_details?.email || '').trim() ||
          String(session?.customer_email || '').trim();
        const businessName =
          String(session?.metadata?.business_name || '').trim() ||
          String(
            Array.isArray(session?.custom_fields)
              ? session.custom_fields.find((field) => field?.key === 'business_name')?.text?.value || ''
              : ''
          ).trim() ||
          'Unknown business';

        queueSuccessEvent({ customerName, businessName, email });
      }

      return writeJson(res, 200, { ok: true, received: true });
    } catch (error) {
      return writeJson(res, 400, { ok: false, message: `Webhook error: ${error.message}` });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/latest-success') {
    const event = successEvents.find((entry) => !entry.delivered);
    if (!event) {
      return writeJson(res, 200, { hasNew: false });
    }

    event.delivered = true;

    return writeJson(res, 200, {
      hasNew: true,
      customerName: event.customerName,
      businessName: event.businessName,
      email: event.email,
      timestamp: event.timestamp,
      message: 'New Client Onboarding Success',
    });
  }

  return writeJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(port, () => {
  console.log(`Stripe helper server running at http://localhost:${port}`);
});
