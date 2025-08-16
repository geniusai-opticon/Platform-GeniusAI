
import { stripe } from "../../../lib/stripe";
export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
  try {
    const { email, referral } = req.body || {};
    if(!email) return res.status(400).json({error:'email_required'});

    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];
    if(!customer) customer = await stripe.customers.create({ email });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: process.env.PRICE_ID_MONTHLY, quantity: 1 }],
      metadata: { email, referral: referral || '' },
      allow_promotion_codes: true,
      success_url: process.env.SUCCESS_URL || 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.CANCEL_URL || 'https://example.com/cancel'
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({error:'checkout_error'});
  }
}
