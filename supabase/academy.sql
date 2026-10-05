-- ---------------------------------------------------------------------------
-- Smart Tax IQ Academy — schema
-- ---------------------------------------------------------------------------
-- Run this once, in the Supabase SQL editor of the SAME project the rest of
-- the site uses (the one holding `subscribers` and `contact_submissions`).
-- It is safe to run more than once.
--
-- The core is three tables and nothing clever:
--
--   academy_students      who is enrolled, and who is allowed to teach
--   academy_login_codes   short-lived one-time sign-in codes
--   academy_progress      one row per student per module
--
-- Plus, added later: academy_access_requests, academy_modules,
-- academy_announcements, academy_onboarding and academy_settings.
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

-- ------------------------------------------------------- access requests ---
-- Somebody reached the sign-in page, was told their address is not on the
-- roster, and asked to be added.
--
-- This is NOT the roster and nothing here grants access. It is an inbox: the
-- instructor reads it, decides, and runs the insert into academy_students
-- herself. Keeping the two tables apart is the point — there is no code path
-- anywhere that turns a request into an enrolment.
create table if not exists academy_access_requests (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text not null,
  note       text,
  created_at timestamptz not null default now(),
  -- Set when the instructor has dealt with it, either way. Requests do not
  -- disappear when handled; a declined one staying visible is a feature.
  handled_at timestamptz,
  ip         text
);

create index if not exists academy_access_requests_open_idx
  on academy_access_requests (created_at desc)
  where handled_at is null;

alter table academy_access_requests enable row level security;
-- Same as the other three: RLS on, no policies, server-only via service role.

-- ------------------------------------------------------- module extras -----
-- What the instructor can change about a module without a developer: a video
-- and a short note to the class.
--
-- The module TEXT is not here. That lives in src/content/academy/course.html
-- and is edited as source, because the quizzes depend on exact markup and a
-- rich-text box over the top of that is a reliable way to break a knowledge
-- check. Everything in this table is additive and safe to get wrong.
create table if not exists academy_modules (
  module_idx  int primary key,
  -- A YouTube or Vimeo watch/share URL, pasted as copied. The page turns it
  -- into an embed at render time rather than storing an embed URL, so a
  -- pasted link that is slightly the wrong shape still works.
  video_url   text,
  video_title text,
  -- Shown above the module body, for "watch this before Tuesday" and the like.
  note        text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references academy_students (id) on delete set null
);

-- ------------------------------------------------------- announcements -----
-- One instructor writing to the whole cohort. Deliberately one-way: this is a
-- notice board, not an inbox, because a half-built two-way messaging system
-- that nobody checks is worse than no messaging at all.
create table if not exists academy_announcements (
  id         uuid primary key default gen_random_uuid(),
  body       text not null,
  -- Whether it was also emailed, and when. Null means it only ever appeared
  -- on the course page.
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references academy_students (id) on delete set null,
  -- Taking one down hides it from students without destroying the record.
  hidden     boolean not null default false
);

create index if not exists academy_announcements_live_idx
  on academy_announcements (created_at desc)
  where hidden = false;

alter table academy_modules       enable row level security;
alter table academy_announcements enable row level security;
-- RLS on, no policies, server-only through the service role, as with the rest.

