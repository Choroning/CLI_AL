# Supabase setup

CLI_AL uses Supabase (Postgres) as its relational database, replacing the
SQLite/PostgreSQL options in the original PROJECT_PLAN.md.

## Apply the schema

After creating the Supabase project and grabbing your URL + keys (see root
`.env.example`):

1. Open Supabase Dashboard → **SQL Editor** → **New query**.
2. Paste the contents of `migrations/0001_init.sql` and click **Run**.
3. Confirm under **Table Editor** that `documents`, `rewrites`,
   `glossary_cache` exist.

## RLS at a glance

- All three tables have RLS **enabled**.
- `anon` and `authenticated` Postgres roles can `SELECT` everything (so the FE
  can read history without auth in the MVP).
- Nobody except the `service_role` Postgres role can write. The backend
  authenticates with the **secret API key** (`sb_secret_…`), which maps to
  `service_role` and bypasses RLS automatically.

> Note: the *role* names in Postgres (`anon`, `service_role`) are unchanged.
> Only the *API key* names changed: legacy `anon` → publishable, legacy
> `service_role` → secret. The SQL grants in `0001_init.sql` reference the
> roles, not the keys.

## Future migrations

Add `0002_*.sql`, `0003_*.sql` etc. and apply in order. We can graduate to the
Supabase CLI (`supabase migration up`) when the team is comfortable with it.
