-- =========================================================================
-- CWA SCIENCE CLASSES — Supabase Database Schema
-- Paste this WHOLE file into Supabase Dashboard -> SQL Editor -> New Query
-- -> Run.  Safe to re-run (uses IF NOT EXISTS / DROP ... IF EXISTS guards).
-- =========================================================================

-- Needed for password hashing (crypt/gen_salt) used by the admin login
-- and for the auth.users seed row below. Supabase projects already have
-- pgcrypto available, this just makes sure.
create extension if not exists pgcrypto;

-- =========================================================================
-- 1. SITE SETTINGS  (single-row key/value store for everything editable
--    that isn't a list: logo, footer, address, timing, socials, terms,
--    about/mentor text, batches section heading, cashfree config, etc.)
-- =========================================================================
create table if not exists public.site_settings (
  id           int primary key default 1,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.site_settings (id, data)
values (1, jsonb_build_object(
  'logo_url', 'assets/img/logo.webp',
  'site_title', 'CWA SCIENCE CLASSES',
  'site_tagline', 'Concept with Abhishek',
  'about_teacher_name', 'Abhishek Garg Sir',
  'about_role', 'Physics • Chemistry • Maths Expert Faculty',
  'about_image_url', 'assets/img/teacher.webp',
  'about_text', 'CWA SCIENCE CLASSES mein Physics, Chemistry aur Maths — teeno subjects sirf Abhishek Garg Sir hi padhate hain. Ek hi teacher se poora PCM padhne ka fayda ye hai ki concepts aapas mein connect hote hain aur students ko subjects better samajh aate hain.',
  'batches_heading', 'Class 9 se 12 tak PCM Batches',
  'batches_subheading', 'Har class ke liye Physics, Chemistry aur Maths ke batch — sath mein video lecture aur PDF notes.',
  'helpline_number', '+91 6207434940',
  'whatsapp_link', 'https://wa.me/916207434940',
  'address', 'CWA SCIENCE CLASSES, Patel High School Road Maheshkhunt (Godavari Complex), Bihar - India',
  'class_timing', 'Monday - Saturday | 8:00 AM - 8:00 PM',
  'email', 'info@cwascienceclasses.com',
  'map_embed_url', 'https://www.google.com/maps?q=Bihar,India&output=embed',
  'social_youtube', 'https://youtube.com',
  'social_facebook', 'https://facebook.com',
  'social_instagram', 'https://instagram.com',
  'terms_content', 'Terms & Conditions content — edit this from the Admin Panel.',
  'policy_content', 'Privacy Policy content — edit this from the Admin Panel.',
  'result_validity_days', 3,
  'cashfree_mode', 'test',
  'cashfree_app_id', ''
))
on conflict (id) do nothing;

-- =========================================================================
-- 2. HERO SLIDES
-- =========================================================================
create table if not exists public.hero_slides (
  id           bigint generated always as identity primary key,
  sort_order   int not null default 0,
  eyebrow      text,
  line1        text,
  line2        text,
  highlight    text,
  description  text,
  image_url    text,
  btn1_text    text,
  btn1_link    text,
  btn2_text    text,
  btn2_link    text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- =========================================================================
-- 3. NOTICE MARQUEE
-- =========================================================================
create table if not exists public.notices (
  id           bigint generated always as identity primary key,
  text         text not null,
  sort_order   int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- =========================================================================
-- 4. BATCHES -> SUBJECTS -> CHAPTERS -> CHAPTER RESOURCES (video + N pdfs)
-- =========================================================================
create table if not exists public.batches (
  id            text primary key,          -- e.g. 'class9', 'class10' ... extensible beyond 12
  class_name    text not null,             -- e.g. '9', '10', '11', '12', '13' (future)
  title         text not null,             -- e.g. 'Class 9 PCM'
  subtitle      text,                      -- e.g. 'Bihar Board | NCERT Based'
  color         text default '#6C63FF',
  icon          text default 'seedling',
  image_url     text,
  offer_text    text,                      -- e.g. '20% OFF Limited Time'
  price         text,                      -- e.g. '999' or '999/-'
  payment_link  text,                      -- Cashfree hosted payment-link URL (optional)
  is_free       boolean not null default true,  -- true = free/open batch, false = paid/locked batch
  sort_order    int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- For existing databases created before this column existed:
alter table public.batches add column if not exists is_free boolean not null default true;

create table if not exists public.subjects (
  id           bigint generated always as identity primary key,
  batch_id     text not null references public.batches(id) on delete cascade,
  name         text not null,     -- Physics / Chemistry / Maths
  icon         text default 'book',
  sort_order   int not null default 0
);

create table if not exists public.chapters (
  id           bigint generated always as identity primary key,
  subject_id   bigint not null references public.subjects(id) on delete cascade,
  title        text not null,
  youtube_id   text,             -- YouTube video ID (not full URL)
  duration     text,
  description  text,             -- helpful notes/description shown to students
  sort_order   int not null default 0
);

-- 2 or more PDF-type resources per chapter (e.g. "PPT Notes", "Text Notes")
create table if not exists public.chapter_resources (
  id             bigint generated always as identity primary key,
  chapter_id     bigint not null references public.chapters(id) on delete cascade,
  resource_type  text not null default 'PDF Notes',  -- label shown on button
  url            text not null,                      -- link to the PDF
  description    text,                               -- short text describing this resource
  sort_order     int not null default 0
);

-- =========================================================================
-- 5. STUDENTS  (Student Data section in Admin Panel)
-- =========================================================================
create table if not exists public.students (
  id           bigint generated always as identity primary key,
  name         text not null,
  address      text,
  mobile       text not null,
  class        text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_students_class_mobile on public.students (class, mobile);

-- =========================================================================
-- 6. WEEKLY TEST TEMPLATES + RESULTS (flexible subjects, bulk marks entry)
-- -------------------------------------------------------------------------
-- A "test template" is created ONCE per weekly test for a class: test name,
-- date, and which subjects it covers with how many max marks each (can be
-- just 1 subject, 2 subjects, or all 3 — fully flexible, admin decides).
-- The admin then fills in each student's OBTAINED marks in a bulk grid;
-- the max-marks ("out of") per subject is set only once on the template
-- and automatically applies to every student — no need to re-type it.
-- =========================================================================
create table if not exists public.test_templates (
  id           bigint generated always as identity primary key,
  class        text not null,                 -- '9' / '10' / '11' / '12'
  test_name    text not null,                 -- e.g. 'Weekly Test 4'
  test_date    date not null default current_date,
  subjects     jsonb not null default '[]'::jsonb,  -- [{"name":"Physics","max_marks":25}, ...]
  created_at   timestamptz not null default now()
);
create index if not exists idx_test_templates_class on public.test_templates (class);

create table if not exists public.results (
  id             bigint generated always as identity primary key,
  student_id     bigint not null references public.students(id) on delete cascade,
  template_id    bigint references public.test_templates(id) on delete set null,
  test_name      text not null,             -- e.g. 'Weekly Test 4'
  test_date      date not null default current_date,
  subjects_marks jsonb not null default '[]'::jsonb,  -- [{"name":"Physics","marks":18,"max_marks":25}, ...]
  physics        numeric,                   -- legacy columns, kept only for old data compatibility
  chemistry      numeric,
  maths          numeric,
  total          numeric not null default 0,
  out_of         numeric not null default 0,
  percentage     numeric,
  grade          text,
  published_at   timestamptz not null default now(),
  valid_until    timestamptz not null default (now() + interval '3 days'),
  created_at     timestamptz not null default now()
);

-- For databases created before this redesign (adds columns safely, no data loss):
alter table public.results add column if not exists template_id bigint references public.test_templates(id) on delete set null;
alter table public.results add column if not exists subjects_marks jsonb not null default '[]'::jsonb;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='results' and column_name='total' and is_generated='ALWAYS') then
    alter table public.results drop column total;
    alter table public.results add column total numeric not null default 0;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='results' and column_name='percentage' and is_generated='ALWAYS') then
    alter table public.results drop column percentage;
    alter table public.results add column percentage numeric;
  end if;
end $$;
alter table public.results alter column physics drop not null;
alter table public.results alter column chemistry drop not null;
alter table public.results alter column maths drop not null;
alter table public.results alter column out_of drop default;
alter table public.results alter column out_of set default 0;
-- Backfill any pre-existing legacy rows (physics/chemistry/maths) into the new flexible format:
update public.results
set subjects_marks = jsonb_build_array(
  jsonb_build_object('name','Physics','marks', coalesce(physics,0), 'max_marks', round(coalesce(out_of,75)/3)),
  jsonb_build_object('name','Chemistry','marks', coalesce(chemistry,0), 'max_marks', round(coalesce(out_of,75)/3)),
  jsonb_build_object('name','Maths','marks', coalesce(maths,0), 'max_marks', round(coalesce(out_of,75)/3))
)
where subjects_marks = '[]'::jsonb and (physics is not null or chemistry is not null or maths is not null);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'results_student_template_unique') then
    alter table public.results add constraint results_student_template_unique unique (student_id, template_id);
  end if;
end $$;

create index if not exists idx_results_student on public.results (student_id);
create index if not exists idx_results_valid_until on public.results (valid_until);
create index if not exists idx_results_template on public.results (template_id);

-- Auto-compute total/out_of/percentage/grade + valid_until from subjects_marks
-- (using site_settings.result_validity_days) whenever a row is inserted/updated,
-- so the admin panel never has to calculate this itself.
create or replace function public.set_result_defaults()
returns trigger
language plpgsql
as $$
declare
  v_days int;
  v_pct numeric;
  v_total numeric := 0;
  v_out_of numeric := 0;
  item jsonb;
begin
  select coalesce((data->>'result_validity_days')::int, 3) into v_days
  from public.site_settings where id = 1;

  for item in select * from jsonb_array_elements(coalesce(new.subjects_marks, '[]'::jsonb))
  loop
    v_total := v_total + coalesce((item->>'marks')::numeric, 0);
    v_out_of := v_out_of + coalesce((item->>'max_marks')::numeric, 0);
  end loop;

  new.total := v_total;
  new.out_of := case when v_out_of > 0 then v_out_of else coalesce(new.out_of, 0) end;
  v_pct := case when new.out_of > 0 then round(v_total / new.out_of * 100, 1) else 0 end;
  new.percentage := v_pct;

  new.grade := case
    when v_pct >= 90 then 'A+'
    when v_pct >= 80 then 'A'
    when v_pct >= 70 then 'B+'
    when v_pct >= 60 then 'B'
    when v_pct >= 50 then 'C'
    else 'D'
  end;

  if new.published_at is null then
    new.published_at := now();
  end if;

  new.valid_until := new.published_at + make_interval(days => coalesce(v_days,3));

  return new;
end;
$$;

drop trigger if exists trg_set_result_defaults on public.results;
create trigger trg_set_result_defaults
before insert or update on public.results
for each row execute function public.set_result_defaults();

-- =========================================================================
-- 7. PAYMENT ORDERS (basic Cashfree payment-link tracking, optional)
-- =========================================================================
create table if not exists public.payment_orders (
  id             bigint generated always as identity primary key,
  order_ref      text,
  student_name   text,
  student_mobile text,
  class          text,
  batch_id       text references public.batches(id),
  amount         numeric,
  status         text default 'INITIATED',   -- INITIATED / PAID / FAILED (update manually or via Cashfree webhook later)
  created_at     timestamptz not null default now()
);

-- =========================================================================
-- 8. ADMIN LOGIN  (username shown in UI, backed by Supabase Auth email/pw)
-- =========================================================================
-- We use Supabase's built-in Auth (auth.users) so that only a logged-in
-- admin (authenticated role) can write to the tables above. The public
-- website only ever needs read access (and the get_public_result()
-- function below), so it keeps using the anon key safely.
--
-- Internally the admin "username" AVINASH is mapped to a fixed internal
-- email avinash@cwa-admin.local — the Admin Panel login screen still just
-- shows Username + Password fields.
--
-- This creates the FIRST admin login: username = AVINASH / password = AVINASH
-- Change it any time from inside the Admin Panel (Settings -> Change Login).
do $$
declare
  v_uid uuid;
begin
  if not exists (select 1 from auth.users where email = 'avinash@cwa-admin.local') then
    v_uid := gen_random_uuid();
    -- IMPORTANT: every one of these text columns must be '' (empty string),
    -- NEVER NULL. GoTrue (Supabase Auth) does a strict Go string-scan on
    -- these columns during signInWithPassword() and throws a 500
    -- "Database error querying schema" if even one of them is NULL. This
    -- bit everyone who inserts auth.users manually instead of via the
    -- Admin API, so we set ALL of them explicitly below.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token,
      is_super_admin, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      'avinash@cwa-admin.local',
      crypt('AVINASH', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"AVINASH"}',
      '', '', '',
      '', '',
      '', '', '',
      false, false, false
    );

    -- Required by GoTrue for email/password sign-in on newer Supabase
    -- projects (identities table links the user to the "email" provider).
    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      v_uid::text,
      v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', 'avinash@cwa-admin.local'),
      'email',
      now(), now(), now()
    );
  end if;

  -- Safety net: if the admin auth user already existed from a previous
  -- (buggy) run of this script, make sure none of the GoTrue string
  -- columns are left NULL — this is exactly what causes the Admin Panel
  -- login to fail with "Database error querying schema" / not open at all.
  update auth.users set
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, '')
  where email = 'avinash@cwa-admin.local';
