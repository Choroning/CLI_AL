-- CLI_AL initial schema for the administrative-document rewriter (MVP).
-- Run this in the Supabase Dashboard -> SQL Editor -> New query, or via the Supabase CLI.
--
-- Tables:
--   documents       — original input texts
--   rewrites        — Solar-generated rewrite + structured fields, FK to documents
--   glossary_cache  — term -> definition cache for the /glossary endpoint (future)
--
-- RLS: enabled on all tables. Service role (used by backend) bypasses RLS.
-- Anonymous read access is allowed so the frontend can display history.
-- Anonymous writes are NOT allowed (writes go through the backend).

create extension if not exists "pgcrypto";

------------------------------------------------------------------------
-- documents
------------------------------------------------------------------------
create table if not exists public.documents (
    id              uuid primary key default gen_random_uuid(),
    created_at      timestamptz not null default now(),
    original_text   text not null,
    source          text,                       -- e.g. "paste", "pdf"
    metadata        jsonb not null default '{}'::jsonb
);

create index if not exists documents_created_at_idx
    on public.documents (created_at desc);

------------------------------------------------------------------------
-- rewrites
------------------------------------------------------------------------
create table if not exists public.rewrites (
    id                  uuid primary key default gen_random_uuid(),
    document_id         uuid not null references public.documents(id) on delete cascade,
    created_at          timestamptz not null default now(),
    rewrite_text        text not null,
    citations           jsonb not null default '[]'::jsonb,
    glossary            jsonb not null default '[]'::jsonb,
    key_info            jsonb not null default '[]'::jsonb,
    checklist           jsonb not null default '[]'::jsonb,
    groundedness_label  text,
    groundedness_badge  text,
    prompt_version      text not null default 'rewrite_v1',
    model               text
);

create index if not exists rewrites_created_at_idx
    on public.rewrites (created_at desc);
create index if not exists rewrites_document_id_idx
    on public.rewrites (document_id);

------------------------------------------------------------------------
-- glossary_cache (future use; populated when RAG corpus is wired up)
------------------------------------------------------------------------
create table if not exists public.glossary_cache (
    term            text primary key,
    definition      text not null,
    example         text,
    sources         jsonb not null default '[]'::jsonb,
    updated_at      timestamptz not null default now()
);

------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------
alter table public.documents      enable row level security;
alter table public.rewrites       enable row level security;
alter table public.glossary_cache enable row level security;

-- Drop-and-create so this migration is idempotent on Supabase re-runs.
drop policy if exists "anon read documents"      on public.documents;
drop policy if exists "anon read rewrites"       on public.rewrites;
drop policy if exists "anon read glossary"       on public.glossary_cache;

create policy "anon read documents"
    on public.documents for select
    to anon, authenticated
    using (true);

create policy "anon read rewrites"
    on public.rewrites for select
    to anon, authenticated
    using (true);

create policy "anon read glossary"
    on public.glossary_cache for select
    to anon, authenticated
    using (true);

-- Writes are intentionally NOT granted to anon. The backend uses
-- service_role, which bypasses RLS entirely.
