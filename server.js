import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { URL } from 'node:url';

const port = Number(globalThis.process?.env?.PORT || 8787);

let stripeSecretKey = '';
const sseClients = new Set();

const writeJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Stripe-Signature',
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
  const raw = await collectRawBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString('utf8'));
};

const parseStripeSignatureHeader = (headerValue) => {
  if (!headerValue || typeof headerValue !== 'string') {
    return { timestamp: null, signatures: [] };
  }

  const parts = headerValue.split(',').map((segment) => segment.trim());
  let timestamp = null;
  const signatures = [];

  parts.forEach((part) => {
    const [key, value] = part.split('=');
    if (!key || !value) return;
    if (key === 't') {
      timestamp = Number(value);
      return;
    }
    if (key === 'v1') {
      signatures.push(value);
    }
  });

  return { timestamp, signatures };
};

const safeCompareHex = (a, b) => {
  if (!a || !b) return false;
  try {
    const bufferA = globalThis.Buffer.from(a, 'hex');
    const bufferB = globalThis.Buffer.from(b, 'hex');
    if (bufferA.length !== bufferB.length) return false;
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
};

const verifyStripeWebhook = (rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300) => {
  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) {
    throw new Error('Malformed Stripe-Signature header.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    throw new Error('Stripe webhook signature is outside the tolerated timestamp window.');
  }

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
  const matches = signatures.some((candidate) => safeCompareHex(candidate, expected));
  if (!matches) {
    throw new Error('Webhook signature validation failed.');
  }
};

const emitStripeSuccess = (payload) => {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((client) => client.write(data));
};

const stripeFetch = async (path, options = {}) => {
  if (!stripeSecretKey) throw new Error('Stripe key is not configured.');

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      ...(options.headers || {}),
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || `Stripe API request failed (${response.status}).`);
  }
  return json;
};

const cleanName = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const firstNonEmpty = (...values) => values.map(cleanName).find(Boolean) || '';

const extractCustomFieldValue = (customFields, keyMatchers = []) => {
  if (!Array.isArray(customFields)) return '';

  const keySet = keyMatchers.map((item) => String(item || '').toLowerCase());
  for (const field of customFields) {
    const key = String(field?.key || '').toLowerCase();
    if (!key) continue;
    if (!keySet.some((candidate) => key.includes(candidate))) continue;

    const value = firstNonEmpty(
      field?.text?.value,
      field?.dropdown?.value,
      field?.numeric?.value ? String(field.numeric.value) : ''
    );
    if (value) return value;
  }

  return '';
};

const extractBusinessName = (object, related = {}) => {
  const metadata = object?.metadata || {};
  const customerMetadata = related?.customer?.metadata || {};
  const invoiceMetadata = related?.invoice?.metadata || {};
  const paymentIntentMetadata = related?.paymentIntent?.metadata || {};

  return firstNonEmpty(
    object?.customer_details?.business_name,
    object?.customer_details?.company,
    object?.shipping?.name,
    object?.business_name,
    related?.invoice?.account_name,
    metadata.business_name,
    metadata.company_name,
    metadata.company,
    invoiceMetadata.business_name,
    paymentIntentMetadata.business_name,
    customerMetadata.business_name,
    customerMetadata.company_name,
    customerMetadata.company,
    extractCustomFieldValue(object?.custom_fields, ['business', 'company'])
  );
};

const NEW_CUSTOMER_METADATA_KEYS = [
  'new_customer',
  'first_payment',
  'first_successful_payment',
  'onboarding',
  'trigger_onboarding',
];

const isTruthyMetadataValue = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const hasNewCustomerMetadata = (...objects) => {
  for (const candidate of objects) {
    const metadata = candidate?.metadata || {};
    const hasFlag = NEW_CUSTOMER_METADATA_KEYS.some((key) => isTruthyMetadataValue(metadata[key]));
    if (hasFlag) return true;
  }
  return false;
};

const getObjectId = (candidate) => {
  if (!candidate) return '';
  if (typeof candidate === 'string') return candidate;
  return String(candidate.id || '').trim();
};

const dedupeCache = new Map();

const wasRecentlyEmitted = (key) => {
  const now = Date.now();
  const ttlMs = 1000 * 60 * 30;

  for (const [cacheKey, createdAt] of dedupeCache.entries()) {
    if (now - createdAt > ttlMs) dedupeCache.delete(cacheKey);
  }

  if (dedupeCache.has(key)) return true;
  dedupeCache.set(key, now);
  return false;
};

const buildPaymentDedupeKey = (event, object, related = {}) => {
  const paymentIntentId = getObjectId(related?.paymentIntent || object?.payment_intent);
  const invoiceId = getObjectId(related?.invoice || object?.invoice);
  const checkoutSessionId = event?.type?.startsWith('checkout.session') ? getObjectId(object) : '';
  const chargeId = getObjectId(related?.charge || object?.latest_charge);

  return firstNonEmpty(paymentIntentId, invoiceId, checkoutSessionId, chargeId, event?.id);
};