end $$;

-- Keep a small mapping table so the Admin Panel login screen can translate
-- "username" -> internal email, and so username can be changed later.
create table if not exists public.admin_profile (
  id            int primary key default 1,
  username      text not null default 'AVINASH',
  auth_email    text not null default 'avinash@cwa-admin.local',
  updated_at    timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.admin_profile (id, username, auth_email)
values (1, 'AVINASH', 'avinash@cwa-admin.local')
on conflict (id) do nothing;

-- =========================================================================
-- 9. PUBLIC RESULT LOOKUP FUNCTION (handles duplicate-mobile scenarios)
-- =========================================================================
-- Called by the website with just (class, mobile). Returns one row PER
-- MATCHING STUDENT (there can be more than one student with the same
-- class+mobile in rare cases) together with that student's still-valid
-- test rows as JSON. The frontend shows a "select your name" step only
-- if more than one student is returned.
create or replace function public.get_public_result(p_class text, p_mobile text)
returns table (
  student_id   bigint,
  student_name text,
  student_class text,
  student_mobile text,
  tests        jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.name,
    s.class,
    s.mobile,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'testName', r.test_name,
        'date', r.test_date,
        'subjects', r.subjects_marks,
        'total', r.total,
        'outOf', r.out_of,
        'percentage', r.percentage,
        'grade', r.grade
      ) order by r.test_date
    ) filter (where r.id is not null), '[]'::jsonb) as tests
  from public.students s
  left join public.results r
    on r.student_id = s.id and r.valid_until > now()
  where s.class = p_class and s.mobile = p_mobile
  group by s.id, s.name, s.class, s.mobile
  having count(r.id) > 0;   -- only students that currently have a valid published result
