# Email domain setup — Dispatch

Step-by-step for getting a custom sender domain (`dispatch@yourdomain.com`) working through Resend, with proper DKIM, SPF, and DMARC so emails land in the inbox instead of spam.

**Timing:** Can be deferred to launch day, but allow 24-48h for DNS to propagate before you depend on the new sender. Do it a few days before Show HN if you want a custom From address by launch.

**Cost:** Free if you already own a domain. Domain registration is $10-15/year.

---

## 0. Why this matters

Resend's default sender (`onboarding@resend.dev`) works fine for dev and the first few hundred emails. Three reasons to move to a custom domain before scale:

1. **Deliverability.** Shared domains get spam-flagged when other senders abuse them. Your own domain is your own reputation.
2. **Brand.** `Dispatch <dispatch@yourdomain.com>` is the right From line. `onboarding@resend.dev` is "this is a demo."
3. **Reply-to.** A reply to `onboarding@resend.dev` goes nowhere. A reply to your domain goes to your inbox.

Target a `mail-tester.com` score of **8.5/10 or better** before launch. Below 7/10 means Gmail is flagging some percentage of your sends.

---

## 1. Pick a domain (5 min)

Options ranked by my preference:

1. **A short brand domain** — `dispatch.email`, `dispatchhq.com`, `readdispatch.com`, `getdispatch.io`. Most pro-feeling for emails. ~$12-30/yr depending on extension.
2. **Subdomain of an existing domain** — `dispatch.yourname.dev`. Free if you already own `yourname.dev`. Less branded but fine.
3. **A `.email` or `.news` TLD** — purpose-built TLDs. Cheap, available, decent signal.

Registrar matters less than support for arbitrary DNS records. Recommended registrars: Cloudflare ($), Porkbun ($), Namecheap ($$). Avoid GoDaddy and Google Domains (acquired by Squarespace, mediocre admin UI).

---

## 2. Add the domain in Resend (5 min)

