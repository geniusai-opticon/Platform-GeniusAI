
# GENIUS.AI.SOLUTION – Netlify-ready (Next.js 14, Supabase, Stripe, NextAuth)

## Neu
- Stripe Webhook (Netlify Function) aktualisiert `registrations.paid=true, paid_at=now()` anhand der Checkout-Email.

## Deploy
1) Repo pushen (GitHub) und in Netlify importieren (Preset: Next.js).
2) ENV aus `.env.example` in Netlify setzen (Production + Deploy Previews).
3) Supabase SQL `db/setup.sql` im SQL Editor ausführen.
4) Stripe Webhook-Endpoint: `/api/stripe/webhook` → Events: `checkout.session.completed`, `invoice.paid`.

## Wichtige ENV
- `SUPABASE_SERVICE_ROLE_KEY` **nur** in Netlify setzen (nicht ins Repo).
- `NEXT_PUBLIC_BASE_URL` = deine Netlify Domain.

## Endpunkte
- `GET /api/stats`
- `POST /api/register`
- `POST /api/stripe/checkout`
- `POST /api/stripe/webhook` (Netlify Function)
