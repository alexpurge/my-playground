import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import Stripe from 'stripe';
import { Server as SocketIOServer } from 'socket.io';

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

const newlyCreatedCustomerIds = new Set();

app.use(cors());

app.post('/webhook', express.json(), (req, res) => {
  const event = req.body;

  console.log(`\n\x1b[1;95m🔔 [STRIPE EVENT RECEIVED] -> ${event.type}\x1b[0m`);

  if (event.type === 'customer.created') {
    const customer = event.data.object;
    if (customer?.id) {
      newlyCreatedCustomerIds.add(customer.id);
    }
  }

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

    if (!isNewlyCreatedCustomer) {
      console.log('⚠️ Strict rule bypassed for testing: Firing pop-up for existing/test customer');
    }

    io.emit('sale_cleared', {
      customerName,
      businessName,
      paymentAmount: amountCents / 100,
    });

    if (customerId && isNewlyCreatedCustomer) {
      newlyCreatedCustomerIds.delete(customerId);
    }
  }

  res.status(200).json({ received: true });
});

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, message: 'Server running.' });
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

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
