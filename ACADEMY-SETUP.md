# The Academy — setup

Student training at `/academy`, for the cohort starting 1 October 2026.

Four things to do. Twenty minutes, most of it waiting for Vercel.

---

## What this actually is

A private, invitation-only area of smarttaxiq.com holding the nine-module
course, recording each student's knowledge-check scores, and giving Lashanda a
live view of the whole cohort.

Deliberately small:

- **No new third-party service.** It reuses the Supabase project and the Resend
  key the site already has.
- **No browser-side Supabase and no new public key.** Every query goes through
  the Next.js server on the service-role key, exactly as leads already do. Row
  Level Security is on with no policies, so the anon key can read nothing.
- **No passwords.** A one-time six-digit code goes to an address already on the
  roster; the session is a cookie signed with `ACADEMY_SESSION_SECRET`. There is
  no password to store, reset, leak or lock out.
- **No public sign-up.** A person can sign in if and only if a row exists for
  their email in `academy_students`.

Everything is env-gated. With the variables unset, `/academy` renders a plain
"not set up yet" page and the rest of the site behaves exactly as before.

---

## 1 · Install the one new dependency

The course uses IBM Plex Mono for its small labels and figures, self-hosted like
the site's other two faces.

```bash
npm install
```

---

## 2 · Run the SQL

Supabase → the **same project** the site already uses (the one holding
`subscribers` and `contact_submissions`) → SQL Editor → paste
`supabase/academy.sql` → Run.

It is safe to run more than once. It creates three tables:

| Table | What it holds |
|---|---|
| `academy_students` | the roster, and who is allowed to teach |
| `academy_login_codes` | short-lived one-time sign-in codes |
| `academy_progress` | one row per student per module |

**Change Lashanda's email before you run it.** The seed at the bottom inserts
her as the instructor, and that one row is the only thing that unlocks the
dashboard. There is no other admin flag anywhere in the code.

---

## 3 · Add the session secret

Generate it once:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Then put the same value in **two** places:

1. `.env.local` — for local development. This file is gitignored; never put a
   real value in `.env.example`.
2. **Vercel → Project → Settings → Environment Variables** — as
   `ACADEMY_SESSION_SECRET`, for Production and Preview.

```
ACADEMY_SESSION_SECRET=<the generated value>
```

Nothing else is new. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
`RESEND_API_KEY` are already set in both places.

> Changing this secret later signs everybody out. That is the entire "revoke all
> sessions" mechanism, and for a cohort of five it is enough.

---

## 4 · Test it locally, before you push

```bash
npm run dev
```

Open <http://localhost:3000/academy>.

1. Enter Lashanda's email → **Email me a code**.
2. There is no Resend key locally, so the code is printed in your terminal:
   `[academy] no mailer configured — sign-in code for … is 123456`.
   That fallback only ever runs when no mailer is configured, so it cannot
   happen in production.
3. Enter it. You should land on the course, signed in, with an **Instructor
   view** link in the header.
4. Scroll to any knowledge check, answer it, press **Check my answers**. The
   progress bar at the top should move.
5. Open **Instructor view**. Lashanda will not appear in her own cohort table —
   that lists role `student` only — so it will say "nobody enrolled yet" until
   you add a trainee. Add one with the commented-out insert at the bottom of the
   SQL file and reload.

If step 2 prints nothing, `SUPABASE_URL` is missing from `.env.local` or the
email is not on the roster.

Then:

```bash
npm run build
```

It must pass before you push. If it does, push and let Vercel deploy.

---

## 5 · Enrol the five trainees

Once the Meta campaign has produced them, in the Supabase SQL editor:

```sql
insert into academy_students (email, first_name, last_name, cohort)
values
  ('first@example.com',  'First',  'Trainee', '2026-fall'),
  ('second@example.com', 'Second', 'Trainee', '2026-fall')
on conflict (email) do update
  set first_name = excluded.first_name,
      last_name  = excluded.last_name,
      cohort     = excluded.cohort;
```

Then send them the link. There is nothing for them to set up and no account to
create — they type their email, get a code, and they are in.

To remove someone without losing their history:

```sql
update academy_students set status = 'withdrawn' where email = '…';
```

That takes effect on their next page load, not whenever their cookie expires.

---

## What to expect on the dashboard

`/academy/instructor`, or the link in the header when Lashanda is signed in.

One row per student, one column per knowledge check, plus a last-seen column.

- **A dash** — the check has not been attempted. Chase it.
- **Red** — attempted, under 70%. Retakes are unlimited, so look at the try
  count before you worry. Red that stays red for a week is the real signal.
- **Last seen in red** — nine days or more since they opened the course. That is
  usually somebody who has already stopped and not said so.

Anyone who is not the instructor gets a 404 on that URL, signed in or not. There
is no reason to confirm to a student that the page exists.

---

## Things worth knowing

**The course content is one HTML file.** `src/content/academy/course.html` holds
all nine modules. It is edited as prose, not as JSX, because the same teaching
feeds the printed workbook and the instructor pack and three versions that drift
apart would be worse than one file with a comment at the top explaining itself.
It is rendered with `dangerouslySetInnerHTML` from a server component — safe
here, because it is repository source reviewed like any other file and nothing a
student types ever reaches it.

If you rename `section.m#mN`, `div.quiz[data-quiz]`, `div.qq[data-a]` or
`button.reveal` in that file, update `src/components/academy/CourseBody.tsx` and
`src/content/academy/modules.ts` to match.

**Knowledge-check scores are self-reported, and that is fine.** The answer key
is in the page, because instant feedback is the point. Anyone determined to post
a 100 can. Nothing is being defended here: the marks that decide whether
somebody works the season are six assignments, four practice returns and a
supervised written exam in December, all marked on paper. The dashboard measures
engagement, which is the thing you actually cannot see otherwise.

**The stylesheet is scoped.** `src/app/academy/academy.css` is the standalone
course's stylesheet with every selector prefixed `.academy`, the design tokens
moved off `:root`, and the dark-mode blocks removed — the rest of the site is
light only. Nothing in it can reach the header, the footer or any other page.

**`/academy` is `noindex`, disallowed in robots.txt, and absent from the
sitemap.** It is a private training area for five named people, not content.

---

## If something is wrong

| What you see | What it is |
|---|---|
| "Not set up yet" on `/academy` | `SUPABASE_URL` or `ACADEMY_SESSION_SECRET` missing in that environment |
| Code never arrives in production | The address is not on the roster, or `RESEND_API_KEY` is missing in Vercel. Check the function logs |
| Signed in, but the course area is blank | `course.html` did not make it into the bundle — check `outputFileTracingIncludes` in `next.config.mjs` |
| "Your score didn't save" | The progress write failed. The function log has the Supabase error |
| Dashboard 404s for Lashanda | Her row has `role = 'student'`, or a different `cohort` from the students |