const isNewCustomerPayment = async (event, object, related = {}) => {
  const customer = related?.customer;
  const invoice = related?.invoice;
  const paymentIntent = related?.paymentIntent;

  if (hasNewCustomerMetadata(object, invoice, paymentIntent, customer)) return true;

  if (invoice?.billing_reason === 'subscription_create') return true;
  if (event?.type?.startsWith('checkout.session') && object?.mode === 'setup') return false;

  const customerId = getObjectId(customer || object?.customer || paymentIntent?.customer || invoice?.customer);
  if (!customerId || !stripeSecretKey) return false;

  try {
    const [paymentIntents, invoices] = await Promise.all([
      stripeFetch(`payment_intents?customer=${encodeURIComponent(customerId)}&limit=2`),
      stripeFetch(`invoices?customer=${encodeURIComponent(customerId)}&status=paid&limit=2`),
    ]);

    const successfulPayments = Number(paymentIntents?.data?.length || 0);
    const paidInvoices = Number(invoices?.data?.length || 0);

    if (successfulPayments <= 1 || paidInvoices <= 1) return true;
  } catch (error) {
    console.warn(`Unable to evaluate first-payment status for customer ${customerId}.`, error?.message || error);
  }

  return false;
};

const extractCustomerName = (object, related = {}) => {
  const metadata = object?.metadata || {};
  const customerMetadata = related?.customer?.metadata || {};

  return firstNonEmpty(
    object?.customer_details?.name,
    object?.billing_details?.name,
    object?.shipping?.name,
    related?.charge?.billing_details?.name,
    related?.invoice?.customer_name,
    related?.customer?.name,
    metadata.customer_name,
    customerMetadata.customer_name,
    object?.customer_email,
    object?.receipt_email,
    related?.customer?.email,
    related?.invoice?.customer_email
  );
};

const fetchExpandedObject = async (event) => {
  const fallback = { object: event?.data?.object || {}, related: {} };
  if (!stripeSecretKey) return fallback;

  const object = event?.data?.object || {};

  try {
    if (
      event?.type === 'checkout.session.completed' ||
      event?.type === 'checkout.session.async_payment_succeeded'
    ) {
      if (!object?.id) return fallback;
      const params = new URLSearchParams([
        ['expand[]', 'customer'],
        ['expand[]', 'payment_intent.customer'],
        ['expand[]', 'invoice.customer'],
      ]);
      const session = await stripeFetch(`checkout/sessions/${object.id}?${params.toString()}`);
      const paymentIntent = typeof session?.payment_intent === 'object' ? session.payment_intent : null;
      const invoice = typeof session?.invoice === 'object' ? session.invoice : null;

      return {
        object: session,
        related: {
          customer: typeof session?.customer === 'object' ? session.customer : null,
          paymentIntent,
          charge: typeof paymentIntent?.latest_charge === 'object' ? paymentIntent.latest_charge : null,
          invoice,
        },
      };
    }

    if (event?.type === 'payment_intent.succeeded') {
      if (!object?.id) return fallback;
      const params = new URLSearchParams([
        ['expand[]', 'customer'],
        ['expand[]', 'latest_charge'],
      ]);
      const paymentIntent = await stripeFetch(`payment_intents/${object.id}?${params.toString()}`);
      return {
        object: paymentIntent,
        related: {
          customer: typeof paymentIntent?.customer === 'object' ? paymentIntent.customer : null,
          paymentIntent,
          charge: typeof paymentIntent?.latest_charge === 'object' ? paymentIntent.latest_charge : null,
          invoice: null,
        },
      };
    }

    if (event?.type === 'invoice.payment_succeeded') {
      if (!object?.id) return fallback;
      const params = new URLSearchParams([
        ['expand[]', 'customer'],
        ['expand[]', 'payment_intent.customer'],
      ]);
      const invoice = await stripeFetch(`invoices/${object.id}?${params.toString()}`);
      const paymentIntent = typeof invoice?.payment_intent === 'object' ? invoice.payment_intent : null;

      return {
        object: invoice,
        related: {
          customer: typeof invoice?.customer === 'object' ? invoice.customer : null,
          paymentIntent,
          charge: typeof paymentIntent?.latest_charge === 'object' ? paymentIntent.latest_charge : null,
          invoice,
        },
      };
    }

    if (event?.type === 'charge.succeeded') {
      if (!object?.id) return fallback;
      const params = new URLSearchParams([
        ['expand[]', 'customer'],
        ['expand[]', 'payment_intent.customer'],
      ]);
      const charge = await stripeFetch(`charges/${object.id}?${params.toString()}`);
      const paymentIntent = typeof charge?.payment_intent === 'object' ? charge.payment_intent : null;

      return {
        object: charge,
        related: {
          customer: typeof charge?.customer === 'object' ? charge.customer : null,
          paymentIntent,
          charge,
          invoice: null,
        },
      };
    }
  } catch (error) {
    console.warn(`Unable to expand Stripe event ${event?.type || 'unknown'}.`, error?.message || error);
  }

  return fallback;
};