$$;

grant execute on function public.get_public_result(text, text) to anon, authenticated;

-- =========================================================================
-- 10. ROW LEVEL SECURITY
-- =========================================================================
alter table public.site_settings      enable row level security;
alter table public.hero_slides        enable row level security;
alter table public.notices            enable row level security;
alter table public.batches            enable row level security;
alter table public.subjects           enable row level security;
alter table public.chapters           enable row level security;
alter table public.chapter_resources  enable row level security;
alter table public.students           enable row level security;
alter table public.results            enable row level security;
alter table public.test_templates     enable row level security;
alter table public.payment_orders     enable row level security;
alter table public.admin_profile      enable row level security;

-- Public (anon) can READ content that the website displays:
drop policy if exists "public read site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings for select using (true);

drop policy if exists "public read hero_slides" on public.hero_slides;
create policy "public read hero_slides" on public.hero_slides for select using (true);

drop policy if exists "public read notices" on public.notices;
create policy "public read notices" on public.notices for select using (true);

drop policy if exists "public read batches" on public.batches;
create policy "public read batches" on public.batches for select using (true);

drop policy if exists "public read subjects" on public.subjects;
create policy "public read subjects" on public.subjects for select using (true);

drop policy if exists "public read chapters" on public.chapters;
create policy "public read chapters" on public.chapters for select using (true);

