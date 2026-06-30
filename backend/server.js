require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS - Sab origins allow karo (sabse safe fix)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// ✅ Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LeadFlow API running' });
});

// ✅ Stripe Price IDs
const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID
};

// ✅ Checkout Session - /api/ ke saath bhi, bina bhi dono kaam karein
app.post('/api/create-checkout-session', handleCheckout);
app.post('/create-checkout-session', handleCheckout);

async function handleCheckout(req, res) {
  const { planId, orgId } = req.body;

  console.log('Checkout request:', { planId, orgId });

  if (!planId || !PRICE_IDS[planId]) {
    return res.status(400).json({ error: 'Invalid plan: ' + planId });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: PRICE_IDS[planId], quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/billing?success=true&plan=${planId}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=true`,
      metadata: { orgId: orgId || '', planId }
    });

    console.log('Session created:', session.id);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// ✅ Webhook
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`✅ Payment success! Org: ${session.metadata.orgId}, Plan: ${session.metadata.planId}`);
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`🚀 LeadFlow backend running on port ${PORT}`);
});