1. Sign in at [resend.com](https://resend.com)
2. **Domains** → **Add Domain** → enter your domain (e.g. `dispatch.email`)
3. Pick the region closest to your hosting (`us-east-1` for Render US East default)
4. Resend shows you a set of DNS records to add. There will be:
   - **3 DKIM records** (`CNAME`) for signing
   - **1 SPF record** (`TXT`) authorizing Resend to send
   - **1 DMARC record** (`TXT`) for spoofing protection

**Don't close the Resend tab yet.** You'll come back to verify.

---

## 3. Add the DNS records (10 min)

In your registrar's DNS panel, add the records Resend gave you. Resend's UI shows them in the right format; just copy + paste.

### DKIM (3 CNAMEs, copy verbatim from Resend)

```
resend._domainkey.yourdomain.com   CNAME  resend._domainkey.<random>.resend.com
selector1._domainkey.yourdomain.com   CNAME  selector1.<random>.resend.com
selector2._domainkey.yourdomain.com   CNAME  selector2.<random>.resend.com
```

The exact destination strings come from Resend's setup screen.

### SPF (1 TXT)

If you have **no other sender** for this domain, this single record:

```
yourdomain.com   TXT   "v=spf1 include:_spf.resend.com ~all"
```

If you ALREADY send from another service (Google Workspace, Mailchimp, etc.), merge into one combined SPF record:

```
yourdomain.com   TXT   "v=spf1 include:_spf.google.com include:_spf.resend.com ~all"
```

**Critical: there must be exactly ONE SPF record per domain.** Multiple SPF records → SPF fails → emails go to spam.

### DMARC (1 TXT)

Start permissive, tighten later:

```
_dmarc.yourdomain.com   TXT   "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

`p=none` means "don't reject failing emails, just report them." After a week of monitoring the reports, tighten to `p=quarantine` (suspicious → spam) and eventually `p=reject` (suspicious → bounce). Don't start at `p=reject` — you'll bounce your own legitimate emails if you misconfigured something.

---

## 4. Wait for propagation (5 min – 24h)

DNS changes propagate gradually. Most registrars push within minutes; some take hours. Check with:

```bash
# DKIM
dig CNAME resend._domainkey.yourdomain.com +short

# SPF
dig TXT yourdomain.com +short | grep -i spf

# DMARC
dig TXT _dmarc.yourdomain.com +short
```

If `dig` shows the expected values, you're propagated. Go back to Resend → **Verify** → green check on all five records.

---

## 5. Update Dispatch's `FROM_EMAIL` (1 min)

In your Render web service env vars:

```
FROM_EMAIL=Dispatch <dispatch@yourdomain.com>
```

Display name first, then `<email>` in angle brackets. Resend accepts both.

If you want replies to go to a different inbox (e.g. you read mail at `you@yourdomain.com`):

```
FROM_EMAIL=Dispatch <dispatch@yourdomain.com>
```

…and edit `server/email.js` to add a `replyTo` field on each `client().emails.send({ ... })` call. Skip this until launch day — defaults are fine for staging.

---

## 6. Test deliverability (10 min)

### a) mail-tester.com

1. Open [mail-tester.com](https://mail-tester.com). It gives you a random test address.
2. From your Dispatch staging instance, send a brief or welcome email to that address (e.g. sign up + verify with the test address).
3. Click **Then check your score**.

**Target:** ≥ 8.5/10.

Common deductions:

| Issue | Fix |
|---|---|
| "Your message could be authenticated by SPF" | SPF record missing or has typo. Re-check |
| "Your message could be signed with DKIM" | DKIM CNAMEs not verified yet. Wait + re-verify in Resend |
| "Your DMARC record is missing" | Add the DMARC TXT |
| "Your domain has only just been registered" | Wait 1-2 weeks; new domains carry slight reputation penalty |
| "You're sending HTML-only / no plain-text" | Both `briefHtml` and `briefText` are present in `server/email.js`, so this should be fine. If flagged, double-check the `text` field is set in the Resend send call |
| "Image alt text missing" | Currently no images in Dispatch emails — N/A |

### b) Send to real test addresses

Send a test welcome + a test brief to:
- Your personal Gmail
- A test Apple Mail iCloud account
- An iPhone Mail account (open on the device, not the web)
- An Outlook.com web account

Check:
- [ ] Lands in inbox, not spam
- [ ] Subject shows the dynamic subject line (not "no subject")
- [ ] Sender shows `Dispatch <dispatch@yourdomain.com>` (not "dispatch via resend.dev")
- [ ] Brief renders correctly — table layout intact, gold accents visible, links work
- [ ] On iPhone, masthead doesn't overflow the screen
- [ ] In Outlook, the gold background is visible (Outlook strips some background colors)
- [ ] "View in browser" link works (uses signed view token, so the recipient is authenticated via the URL)
- [ ] One-click unsubscribe works

---

## 7. Tighten DMARC after a week

After ~7 days of monitoring DMARC reports (Gmail / Yahoo / Microsoft will send aggregate reports to your `rua` address), tighten:

```
_dmarc.yourdomain.com   TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=25"
```

`p=quarantine; pct=25` means "send 25% of failing emails to spam." Watch for false positives for another week, then bump to `pct=100`. After another week with no issues, move to `p=reject`.

---

## 8. Monitor

- **Resend dashboard** — bounce rate, complaint rate, delivery rate per send
- **Gmail Postmaster Tools** — sign up at [postmaster.google.com](https://postmaster.google.com), add your domain. Free, gives you Gmail-specific reputation data
- **Microsoft SNDS** — same for Outlook/Hotmail at [sendersupport.olc.protection.outlook.com](https://sendersupport.olc.protection.outlook.com)

**Bounce rate target:** under 2%. Above 5% → audit your list (typo'd emails, dead addresses).
**Complaint rate target:** under 0.1%. Above 0.5% → you have a content problem; review what's being sent.

---

## Troubleshooting

**"Resend says domain not verified after 24h"**
Re-check each DNS record at your registrar. Common errors: extra quotes around TXT values, trailing dots on CNAME targets, typo in record name. Use `dig` to confirm what's actually being served.

**"Emails arrive but to spam"**
Most likely: missing DKIM or SPF, or domain reputation is new. Send to mail-tester.com to diagnose.

**"My subdomain inherits the parent's DMARC"**
By default, yes. If you want a different policy on the subdomain, add an explicit `_dmarc.dispatch.parentdomain.com` record.

**"Resend says 'sender domain blacklisted'"**
Check the domain at [mxtoolbox.com/blacklists.aspx](https://mxtoolbox.com/blacklists.aspx). If listed (rare for fresh domains), follow the delisting process for each blacklist. Or pick a different domain.

---

## Out of scope for this doc

- Multi-tenant sending domains (when you have B2B customers sending from their own domains via Dispatch)
- BIMI (the brand-logo-next-to-sender feature) — requires a VMC certificate, $1000+/year. Premature.
- Bounce processing — Resend handles bounces automatically; we'd only need custom logic if we move to a different ESP.