drop policy if exists "public read chapter_resources" on public.chapter_resources;
create policy "public read chapter_resources" on public.chapter_resources for select using (true);

-- students / results / payment_orders / admin_profile are NOT publicly
-- readable (privacy) — students look up their own result only through the
-- get_public_result() function above, which runs with elevated (definer)
-- rights regardless of RLS.

-- Only a logged-in admin (Supabase Auth "authenticated" role) may write:
drop policy if exists "admin write site_settings" on public.site_settings;
create policy "admin write site_settings" on public.site_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write hero_slides" on public.hero_slides;
create policy "admin write hero_slides" on public.hero_slides for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write notices" on public.notices;
create policy "admin write notices" on public.notices for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write batches" on public.batches;
create policy "admin write batches" on public.batches for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write subjects" on public.subjects;
create policy "admin write subjects" on public.subjects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write chapters" on public.chapters;
create policy "admin write chapters" on public.chapters for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write chapter_resources" on public.chapter_resources;
create policy "admin write chapter_resources" on public.chapter_resources for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin all students" on public.students;
create policy "admin all students" on public.students for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin all results" on public.results;
create policy "admin all results" on public.results for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin all test_templates" on public.test_templates;
create policy "admin all test_templates" on public.test_templates for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin all payment_orders" on public.payment_orders;
create policy "admin all payment_orders" on public.payment_orders for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Public may READ the admin_profile row (only username + which internal
-- auth-email it maps to) so the Admin Panel login screen can translate a
-- typed Username into the fixed internal email before calling
-- supabase.auth.signInWithPassword(). This does NOT expose the password
-- (passwords are never stored here — they live only in Supabase Auth).
drop policy if exists "public read admin_profile" on public.admin_profile;
create policy "public read admin_profile" on public.admin_profile for select using (true);

drop policy if exists "admin write admin_profile" on public.admin_profile;
create policy "admin write admin_profile" on public.admin_profile for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================================
-- DONE. After running this once:
--   1. Go to Project Settings -> API and copy the "Project URL" and
--      "anon public" key.
--   2. Paste them into js/supabase-config.js in the website code
--      (SUPABASE_URL and SUPABASE_ANON_KEY).
--   3. Open https://<your-site>/Avinash and log in with
--      Username: AVINASH   Password: AVINASH
--      (change this immediately from Settings inside the panel).
-- =========================================================================