-- -------------------------------------------------------- preparer onboarding
-- Paperwork tracking for preparers joining the practice.
--
-- READ THIS BEFORE ADDING A COLUMN. This table records *that* a document was
-- received or sighted, never the document. There is no ssn column, no date of
-- birth, no licence number, no file reference, and no Supabase Storage bucket
-- anywhere in this schema. That is a deliberate design decision, not an
-- oversight, and it is the single reason this feature could ship in a day:
--
--   * Michigan's Social Security Number Privacy Act requires a written
--     privacy policy, secure transmission and multi-factor authentication for
--     any online system through which an SSN can be reached. Academy sign-in
--     is a one-time emailed code — good authentication, but one factor, not
--     two. Storing an SSN behind it would not meet the statute, and the
--     statute carries damages of up to $1,000 per violation plus fees, with a
--     private right of action.
--   * The FTC Safeguards Rule brings encryption at rest and in transit,
--     access controls, a named Qualified Individual, vendor oversight, secure
--     disposal and 30-day breach notification. A PTIN holder operating
--     without a compliant written information security plan is risking the
--     credential itself.
--
-- So the sensitive items live where that burden is already carried:
--
--   W-9        a purpose-built filer (Track1099, TaxBandits) or the client
--              portal in her tax software. The SSN/EIN goes there, not here.
--   Photo ID   sighted on a video call and ticked off below. Form I-9 applies
--              to employees, not 1099 contractors, so there is no obligation
--              to retain a copy — and a stored licence image is the highest
--              risk item on the list with the weakest justification for it.
--   PTIN       just a number. Typed in below and checked against the public
--              IRS directory. Nothing to upload.
create table if not exists academy_onboarding (
  id         uuid primary key default gen_random_uuid(),
  -- Email is the identity, normalised, so one preparer cannot appear twice.
  email      text not null unique,
  first_name text not null,
  last_name  text,
  -- Set when the same address is on the Academy roster. Nullable on purpose:
  -- a preparer hired without taking the course still needs the paperwork.
  student_id uuid references academy_students (id) on delete set null,
  -- The PTIN itself. Format is P followed by eight digits.
  ptin text,
  -- The four checks. A date means done, and on what day; null means not yet.
  ptin_verified_at        date,
  w9_received_at          date,
  id_sighted_at           date,
  security_plan_signed_at date,
  notes text,
  -- Who ticked the last box. Accountability for a compliance record matters
  -- more than it does for a quiz score.
  confirmed_by uuid references academy_students (id) on delete set null,
  -- Taking a row out of the active list without destroying the record.
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_onboarding_live_idx
  on academy_onboarding (first_name)
  where archived = false;

alter table academy_onboarding enable row level security;
-- RLS on, no policies. Only the service-role key, only through the
-- instructor-gated route, as with everything else here.

-- ------------------------------------------------------------- intake links --
-- The preparer's own side of onboarding.
--
-- Two of the four checks are things only the preparer can supply: their PTIN,
-- and their signature on the security plan acknowledgement. Before this they
-- arrived by email and were typed in by hand, which is slow and puts the
-- instructor's inbox in the middle of it.
--
-- So each preparer gets a one-off link. No account, no password: the token IS
-- the credential, the way a W-9 request from a filing service works. That is
-- proportionate here precisely because the page behind it holds nothing
-- sensitive — a PTIN, a typed name, a tick. If anything on that page ever
-- became sensitive, a bearer link would stop being good enough and this would
-- need real accounts.
--
-- Only the SHA-256 hash is stored, as with sign-in codes. A leaked database
-- should not hand anyone a set of working intake links.
alter table academy_onboarding
  add column if not exists intake_token_hash  text,
  add column if not exists intake_sent_at     timestamptz,
  add column if not exists intake_expires_at  timestamptz,
  add column if not exists intake_completed_at timestamptz,
  -- Their typed name, which is what makes the acknowledgement a signature
  -- rather than a checkbox, and the address it was signed from.
  add column if not exists plan_signed_name   text,
  add column if not exists plan_signed_ip     text;

create index if not exists academy_onboarding_intake_idx
  on academy_onboarding (intake_token_hash)
  where intake_token_hash is not null;

-- ---------------------------------------------------------------- settings ---
-- A handful of practice-wide values that belong to the office rather than to
-- the code: at the moment only the link to the written information security
-- plan that preparers are asked to read and sign.
--
-- A table rather than an environment variable because Lashanda changes it, not
-- the developer, and changing it should not need a redeploy.
create table if not exists academy_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now(),
  updated_by uuid references academy_students (id) on delete set null
);

alter table academy_settings enable row level security;

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
