# Lead system — setup guide

> The same guide ships with the Carter Cole project. Both sites share one
> Mailchimp audience and one set of alerts, so the setup is done once and the
> values are pasted into both projects.

Everything in this guide is **paste a value, redeploy**. No code changes.

The system is already built and already running. With no credentials set it
stores leads and does nothing else. Each value below switches on one more part
of it, in whatever order you get to them.

Both websites feed **one Mailchimp audience** and **one set of alerts**, so a
signup on smarttaxiq.com and a signup on cartercoleandassociates.com land in
the same list, tagged so you can still tell them apart.

---

## The fastest useful order

If you only do three things, do these — in this order:

1. **Lead alerts** (5 minutes) — so you find out about a lead the moment it
   arrives instead of the next time you check an inbox.
2. **Google Analytics** (10 minutes) — so you have traffic history *before*
   you spend on ads. This one cannot be backfilled; every week without it is
   a week of data you can never get back.
3. **Mailchimp** (10 minutes) — key, audience ID, two merge fields, and the
   list starts compounding.

Calendly is already live. The JotForm webhooks matter, but they lose you less
by waiting.

---

## 1. Lead alerts — email and text

Every form submission, intake and booking on either site fires an alert
immediately. Email is free. Text is not, and is optional.

### Email

```env
LEAD_NOTIFY_EMAIL=lashanda@smarttaxiq.com,info@cartercoleandassociates.com
```

Comma-separate as many as you like. If left blank it falls back to
`MAIL_REPLY_TO`, then to the site's own address, so alerts still arrive.

The alert email puts the name, phone, email, topic and the campaign they came
from at the top, with **Call** and **Email them** buttons. Its reply-to is the
lead's own address, so hitting reply in any mail client goes to them.

### Text

Roughly **$1.15/month** for the number plus about **$0.008 per message** —
realistically under $3/month at normal lead volume.

