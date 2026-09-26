-- ---------------------------------------------------------------------------
-- Smart Tax IQ Academy — schema
-- ---------------------------------------------------------------------------
-- Run this once, in the Supabase SQL editor of the SAME project the rest of
-- the site uses (the one holding `subscribers` and `contact_submissions`).
-- It is safe to run more than once.
--
-- Three tables and nothing clever:
--
--   academy_students      who is enrolled, and who is allowed to teach
--   academy_login_codes   short-lived one-time sign-in codes
--   academy_progress      one row per student per module
--
-- Row Level Security is ON with no policies, which is how every other table
-- in this project is set up. That means the anon and publishable keys can read
-- nothing at all: every query goes through the Next.js server using the
-- service-role key, exactly like leads and contact submissions already do.
-- There is no client-side Supabase in this codebase and this does not add one.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- --------------------------------------------------------------- students ---
-- The roster. Enrolment is by invitation only: a person can sign in if and
-- only if a row exists here for their email. There is deliberately no public
-- sign-up, because there is no version of this course that a stranger should
-- be able to enrol themselves on.
create table if not exists academy_students (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  first_name   text not null,
  last_name    text,
  -- 'student' sees only their own progress. 'instructor' sees the cohort.
  role         text not null default 'student'
                 check (role in ('student', 'instructor')),
  -- Which intake they belong to, so next year's group does not appear in this
  -- year's dashboard.
  cohort       text not null default '2026-fall',
  -- 'active' can sign in. 'withdrawn' keeps the history and stops the access.
  status       text not null default 'active'
                 check (status in ('active', 'withdrawn')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists academy_students_cohort_idx
  on academy_students (cohort, status);

-- ------------------------------------------------------------ login codes ---
-- Passwordless sign-in. The student asks for a code, it arrives by email, and
-- it is good for fifteen minutes and one use.
--
-- Only the SHA-256 hash of the code is stored. A six-digit code is not a
-- secret worth much on its own, but a leaked database should not hand anyone
-- a working set of live sign-in codes, and hashing costs nothing.
create table if not exists academy_login_codes (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students (id) on delete cascade,
  code_hash  text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  -- Wrong guesses against this code. Five and it is dead, so a six-digit code
  -- cannot be walked through by brute force.
  attempts   int not null default 0,
  created_at timestamptz not null default now(),
  ip         text
);

create index if not exists academy_login_codes_student_idx
  on academy_login_codes (student_id, created_at desc);

-- ------------------------------------------------------------- progress -----
-- One row per student per module. `module_idx` matches the `data-quiz`
-- attribute in src/content/academy/course.html — module 0 is 0.
--
-- best_score is the highest score achieved, never the most recent one:
-- retakes are unlimited and encouraged, and a student who scores 90 then
-- tries again and gets 60 has not become worse at the material.
create table if not exists academy_progress (
  student_id   uuid not null references academy_students (id) on delete cascade,
  module_idx   int  not null,
  best_score   int  not null default 0 check (best_score between 0 and 100),
  passed       boolean not null default false,
  attempts     int  not null default 0,
  first_seen_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (student_id, module_idx)
);

create index if not exists academy_progress_student_idx
  on academy_progress (student_id);

-- --------------------------------------------------------------- lockdown ---
alter table academy_students    enable row level security;
alter table academy_login_codes enable row level security;
alter table academy_progress    enable row level security;

-- No policies are created on purpose. With RLS enabled and no policy, the
-- anon key can neither read nor write these tables; the service-role key
-- bypasses RLS and is the only way in. If a future version of this site ever
-- adds a browser-side Supabase client, policies must be written before that
-- client is pointed at these tables.

-- ------------------------------------------------------------- the roster ---
-- Seed the cohort. Replace the addresses with the real ones and re-run —
-- `on conflict` means running it twice updates rather than duplicates.
--
-- Lashanda's row is the one with role 'instructor'. That single column is
-- what unlocks /academy/instructor; there is no other admin flag anywhere.

insert into academy_students (email, first_name, last_name, role, cohort)
values
  ('lashanda@smarttaxiq.com', 'Lashanda', 'Carter', 'instructor', '2026-fall')
on conflict (email) do update
  set first_name = excluded.first_name,
      last_name  = excluded.last_name,
      role       = excluded.role,
      cohort     = excluded.cohort;

-- Add the five trainees once the Meta campaign has produced them:
--
-- insert into academy_students (email, first_name, last_name, cohort)
-- values
--   ('first@example.com',  'First',  'Trainee', '2026-fall'),
--   ('second@example.com', 'Second', 'Trainee', '2026-fall')
-- on conflict (email) do update
--   set first_name = excluded.first_name,
--       last_name  = excluded.last_name,
--       cohort     = excluded.cohort;

-- --------------------------------------------------------------- tidying ----
-- Expired and used codes are worthless. Nothing depends on this running, and
-- the tables stay small either way, but it is one line if you ever want it:
--
--   delete from academy_login_codes
--   where used_at is not null or expires_at < now() - interval '1 day';
