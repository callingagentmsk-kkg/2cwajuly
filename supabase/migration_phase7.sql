-- =========================================================================
-- MIGRATION: Phase 7 — Per-chapter Video ON/OFF + per-PDF/PPT ON/OFF toggle
-- -------------------------------------------------------------------------
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New Query -> Run,
-- on your EXISTING project (the one already live on cwascienceclasses.com).
-- Safe to run multiple times (idempotent) and does NOT delete any existing
-- data — every chapter/resource defaults to "enabled = true" so nothing
-- currently visible on the site disappears after running this.
--
-- What this adds:
--   1. chapters.video_enabled (boolean, default true) — lets the Admin
--      Panel turn a chapter's video button ON or OFF for students without
--      deleting the chapter or its YouTube ID.
--   2. chapter_resources.enabled (boolean, default true) — lets the Admin
--      Panel turn any individual PDF/PPT resource button ON or OFF without
--      deleting it.
-- =========================================================================

alter table public.chapters add column if not exists video_enabled boolean not null default true;
alter table public.chapter_resources add column if not exists enabled boolean not null default true;

-- Done. After running this, open the Admin Panel -> Batches -> expand any
-- chapter -> you'll see a Video ON/OFF switch next to the video info, and
-- an ON/OFF switch on every PDF/PPT chip.