const toSuccessPayload = async (event) => {
  const { object, related } = await fetchExpandedObject(event);
  const businessName = extractBusinessName(object, related);
  const customerName = extractCustomerName(object, related);
  const isNewCustomer = await isNewCustomerPayment(event, object, related);
  const dedupeKey = buildPaymentDedupeKey(event, object, related);
  const shouldEmit = isNewCustomer && !wasRecentlyEmitted(dedupeKey);
  const displayName = businessName || 'New client';

  return {
    type: 'payment_succeeded',
    eventType: event.type,
    eventId: event.id,
    mode: event?.livemode ? 'live' : 'test',
    businessName,
    customerName,
    displayName,
    isNewCustomer,
    shouldEmit,
    amount: Number(object.amount_received || object.amount_total || object.amount || 0),
    currency: object.currency || 'usd',
    created: event.created || Math.floor(Date.now() / 1000),
  };
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Stripe-Signature',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return writeJson(res, 200, {
      ok: true,
      message: 'Server running with Stripe webhook + event bridge.',
      stripeConfigured: Boolean(stripeSecretKey),
      sseClients: sseClients.size,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/stripe/config') {
    try {
      const body = await parseJsonBody(req);
      const secretKey = String(body?.secretKey || '').trim();

      if (!secretKey.startsWith('sk_')) {
        return writeJson(res, 400, { ok: false, message: 'Provide a valid Stripe secret key (sk_...).'});
      }

      stripeSecretKey = secretKey;
      return writeJson(res, 200, { ok: true, message: 'Stripe key configured.' });
    } catch (error) {
      return writeJson(res, 400, { ok: false, message: error.message || 'Invalid request.' });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/stripe/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', now: Date.now() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });

    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/stripe/simulate-success') {
    try {
      const body = await parseJsonBody(req);
      const payload = {
        type: 'payment_succeeded',
        eventType: 'checkout.session.completed',
        eventId: `sim_${Date.now()}`,
        mode: 'test',
        businessName: body.businessName || '',
        customerName: body.customerName || 'Simulation Customer',
        displayName: body.businessName || body.customerName || 'Simulation Customer',
        amount: 10000,
        currency: 'usd',
        created: Math.floor(Date.now() / 1000),
      };
      emitStripeSuccess(payload);
      return writeJson(res, 200, { ok: true, payload });
    } catch (error) {
      return writeJson(res, 400, { ok: false, message: error.message || 'Simulation failed.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/stripe/request') {
    try {
      const body = await parseJsonBody(req);
      const method = String(body?.method || 'GET').toUpperCase();
      const path = String(body?.path || '').replace(/^\/+/, '');

      if (!path) {
        return writeJson(res, 400, { ok: false, message: 'A Stripe API path is required.' });
      }

      const payload = body?.payload || null;
      const options = { method };

      if (payload && method !== 'GET') {
        options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        options.body = new URLSearchParams(payload).toString();
      }

      const data = await stripeFetch(path, options);
      return writeJson(res, 200, { ok: true, data });
    } catch (error) {
      return writeJson(res, 400, { ok: false, message: error.message || 'Stripe request failed.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/stripe/webhook') {
    const webhookSecret = globalThis.process?.env?.STRIPE_WEBHOOK_SECRET;

    try {
      const rawBody = await collectRawBody(req);
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return writeJson(res, 400, { ok: false, message: 'Missing Stripe-Signature header.' });
      }

      if (webhookSecret) {
        verifyStripeWebhook(rawBody, String(signature), webhookSecret);
      }

      const event = JSON.parse(rawBody.toString('utf8'));

      const isSuccessEvent =
        event?.type === 'payment_intent.succeeded' ||
        event?.type === 'checkout.session.completed' ||
        event?.type === 'checkout.session.async_payment_succeeded' ||
        event?.type === 'invoice.payment_succeeded' ||
        event?.type === 'charge.succeeded';
      if (isSuccessEvent) {
        const payload = await toSuccessPayload(event);
        if (payload.shouldEmit) {
          emitStripeSuccess(payload);
        }
      }

      return writeJson(res, 200, { ok: true, received: true });
    } catch (error) {
      return writeJson(res, 400, { ok: false, message: `Webhook error: ${error.message}` });
    }
  }

  return writeJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(port, () => {
  console.log(`Dashboard helper server running on :${port}`);
});
