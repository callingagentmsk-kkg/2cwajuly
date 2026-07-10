-- =========================================================================
-- MIGRATION: Phase 6 — Free/Paid batches + flexible Weekly Test system
-- -------------------------------------------------------------------------
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New Query -> Run,
-- on your EXISTING project (the one already live on cwascienceclasses.com).
-- It is 100% safe to run multiple times (every statement is idempotent)
-- and it does NOT delete or overwrite any existing batches/students/results
-- — old weekly-test rows (Physics/Chemistry/Maths marks) are automatically
-- converted into the new flexible format so nothing is lost.
--
-- What this adds:
--   1. batches.is_free (boolean) — lets the Admin Panel mark a batch as
--      FREE (visible + open to everyone) or PAID (shown locked with a
--      "Buy Now" / payment-link button on the public site).
--   2. test_templates table — one row per Weekly Test per class, storing
--      WHICH subjects it covers and the MAX MARKS for each subject. This
--      is set ONCE by the admin; after that, marks entry for every student
--      in that class auto-uses the same subjects + max marks, so the admin
--      only ever needs to type the marks a student SCORED.
--   3. results table redesigned to store subjects_marks (jsonb) instead of
--      fixed physics/chemistry/maths columns, so a Weekly Test can cover
--      just 1 subject, 2 subjects, or all 3 — fully flexible.
-- =========================================================================

-- 1. FREE / PAID BATCH FLAG
alter table public.batches add column if not exists is_free boolean not null default true;

-- 2. TEST TEMPLATES (subjects + max marks, set once per weekly test)
create table if not exists public.test_templates (
  id           bigint generated always as identity primary key,
  class        text not null,
  test_name    text not null,
  test_date    date not null default current_date,
  subjects     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_test_templates_class on public.test_templates (class);

alter table public.test_templates enable row level security;
drop policy if exists "admin all test_templates" on public.test_templates;
create policy "admin all test_templates" on public.test_templates for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 3. RESULTS TABLE — add flexible columns, relax old fixed-subject columns
alter table public.results add column if not exists template_id bigint references public.test_templates(id) on delete set null;
alter table public.results add column if not exists subjects_marks jsonb not null default '[]'::jsonb;

-- total/percentage used to be GENERATED (computed only from physics+chemistry+maths).
-- Convert them to normal numeric columns so our new trigger can compute them
-- from subjects_marks instead (works for 1, 2, or 3+ subjects).
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

-- Backfill: convert any existing physics/chemistry/maths rows into the new
-- subjects_marks jsonb format (only rows that haven't been converted yet).
update public.results
set subjects_marks = jsonb_build_array(
  jsonb_build_object('name','Physics','marks', coalesce(physics,0), 'max_marks', round(coalesce(out_of,75)/3)),
  jsonb_build_object('name','Chemistry','marks', coalesce(chemistry,0), 'max_marks', round(coalesce(out_of,75)/3)),
  jsonb_build_object('name','Maths','marks', coalesce(maths,0), 'max_marks', round(coalesce(out_of,75)/3))
)
where subjects_marks = '[]'::jsonb and (physics is not null or chemistry is not null or maths is not null);

-- Prevent duplicate marks entry for the same student in the same test template:
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'results_student_template_unique') then
    alter table public.results add constraint results_student_template_unique unique (student_id, template_id);
  end if;
end $$;

create index if not exists idx_results_template on public.results (template_id);

-- 4. Recompute total / out_of / percentage / grade from subjects_marks
--    (replaces the old physics+chemistry+maths-only trigger).
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

-- Force-recompute all existing rows so old results also show correctly
-- with the new subjects_marks-based total/percentage/grade:
update public.results set subjects_marks = subjects_marks;

-- 5. Update the public result-lookup function to return subjects_marks
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
  having count(r.id) > 0;
$$;

grant execute on function public.get_public_result(text, text) to anon, authenticated;

-- =========================================================================
-- DONE. After running this:
--   - Admin Panel -> Batches -> edit any batch -> toggle "Free / Paid".
--   - Admin Panel -> Student Results -> "Naya Weekly Test" lets you choose
--     which subjects + max marks for that test once, then fill marks for
--     every student in that class in one bulk grid.
-- =========================================================================
