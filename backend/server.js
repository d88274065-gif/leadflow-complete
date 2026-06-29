require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS - Vercel frontend ko allow karo
app.use(cors({
   origin: [
    process.env.FRONTEND_URL,
    'https://leadflow-complete.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// ✅ Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LeadFlow API running' });
});

// ✅ Stripe Price IDs - Apne Stripe dashboard se copy karo
const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID,         // price_xxx
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID  // price_xxx
};

// ✅ Checkout Session banao
app.post('/create-checkout-session', async (req, res) => {
  const { planId, orgId } = req.body;

  if (!planId || !PRICE_IDS[planId]) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: PRICE_IDS[planId],
          quantity: 1
        }
      ],
      success_url: `${process.env.FRONTEND_URL}/billing?success=true&plan=${planId}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=true`,
      metadata: {
        orgId: orgId,
        planId: planId
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Webhook - Payment complete hone pe subscription update karo
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { orgId, planId } = session.metadata;
    console.log(`✅ Payment success! Org: ${orgId}, Plan: ${planId}`);
    // Yahan Supabase update kar sakte ho
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`🚀 LeadFlow backend running on port ${PORT}`);
});