1. Sign up at twilio.com and buy a US number.
2. Console → Account Info → **Account SID** and **Auth Token**.
3. Fill in:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+13135550100
LEAD_NOTIFY_SMS=+18104936605
```

All numbers in E.164 format — `+1` then the ten digits, no spaces or dashes.

Texts fire for the leads worth interrupting your day: contact forms, tax
intakes, bookings and purchases. Newsletter signups do not send a text, on
purpose — an alert that fires for everything gets muted within a week, and
then it fires for nothing.

---

## 2. Google Analytics

**Do this before spending anything on advertising.** Without it you can see
that money went out and leads came in, but not which campaign connected the
two.

1. analytics.google.com → **Admin** → **Create property**.
2. Name it `Carter Cole & Associates`, set the timezone to Eastern and the
   currency to USD.
3. Choose **Web**, enter the domain — one GA4 property per domain.
4. Copy the **Measurement ID** — it looks like `G-XXXXXXXXXX`.

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Create a **second, separate property** for smarttaxiq.com and put its own ID
in that project. Two domains in one property makes both sets of numbers
misleading.

### What gets tracked automatically

Once the ID is in, these fire on their own:

| Event | When |
| --- | --- |
| `lead_checklist` | Someone takes the free checklist |
| `lead_newsletter` | Newsletter or deadline-updates signup |
| `lead_contact` | Contact form submitted |
| `lead_intake` | A JotForm tax intake arrives |
| `booking_started` | A Calendly consultation is actually booked |
| `phone_click` | Any phone number tapped, anywhere on either site |

`phone_click` matters more than it looks. Most tax enquiries are phone calls,
and a call is invisible to analytics by default because the visitor leaves the
site to make it. Marking these as conversions in GA4 is what stops mobile
traffic looking worthless when it is actually your best channel.

**Mark them as conversions:** GA4 → Admin → **Events**, wait for each to appear
after it has fired once, then toggle **Mark as key event**.

---

## 3. The mailing list — Mailchimp

Supabase holds every lead and always will — the download tokens, the send
history, the contact submissions, the admin dashboard. Mailchimp is the
**broadcast copy**: the list you sit in front of to write a campaign.

### Setup

1. mailchimp.com → **Account → Extras → API keys → Create a key.** Copy it.
2. **Audience → Settings → Audience name and defaults → Audience ID.**

```env
MAILCHIMP_API_KEY=abc123...-us21
MAILCHIMP_AUDIENCE_ID=a1b2c3d4e5
```

Use the **same two values on both websites**. That is the entire mechanism
behind "one list": a signup on smarttaxiq.com and a signup on
cartercoleandassociates.com become one contact set, kept tellable apart by
their `site-` tag rather than living in two places.

The key ends in the data centre it belongs to (`-us21`), and the code reads
that suffix automatically — `MAILCHIMP_SERVER_PREFIX` exists only as an
override for the rare account where it differs.

### Add two audience fields first

"Merge fields" is Mailchimp's name for **the columns of your contact list**.
Every audience starts with Email, First Name and Last Name. If you want to
store anything else about a contact, the column has to exist before you can
put anything in it.

The site sends two extra values that need columns:

| Column | Type | Merge tag | What goes in it |
| --- | --- | --- | --- |
| Phone Number | Phone | `PHONE` | **Already exists** in a new audience |
| Source | Text | `SOURCE` | The one you have to create |

A new Mailchimp audience already ships with Email, First Name, Last Name,
Address, **Phone Number**, Birthday and Company. So the only one missing is
Source.

**To add it:** Audience → **Audience fields and *|MERGE|* tags** →
**Create a new field** (top right) → type **Text** → field label `Source` →
merge tag `SOURCE` → Save.

A note on the Phone field: its type validates against the format
`(###) ### - ####`, and visitors type numbers every other way. The site
normalises US numbers into that shape before sending, so `810-493-6605`,
`8104936605` and `+1 810 493 6605` all land correctly. A non-US number is
passed through untouched rather than mangled.

**If you skip this,** nothing breaks and no signup is lost. Mailchimp simply
ignores a value it has no column for, so contacts still arrive — just without
a phone number or a source, which is the field that makes the list worth
segmenting later. It is a two-minute job that is annoying to backfill, because
the information is gone by the time you notice.

### One setting to leave alone

While you are on that screen, do not tick **required** on any field except
Email. Mailchimp rejects an API write that omits a required field, and the
capture form on the SmartTaxIQ site asks for an email address and nothing
else on purpose. The site already sends `skip_merge_validation` so this cannot
silently kill your signups — but there is no reason to rely on that.

### The tags every contact arrives with

Applied automatically on every signup, from both sites:

| Tag | Example | What it tells you |
| --- | --- | --- |
| `site-…` | `site-cartercole`, `site-smarttaxiq` | Which website |
| `source-…` | `source-checklist`, `source-pricing` | Which page captured them |
| `kind-…` | `kind-contact`, `kind-intake-personal` | What they actually did |
| `campaign-…` | your UTM campaign name | Which ad produced them, if any |

So "everyone who asked about business taxes on SmartTaxIQ since March" is a
saved segment, not a spreadsheet exercise.

### Two things to know about the free plan

**It is smaller than it used to be.** Mailchimp cut its free tier: it is now
**250 contacts and 500 sends a month, capped at 250 a day** — not the 500/1,000
it was. At any real lead volume you will pass 250 contacts within a couple of
months of running ads, and the Essentials plan is the next step up.

**Automations are not on the free plan** — and it does not matter here. Your
5-email welcome sequence does not run in Mailchimp and never did.

### The welcome sequence (Carter Cole site) is independent of all this

Worth being explicit, because this is the part people assume needs Mailchimp's
automation builder.

The sequence runs from `src/lib/sequence.ts` and `/api/cron/dispatch` against
the Supabase list, sending through your own mail provider. The copy, the
subject lines and the timing all live in that one file; subscribers mid-
sequence pick up changes automatically. Editing an email is editing a file,
and it is version-controlled — which no hosted automation tool gives you.

**So the split is:** the sequence handles the automatic welcome emails,
Mailchimp handles broadcasts — a seasonal reminder, a deadline note, an
announcement. Both jobs covered, and the free plan's missing automations cost
you nothing.

### Unsubscribes are kept in step

Someone who opts out through one of your sequence emails is marked
unsubscribed in Mailchimp too, so the two lists cannot drift into a state where
an opt-out still receives a broadcast. And the sync never resubscribes anyone:
a returning visitor who previously opted out stays opted out, which matters
legally as much as technically.

### If you ever want to change campaign tools

The list layer has two interchangeable backends behind one interface —
Mailchimp and Resend — and the code uses whichever is configured. Clearing the
Mailchimp variables and setting `RESEND_AUDIENCE_ID` moves the list to Resend,
on the API key that already sends your email. Nothing in the capture routes,
the webhooks or the alerts changes.

Worth knowing given how tight the free tiers are on both. Not something you
need to decide now.

---

## 4. Calendly — already live

Your booking link is wired in as the default, so this is **working right now**
with nothing to paste:

```
https://calendly.com/lashandasmarttaxiq/30min
```

`/contact` on this site and `/book` on the Carter Cole site both show the live
calendar.
`NEXT_PUBLIC_CALENDLY_URL` exists only to override it — point a staging build
at a test event so it doesn't drop real bookings in your calendar.

### Check these three settings inside Calendly

The embed is done; these are calendar settings only you can set.

1. **Availability: Monday–Thursday, 9:30am–5:00pm, timezone Eastern.** The site
   states those hours in the footer, the schema markup and next to the booking
   widget, so the calendar needs to agree with them.
2. **Ask for a phone number** in the event's invitee questions. A booking
   without one is a booking you cannot rescue when someone doesn't show.
3. **Set a buffer and a minimum notice.** 15 minutes after each booking, and
   4 hours minimum notice — otherwise someone books a slot you're already
   driving to.

### What the embed adds over the plain snippet

The version on the site is Calendly's standard inline widget plus three things:

- **Campaign passthrough** — the UTM parameters a visitor arrived on are
  carried into the booking, so a booking from a paid click still names the ad
  that produced it. Without this, bookings are the one conversion advertising
  can never be credited for.
- **A real conversion event**, fired when a booking completes rather than when
  the widget opens.
- **Correct behaviour on internal navigation.** Calendly's script scans the
  page once when it loads. Someone landing directly on `/book` would see the
  calendar; someone clicking through from the home page would have seen an
  empty box, because the script had already run. The embed initialises the
  widget directly in that case.

### Getting bookings into the list and the alerts (optional)

Calendly's free plan has no webhooks. Either upgrade, or use a free Zapier or
Make connection:

> Trigger: Calendly → *Invitee Created*
> Action: Webhooks → POST to
> `https://smarttaxiq.com/api/webhooks/calendly?key=YOUR_CALENDLY_WEBHOOK_SECRET`

Without it, bookings still reach you through Calendly's own confirmation email
— you just don't get the text alert or the automatic list entry.

---

## 5. JotForm intakes

The two tax intake forms are the highest-intent leads on the site. Right now
they land in JotForm and nowhere else. Two things to do on **each** form.

### a. Notification emails

Form → **Settings → Emails → Notification** → set the recipient to the same
address you used for `LEAD_NOTIFY_EMAIL`.

### b. Webhook

Form → **Settings → Integrations → Webhooks** → paste the URL and click
**Complete Integration**:

Personal intake (`253275423934056`):

```
https://cartercoleandassociates.com/api/webhooks/jotform?key=YOUR_SECRET&form=personal
```

Business intake (`253285600052550`):

```
https://cartercoleandassociates.com/api/webhooks/jotform?key=YOUR_SECRET&form=business
```

Where `YOUR_SECRET` is whatever you set here:

```env
JOTFORM_WEBHOOK_SECRET=some-long-random-string-nobody-can-guess
CALENDLY_WEBHOOK_SECRET=another-long-random-string
```

Invent them yourself — any long random string works. They are what stops
someone who guesses the URL from posting junk into your mailing list.

Both forms are embedded on **both** websites, so add the SmartTaxIQ webhook
URLs too if you want intakes attributed to whichever site they came from:

```
https://smarttaxiq.com/api/webhooks/jotform?key=YOUR_SECRET&form=personal
https://smarttaxiq.com/api/webhooks/jotform?key=YOUR_SECRET&form=business
```

A webhook accepts multiple URLs on the same form, so you can add both.

The webhook reads fields by what they look like rather than by JotForm's
internal field IDs, so reordering or editing questions will not silently break
it — a real risk with the ID-based approach.

---

## 6. Google Ads, when you get there

Nothing to do yet, but the site is already built for it:

```env
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX
NEXT_PUBLIC_ADS_LABEL_CONTACT=AbCdEfGhIj
NEXT_PUBLIC_ADS_LABEL_BOOKING=KlMnOpQrSt
NEXT_PUBLIC_ADS_LABEL_PHONE=UvWxYzAbCd
```

Each label comes from a conversion action's tag in the Ads interface. They live
in environment variables specifically so launching a new campaign never
requires a code change or a deploy.

Campaign attribution is already handled: a visitor arriving on a UTM-tagged or
`gclid` link has that stashed for their session and replayed into every form
they submit, however many pages later. First touch wins, so someone who arrives
from an ad, browses, and comes back by bookmark is still credited to the ad
rather than quietly reassigned to "direct".

---

## Checking it works

Set what you have, deploy, then:

1. **Checklist opt-in** — submit it with your own address. You should get the
   checklist email, an alert email, and a new contact in Mailchimp tagged
   `site-cartercole` and `source-checklist`.
2. **Contact form** — submit it. You get an acknowledgement, the office gets
   an alert, and the row appears in Supabase if storage is connected.
3. **Phone link** — tap a number on a phone. `phone_click` shows in GA4
   Realtime within about 30 seconds.
4. **Booking** — book yourself a slot on `/contact`. You should get Calendly's
   confirmation, and (if the webhook is connected) an alert and a contact
   tagged `kind-booking`.
5. **Intake** — submit a test tax intake. Same again.

If something does not arrive, the server log names the step that failed and
why. The design guarantees the lead itself survives: storage happens first,
and the list sync, the email and the SMS each fail independently without
taking anything else down with them.

---

## What still needs a person

- **SPF, DKIM and DMARC** on `cartercoleandassociates.com` and
  `smarttaxiq.com`. Your mail provider gives you the exact DNS records. Skip
  this and a large share of your email lands in spam no matter how good the
  system is — it is the highest-impact item on this page.
- **A Google Business Profile that matches the site exactly.** The name, the
  address (`14701 Mack Ave, Suite B, Detroit, MI 48215`), the phone and the
  hours must be character-identical to what the sites publish. Mismatched
  details are one of the few things that measurably suppress local ranking.
- **Answering fast.** The system's whole purpose is to get a lead in front of
  you within seconds. That only converts if someone acts on it.

---

## One database, two websites

Both sites point at the **same Supabase project**. Worth knowing why, because
it looks like something that could be split later and mostly shouldn't be:

- `email` is unique *per project*. One database means a person who takes the
  checklist on one site and files through the other is one record with one
  token, not two that never reconcile.
- The admin dashboard at `/admin/subscribers` then lists every lead from both
  brands, with `source` telling them apart — one place to look, which is the
  whole point of the exercise.
- Supabase pauses free-plan projects with low activity over a rolling 7-day
  window. One project carrying both sites' traffic is far less likely to go
  quiet than two carrying half each — and a paused project means writes fail.

The schema (`supabase/schema.sql`, in the Carter Cole project) is applied once,
to that project. There is no second copy in the SmartTaxIQ repository on
purpose: two copies of a schema for one database is a guaranteed source of
drift.
