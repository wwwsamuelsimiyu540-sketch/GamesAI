# Sports Intelligence AI

A mobile-first, multi-sport sports information and statistical analysis platform.

## Current frontend integration
- Browser frontend connected to the Sports Intelligence AI Supabase project using its public publishable key.
- Sports catalogue loads from `public.sports`.
- Match centre loads match records from `public.matches`, with related teams and competitions.
- Database-backed user sign-in/sign-up and personal match watchlist.
- No fabricated fixtures or results are shown. Empty database tables display an explicit empty state.
- Match data is read-only in the browser; verified data imports must be performed by trusted server-side functions.

## Database
The Supabase database contains the sports catalogue, competitions, seasons, teams, players, memberships, matches, events, statistics, team form, player statistics, data-source metadata, sync logs, user watchlists and neutral model evaluation records. Row Level Security is enabled on all public tables.

## Security
- Only the Supabase publishable key is present in browser code. It is designed for public clients.
- Never place a Supabase secret/service-role key or sports-provider API key in frontend files.
- Public match and catalogue data is read-only for browser users.
- User watchlists are restricted by RLS to the signed-in owner.
- Operational logs and internal model-evaluation tables are not exposed to browser users.

## Data accuracy
A database connection does not mean live sports data is connected. Fixtures, results and statistics remain empty until an authorized sports-data provider is configured and data is imported. The interface displays only database records and does not label sample data as live.

## Deploy with GitHub Pages
1. Open repository Settings.
2. Select Pages.
3. Choose deployment from branch `main` and folder `/ (root)`.
4. Save and wait for deployment.

## Next steps
1. Select an authorized sports-data provider and verify its coverage/licensing.
2. Store its API credential as a Supabase Edge Function secret.
3. Implement scheduled server-side imports with data-source attribution and sync logs.
4. Add neutral performance analysis and evaluate it on held-out completed matches.

The platform is for sports information, performance analysis and educational statistical research. It does not provide betting tips, betting slips or guaranteed outcomes.
