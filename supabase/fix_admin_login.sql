-- =========================================================================
-- QUICK FIX: Admin Panel login not working / "Admin panel not opening"
-- -------------------------------------------------------------------------
-- Root cause: the very first schema.sql inserted the admin auth user
-- directly into auth.users, but left a few Supabase-Auth-internal text
-- columns as NULL. Supabase Auth (GoTrue) requires these columns to be
-- an empty string '' (never NULL) — if even one of them is NULL, EVERY
-- login attempt fails with a generic 500 "Database error querying schema"
-- error, which the Admin Panel shows as "Galat username ya password."
-- (making it look like the whole panel is broken / not opening).
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New Query -> Run.
-- Safe to run multiple times.
-- =========================================================================
update auth.users set
  confirmation_token          = coalesce(confirmation_token, ''),
  recovery_token               = coalesce(recovery_token, ''),
  email_change                 = coalesce(email_change, ''),
  email_change_token_new       = coalesce(email_change_token_new, ''),
  email_change_token_current   = coalesce(email_change_token_current, ''),
  phone_change                 = coalesce(phone_change, ''),
  phone_change_token           = coalesce(phone_change_token, ''),
  reauthentication_token       = coalesce(reauthentication_token, '')
where email = 'avinash@cwa-admin.local';

-- After running this, go to https://<your-site>/Avinash and log in with
-- Username: AVINASH   Password: AVINASH  (change immediately after login
-- from Settings -> Change Login inside the Admin Panel).
