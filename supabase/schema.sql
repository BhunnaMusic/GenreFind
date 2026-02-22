-- ============================================================
-- GenreFind · Supabase PostgreSQL Schema
-- ============================================================
-- Run this SQL in the Supabase SQL Editor to set up the
-- "tracks" table used as the cache-first metadata store.
-- ============================================================

-- Enable the UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================================
-- tracks
-- ============================================================
-- Primary metadata cache for every track that has been looked
-- up.  The cache-first flow is:
--   [Search Request]
--     → [Check Supabase by spotify_id]
--     → [If NULL, fetch Spotify + YouTube + Musixmatch]
--     → [Store result in Supabase]
--     → [Display to user]
-- ============================================================
create table if not exists public.tracks (
  -- Primary key
  id            uuid primary key default uuid_generate_v4(),

  -- Identifiers
  isrc          text unique,            -- International Standard Recording Code
  spotify_id    text unique not null,   -- Spotify track ID

  -- Basic metadata
  title         text not null,
  artist        text not null,
  album         text,
  album_art_url text,
  duration_ms   integer,

  -- Technical DJ metadata (from Spotify Audio Features)
  bpm           numeric(6, 2),          -- Beats per minute (tempo)
  key           smallint check (key between -1 and 11),   -- Pitch class (0–11) or -1 if unknown
  mode          smallint check (mode in (0, 1)),          -- 0 = minor, 1 = major
  camelot       text,                   -- Computed Camelot Wheel notation, e.g. "8A", "11B"
  key_name      text,                   -- Human-readable key, e.g. "A minor"
  time_signature smallint,              -- Beats per measure

  -- 0–1 float scores from Spotify (stored as 0–100 integers for readability)
  energy        smallint check (energy between 0 and 100),
  danceability  smallint check (danceability between 0 and 100),
  valence       smallint check (valence between 0 and 100),  -- Musical positivity

  -- Genre / style tags (aggregated from multiple APIs)
  genres        text[],

  -- Contextual content
  lyrics        text,                   -- Full lyrics text
  lyric_meaning text,                   -- AI-generated lyric interpretation
  backstory     text,                   -- Track origin / production history

  -- Fallback / secondary sources
  youtube_id    text,                   -- YouTube video ID for fallback playback

  -- Related tracks (list of spotify_ids)
  similar_track_ids text[],

  -- Housekeeping
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Automatically update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tracks_set_updated_at on public.tracks;
create trigger tracks_set_updated_at
  before update on public.tracks
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
create index if not exists idx_tracks_spotify_id  on public.tracks (spotify_id);
create index if not exists idx_tracks_isrc        on public.tracks (isrc);
create index if not exists idx_tracks_artist      on public.tracks using gin (to_tsvector('english', artist));
create index if not exists idx_tracks_title       on public.tracks using gin (to_tsvector('english', title));
create index if not exists idx_tracks_camelot     on public.tracks (camelot);
create index if not exists idx_tracks_bpm         on public.tracks (bpm);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.tracks enable row level security;

-- Allow all authenticated users to read cached tracks
create policy "tracks_select_authenticated"
  on public.tracks for select
  to authenticated
  using (true);

-- Allow all authenticated users to insert new tracks
create policy "tracks_insert_authenticated"
  on public.tracks for insert
  to authenticated
  with check (true);

-- Allow all authenticated users to update tracks (cache refresh)
create policy "tracks_update_authenticated"
  on public.tracks for update
  to authenticated
  using (true);

-- Allow anonymous (anon) users read-only access
create policy "tracks_select_anon"
  on public.tracks for select
  to anon
  using (true);
