# Polica
Mobile-first EU crowdsourced retail execution platform for agents, retailer clients and administrators.

## Included
- Agent job discovery, search/filter UI, reservation sheet and active-job state
- Wallet, SEPA minimum and IBAN mod-97 validation utility
- Agent profile, GDPR controls, export/delete affordances and tax/scam notices
- Client campaign dashboard and admin review/payout/user overview
- English/Croatian routing with `next-intl`
- Supabase schema, RLS policies and atomic `reserve_job` function enforcing one active reservation
- Installable PWA manifest, icon and offline shell service worker
- GPS Haversine utility, barcode/camera dependencies and production-oriented data model

## Setup
1. Install Node.js 20+ and create a Supabase project.
2. Copy `.env.example` to `.env.local` and set all values.
3. Run `supabase/migrations/001_init.sql` in the Supabase SQL editor, or use the Supabase CLI migration workflow.
4. Install and start: `npm install && npm run dev`.
5. Seed after adding service-role credentials: `npm run seed`.

## Environment
- `NEXT_PUBLIC_SUPABASE_URL`: project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public browser key
- `SUPABASE_SERVICE_ROLE_KEY`: server/seed only. Never expose it to the browser.
- `NEXT_PUBLIC_APP_URL`: canonical URL

## Routes
- `/{locale}/jobs`, `/wallet`, `/profile`
- `/{locale}/client`
- `/{locale}/admin`

## Production hardening checklist
- Add server-side role guards to client/admin routes and admin-only RLS policies using JWT custom claims.
- Store photos in private Supabase Storage buckets using signed URLs; strip EXIF before upload.
- Encrypt full IBAN through a regulated payout provider; retain only last four digits in application data.
- Run reservation expiry on Supabase Cron and generate wallet entries only from an idempotent approval transaction.
- Add abuse controls, duplicate-image detection, rate limits, audit logs, DPA/retention schedules and localized terms.
- Replace demo data in `lib/data.ts` with server queries; wire MapLibre to a provider whose tile usage policy permits production traffic.
- Register `/sw.js` from a small client component and add generated 192/512 PNG icons for store-quality installation.

## Notes
The repository is a polished, runnable product foundation and interactive front-end, not a claim that payments, identity checks or GDPR compliance are complete without legal, security and provider review.
