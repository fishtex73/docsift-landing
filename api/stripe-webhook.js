// api/stripe-webhook.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Stripe will only send POST requests
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Read the raw request body
    let chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');

    // Parse the JSON Stripe sends
    const event = JSON.parse(rawBody);

    // Basic routing on event type
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      console.log('✅ Checkout session completed:');
      console.log('  id:', session.id);
      console.log('  customer_email:', session.customer_details?.email);
      console.log('  amount_total:', session.amount_total);
      console.log('  payment_status:', session.payment_status);

      // Later:
      // - generate or look up activation code
      // - store in DB
      // - send email to customer
    } else {
      console.log('Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Error handling webhook:', err);
    res.status(400).json({ error: 'Webhook handler error' });
  }
}
