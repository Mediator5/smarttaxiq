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

It is safe to run more than once, and **it has grown since the first
deploy — re-run it after every pull.** New tables are added with
`create table if not exists`, so re-running never touches the data already
there; skipping it is what breaks a new page.

| Table | What it holds |
|---|---|
| `academy_students` | the roster, and who is allowed to teach |
| `academy_login_codes` | short-lived one-time sign-in codes |
| `academy_progress` | one row per student per module |
| `academy_access_requests` | people who asked to be added |
| `academy_modules` | the instructor's video and note per module |
| `academy_announcements` | notices to the cohort |
| `academy_onboarding` | preparer paperwork checklist |
| `academy_onboarding_files` | metadata for documents in the private `onboarding-docs` bucket |
| `academy_settings` | office-level values Lashanda edits, e.g. the security plan link |

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

Sign in as an instructor and go to **`/academy/roster`** — there is a link in
the header. Add each person by name and email, pick Trainee or Instructor, and
they are on. No SQL.

That page also handles the other two jobs:

- **Requests to join.** Somebody who reaches the sign-in page with an address
  that is not enrolled is told so plainly, and offered a short form. Those
  requests appear at the top of the roster page with an **Add to roster**
  button, and an alert goes to `LEAD_NOTIFY_EMAIL`. Approving enrols them; it
  does not email them, because at that point nobody has verified they own that
  address — they prove it themselves with their first sign-in code.
- **Withdrawing someone.** Never deletes. Progress is kept, access stops on
  their next page load, and reinstating brings it all back.

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
`button.reveal` in that file, update `src/components/academy/CourseRuntime.tsx` and
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

## Preparer onboarding and the documents it holds

`/academy/onboarding` tracks whether each preparer is cleared to work under the
practice's PTIN: a PTIN number, four dates, a note — and, since **October
2026**, their actual W-9, photo ID and anything else they were asked for.

### What changed, and the earlier advice that was wrong

Until October 2026 this page deliberately stored no documents, and this file
justified that by saying Michigan's Social Security Number Privacy Act
*requires multi-factor authentication on any system through which an SSN can be
reached*. **That is not what the statute says.** MCL 445.84 requires a person
who obtains SSNs in the ordinary course of business to publish a written
privacy policy covering five things — confidentiality, no unlawful disclosure,
limited access, a described disposal method, and a penalty for breaking it. It
mandates no technical control at all, MFA included.

The MFA requirement is the **FTC Safeguards Rule**, 16 CFR 314.4(c)(5), and it
is scoped to an information system containing *customer* information —
nonpublic personal information about a customer of the financial institution. A
contractor's own W-9 is not customer information. So holding these documents
does not put the practice in breach of either rule.

What remains true is the risk, which is unchanged by any of the above: a W-9
and a driver's licence together are enough to open credit in somebody's name,
and they now sit behind a single emailed code. **Adding a second factor to
Academy sign-in is the outstanding work item on this feature.** It was offered
and declined in October 2026; the Onboarding page says so to the instructor's
face, which is the right place for that argument to live.

### How the storage works

| | |
|---|---|
| Bucket | `onboarding-docs`, **private** (`public => false`). Created by `supabase/academy.sql` |
| Table | `academy_onboarding_files` — metadata only, no bytes in Postgres |
| Accepted | PDF, JPEG, PNG, WebP, HEIC. 10 MB each, 20 files per preparer |
| Type checking | The first bytes of the file are sniffed; `file.type` from the browser is a label and is only used to reject a mismatch |
| Paths | `<onboarding_id>/<kind>-<uuid>.<ext>`. The preparer's filename is display text and never touches the path |
| Reading | A signed URL minted server-side, **60 seconds**, only behind the instructor gate |
| Deleting | Removes the object, keeps the row with `deleted_at` and `deleted_by` |
| Automatic deletion | **None.** Chosen deliberately. Every file shows its age in days on the card, and anything over 30 days is flagged red |

There is no endpoint that returns a document to the preparer — the intake link
can write files and cannot read them. Somebody who intercepts a link can post a
junk PDF into one record; they cannot retrieve that person's licence.

### What the tick boxes mean now

`w9_received_at` and `id_sighted_at` are still **Lashanda's** statements, and an
upload does not tick either one. A file arriving is evidence; the tick is her
saying she looked at it. Keeping those separate is what makes the checklist
worth anything.

### The preparer's own link

On the Onboarding tab, **Send intake link** on somebody's card mints a one-off
URL — `/intake/<token>` — emails it to them, and shows it once so it can also
be passed on by hand.

| | |
|---|---|
| What they do there | Enter their PTIN, read the security plan, sign by typing their full name, and upload their W-9, photo ID and anything else |
| Uploads | Send on selection, one at a time, with no save step. The page keeps working **after** submission until the link expires — people send the two quick fields immediately and go hunting for their W-9 afterwards |
| What it cannot tick | `ptin_verified_at`, `id_sighted_at`, `w9_received_at` |
| What it cannot read | Any uploaded document, including their own |
| Lifetime | 21 days. Sending a new link retires the old one |
| Storage | Only the SHA-256 hash of the token. The URL is shown exactly once and cannot be recovered |

Set the **security plan link** at the bottom of the Onboarding tab before
sending anyone a link, or they are asked to sign a plan nobody gave them. Any
share URL works; check it opens in a private window.

### Signed out is not the same as not allowed

The four staff pages (Progress, Teaching, Roster, Onboarding) split the test
two ways:

- **Signed out** → the sign-in form. `/academy` already shows one publicly, so
  this reveals nothing new, and it stops an instructor opening the roster link
  on a phone and hitting what looks like a broken site.
- **Signed in, not an instructor** → 404. By then we know who you are, and a
  trainee should not be able to confirm a staff page exists.

---

## If something is wrong

| What you see | What it is |
|---|---|
| "Not set up yet" on `/academy` | `SUPABASE_URL` or `ACADEMY_SESSION_SECRET` missing in that environment |
| Code never arrives in production | The address is not on the roster, or `RESEND_API_KEY` is missing in Vercel. Check the function logs |
| Signed in, but the course area is blank | `course.html` did not make it into the bundle — check `outputFileTracingIncludes` in `next.config.mjs` |
| "Your score didn't save" | The progress write failed. The function log has the Supabase error |
| Dashboard 404s for Lashanda | Her row has `role = 'student'`, or a different `cohort` from the students |
| "You're not on the roster" for an address that plainly is | The stored email has a capital letter. Sign-in lowercases what is typed, Postgres `=` is case-sensitive, so `Info@` never matches `info@`. The schema now lowercases on write with a trigger — re-run `academy.sql` and it also repairs existing rows |
| Code never arrives at a new instructor address | Check the address is a real mailbox and not a forward-only alias. The roster lookup and the delivery are separate failures and look identical from the sign-in page |
