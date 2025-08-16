
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let evt;
  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
    evt = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (evt.type === 'checkout.session.completed') {
      const session = evt.data.object;
      const email = (session.customer_details && session.customer_details.email) || session.customer_email;
      if (email) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase
          .from('registrations')
          .update({ paid: true, paid_at: new Date().toISOString() })
          .eq('email', email);
        if (error) console.error('Supabase update error:', error.message);
      } else {
        console.warn('No email in checkout.session.completed');
      }
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'Internal Error' };
  }
};
