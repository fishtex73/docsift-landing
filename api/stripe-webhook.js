// api/stripe-webhook.js

import Stripe from 'stripe';

// Create a Stripe client using your secret key from environment variables.
// NOTE: This key must also be set in your Vercel project env vars.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Webhook signing secret from Stripe Dashboard → Developers → Webhooks → your destination
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Helper to collect the raw request body (required for signature verification)
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).send('Method Not Allowed');
    return;
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      console.error('❌ Missing Stripe signature header');
      res.status(400).send('Missing Stripe signature');
      return;
    }

    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event types you care about
  try {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      console.log('✅ checkout.session.completed');
      console.log('  id:', session.id);
      console.log('  customer_email:', session.customer_details?.email);
      console.log('  amount_total:', session.amount_total);
      console.log('  payment_status:', session.payment_status);

      // TODO later:
      // - generate / retrieve activation code
      // - store in DB with email
      // - send email with code

      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;

      console.log('✅ invoice.paid');
      console.log('  id:', invoice.id);
      console.log('  customer:', invoice.customer);
      console.log('  total:', invoice.total);

      // TODO later:
      // - update subscription status in DB if needed

      break;
    }

    default: {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  }

  res.json({ received: true });
} catch (err) {
  console.error('❌ Error handling event:', err);
  res.status(500).json({ error: 'Webhook handler error' });
}

}
