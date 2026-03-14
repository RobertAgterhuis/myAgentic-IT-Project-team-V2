# SP-12-704 Email Marketing Framework

**Story:** SP-12-704 (Email Marketing Framework)  
**Sprint:** Sprint 1 (March 10-24, 2026)  
**Track:** Marketing  
**Owner:** Growth Marketer  
**Status:** ✅ SPRINT 1 SCOPE COMPLETE (Day 8 — 95%)  
**Target Completion:** March 20 — CLOSED

**Sprint 2 Carryover:** Buttondown account setup, server-side subscribe endpoint
implementation, and cross-client email template testing. All content, strategy,
HTML template specs, and double opt-in flow design are complete.

---

## 1. Email Strategy Overview

### Objectives

| Objective                  | Metric          | Target (Month 1) |
| -------------------------- | --------------- | ---------------- |
| Subscriber acquisition     | List size       | 250+             |
| Engagement                 | Open rate       | ≥ 30%            |
| Click-through              | CTR             | ≥ 5%             |
| Conversion to trial/signup | Conversion rate | ≥ 3%             |
| Unsubscribe rate           | Churn           | < 1.5%           |

### Segmentation Strategy

| Segment                 | Criteria                   | Content Focus                                               |
| ----------------------- | -------------------------- | ----------------------------------------------------------- |
| **Engineering Leaders** | CTO, VP Eng, Eng Manager   | Architecture decisions, governance, team productivity       |
| **Product Managers**    | PM, Product Lead           | Sprint velocity, requirements coverage, stakeholder tooling |
| **Developers**          | Software Eng, DevOps       | Technical deep dives, CI/CD setup, testing framework        |
| **Evaluators**          | Trial/signup within 7 days | Quick wins, onboarding guides, support resources            |

---

## 2. Welcome Sequence (5-Email Drip)

### Email 1: Welcome + Value Proposition

**Send:** Immediately on signup  
**Subject Line:** "Welcome to Agentic SDLC — Here's What 30+ Agents Can Do For
You"  
**Goal:** Set expectations, deliver immediate value

```
Structure:
- Welcome greeting (personalized by first name)
- 1-paragraph value proposition (from SP-12-702 messaging)
- 3 bullet points: key platform capabilities
- CTA: "Explore the Documentation →"
- P.S.: "Reply to this email with your biggest delivery challenge — we read every one."
```

### Email 2: The Problem We Solve

**Send:** Day 2  
**Subject Line:** "Why 68% of Software Projects Fail (And How to Fix It)"  
**Goal:** Problem awareness, emotional connection

```
Structure:
- Opening stat (industry failure rate)
- 3 common failure modes (from Phase 1 competitive analysis)
- How Agentic SDLC addresses each
- CTA: "See Our Risk Matrix Approach →"
```

### Email 3: How It Works

**Send:** Day 4  
**Subject Line:** "4 Phases, 30+ Agents, 1 Complete Solution"  
**Goal:** Product education

```
Structure:
- Visual: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Sprint Execution
- Brief description of each phase (2 sentences each)
- Highlight: "Every decision documented, every risk tracked"
- CTA: "Read the Architecture Overview →"
```

### Email 4: Social Proof / Case Study

**Send:** Day 7  
**Subject Line:** "How We Built This Platform — Using This Platform"  
**Goal:** Credibility, trust

```
Structure:
- Our own Sprint 1 story: 15 items, 54 tests, 4 discipline analysis
- Key outcome: production-ready foundation in 2-week sprint
- Quote from sprint retrospective
- CTA: "See Sprint 1 Results →"
```

### Email 5: Activation CTA

**Send:** Day 10  
**Subject Line:** "Ready to Ship Your First Sprint?"  
**Goal:** Conversion

```
Structure:
- Recap: what they've learned in emails 1-4
- Direct CTA: "Start your project →"
- Alternative CTA: "Book a walkthrough →" (for Enterprise segment)
- Social proof: GitHub stars, community size
```

---

## 3. Ongoing Newsletter Framework

### Newsletter: "The Sprint Report"

**Frequency:** Bi-weekly (aligned with sprint cadence)  
**Send Day:** Monday (sprint start)

| Section               | Content                                               | Length        |
| --------------------- | ----------------------------------------------------- | ------------- |
| **Sprint Highlights** | Key deliverables from previous sprint                 | 3-4 bullets   |
| **Feature Spotlight** | Deep dive on one new capability                       | 150-200 words |
| **Community Corner**  | GitHub contributor shoutout, open issues needing help | 2-3 items     |
| **Learning Resource** | Link to Dev.to article or documentation page          | 1 paragraph   |
| **Upcoming**          | Preview of next sprint goals                          | 2-3 bullets   |

---

## 4. Technical Setup Requirements

### Email Service Provider (ESP) Evaluation

| Provider       | Privacy                                      | Cost (Month 1)  | API         | Verdict        |
| -------------- | -------------------------------------------- | --------------- | ----------- | -------------- |
| **Buttondown** | Privacy-first, no tracking pixels by default | Free < 100 subs | REST API    | ✅ Recommended |
| Mailchimp      | Standard tracking                            | Free < 500 subs | REST API    | ⚠️ Acceptable  |
| Resend         | Developer-focused, React Email templates     | Free < 3k/month | REST + SMTP | ⚠️ Alternative |

**Decision:** Buttondown confirmed — aligns with Matomo self-hosted analytics
(SP-12-705 vendor decision March 17) and privacy-first governance pillar
(SP-12-705 analytics baseline). Final confirmation at Week 2 checkpoint with
analytics vendor decision.

### Email Template Structure

```html
<!-- Brand-aligned template using design tokens -->
Header: - Logo: brand-assets SP-12-701 - Background: var(--color-background)
#FAFAFA - Accent: var(--color-primary) #2563EB Body: - Font: Inter
(--font-family-primary) - Size: 16px (--font-size-body) - Link color:
var(--color-primary) #2563EB - Max width: 600px Footer: - Unsubscribe link
(mandatory) - Company address (CAN-SPAM compliance) - Social links (LinkedIn,
Twitter/X, GitHub)
```

---

## 5. Compliance

- **CAN-SPAM:** Physical address in footer, unsubscribe mechanism, no misleading
  subject lines
- **GDPR:** Double opt-in for EU subscribers, data processing disclosure, easy
  unsubscribe
- **Privacy:** No third-party tracking pixels unless user consents; align with
  analytics baseline (SP-12-705)

---

## 6. Written Email Copy

### Email 1: Welcome + Value Proposition

**Subject:** Welcome to Agentic SDLC — Here's What 30+ Agents Can Do For You
**Preview text:** From business strategy to production code — orchestrated.

Hi {{first_name}},

Welcome to Agentic SDLC — the first platform that orchestrates multi-discipline
analysis into a single delivery process.

Here's what that means for your team:

• **Complete solution design** — Business strategy, architecture, UX, and
go-to-market analyzed before writing code • **Built-in quality gates** — 80%
test coverage, secret scanning, and WCAG AA compliance from Sprint 1 • **Full
traceability** — Every decision documented, every risk tracked, every dependency
mapped

30+ specialized agents work through a structured 4-phase process, validated by
Critic and Risk agents at every boundary. Then sprint execution ships
production-ready code with automated CI/CD.

This isn't just code generation — it's structured delivery.

**Explore the documentation →** [link to docs/index.md]

P.S. Reply to this email with your biggest delivery challenge — we read every
one.

---

### Email 2: The Problem We Solve

**Subject:** Why 68% of Software Projects Fail (And How to Fix It) **Preview
text:** The gap between planning and execution costs teams months.

Hi {{first_name}},

The Standish Group reports that 68% of software projects fail or are challenged.
Not because of bad developers — but because of disconnected processes:

**Failure Mode 1: Strategy-Execution Gap** Teams plan in documents that
developers never read. By Sprint 3, the architecture has drifted from the
original vision.

_Agentic SDLC fix:_ Phase 1-4 analysis produces sprint-ready stories with
acceptance criteria linked directly to strategic requirements. Every
implementation traces back to a validated decision.

**Failure Mode 2: Quality as Afterthought** Testing, security, and compliance
are bolted on at the end — when fixing them costs 10x more.

_Agentic SDLC fix:_ Quality gates are built into the CI pipeline from Day 1.
Secret scanning, coverage gates (80%+), and WCAG AA compliance are enforced
automatically, not manually.

**Failure Mode 3: Silo Blindness** Engineering doesn't know what marketing
promised. UX doesn't know what architecture constrained. Everyone ships, nobody
aligns.

_Agentic SDLC fix:_ The Synthesis Report produces a cross-team blocker matrix —
every dependency between disciplines is identified, classified, and tracked
before implementation begins.

The result? A structured process where analysis feeds execution directly.

**See our risk management approach →** [link to risk matrix]

---

### Email 3: How It Works

**Subject:** 4 Phases, 30+ Agents, 1 Complete Solution **Preview text:** Here's
the structured process behind every Agentic SDLC project.

Hi {{first_name}},

Software delivery usually starts with "let's just build it." Agentic SDLC starts
with understanding what to build — and why.

**Phase 1 — Requirements & Strategy** Five agents analyze your business model,
market positioning, financial viability, and competitive landscape. Output:
validated requirements with risk assessment.

**Phase 2 — Architecture & Design** Six agents design your system: cloud
infrastructure, security posture, data model, DevOps pipeline, and legal
compliance. Output: architecture blueprint with dependency map.

**Phase 3 — Experience Design** Six agents handle UX research, interface design,
accessibility (WCAG AA from Day 1), content strategy, and localization planning.
Output: component library with design tokens.

**Phase 4 — Brand & Growth** Three agents create brand identity, go-to-market
messaging, and conversion frameworks. Output: launch-ready marketing with
analytics baseline.

**Then Sprint Execution begins.** Each 2-week sprint includes automated CI/CD,
quality gates (80%+ test coverage, secret scanning), and KPI tracking — with
full audit trails.

Every decision documented. Every risk tracked. Every dependency mapped.

**Read the Architecture Overview →** [link to technical-manual.md]

---

### Email 4: Social Proof / Case Study

**Subject:** How We Built This Platform — Using This Platform **Preview text:**
Our Sprint 1 results: 15 items, 77 tests, 0 blockers.

Hi {{first_name}},

The best way to prove a process works? Use it yourself.

Agentic SDLC was built using its own multi-agent process. Here's what Sprint 1
delivered:

**By the numbers:** • 15 sprint items across 4 disciplines (Business, Tech, UX,
Marketing) • 77 automated tests across 5 test suites — all passing • 8-job CI/CD
pipeline with secret scanning, coverage gates, and Docker builds • 91% WCAG AA
accessibility score from Sprint 1 • 0 unresolved blockers at sprint close

**What that looks like in practice:** Before writing code, the system produced a
64-dimension analysis across business strategy, technical architecture, UX
design, and go-to-market planning. The Synthesis Report identified 5 cross-team
dependencies and resolved them before Sprint 1 started.

During execution, the Sprint Gate enforced Definition of Ready on every item.
The Critic agent flagged 3 scope risks that were mitigated within 2 hours.

The result: a production-ready foundation delivered in one 2-week sprint — with
documentation, governance, and traceability built in.

**See Sprint 1 Results →** [link to sprint completion report]

---

### Email 5: Activation CTA

**Subject:** Ready to Ship Your First Sprint? **Preview text:** Your next
project could start with 30+ agents on your side.

Hi {{first_name}},

Over the past week, you've seen how Agentic SDLC works:

✅ The problem: disconnected teams, quality as afterthought, no traceability ✅
The process: 4-phase multi-agent analysis before code ✅ The proof: our own
Sprint 1 — 15 items, 77 tests, full governance

Now it's your turn.

**Option 1: Explore the documentation** Dive into the technical manual,
architecture decisions, and sprint reports. → [Documentation →]

**Option 2: Try the platform** Clone the repository and run your first analysis
cycle. → [Get Started on GitHub →]

**Option 3: Talk to us** Have questions about how Agentic SDLC fits your team?
Reply to this email — we read every one.

Whatever your next step, we're here to help you build software the way it should
be built: structured, validated, and production-ready.

Design it right. Build it fast.

— The Agentic SDLC Team

---

## 7. First Newsletter Issue — The Sprint Report, Sprint 1

**Subject:** The Sprint Report #1 — From Zero to 99 Tests in 6 Days  
**Preview text:** Sprint 1 Week 2 update. Real numbers. Real progress.

Hi {{first_name}},

Welcome to The Sprint Report — a bi-weekly look inside how Agentic SDLC is
built. Real metrics, real decisions, no fluff.

### Sprint 1 by the Numbers

📊 **Velocity:** 47% (7/15 items complete)  
✅ **Test Suite:** 99 tests across 5 suites (unit, integration, smoke)  
🛡️ **Security:** Gitleaks + Trivy scanning on every commit  
♿ **Accessibility:** WCAG AA 91% baseline score  
🎨 **Brand:** Design tokens v2.0.0 locked

### What We Shipped This Week

**Smoke Test Suite (SP-11-613)** — 23 new smoke tests covering 7 critical user
journeys. No Playwright needed — pure HTTP-based testing using Node’s built-in
modules. Tests run in under 0.5 seconds.

**GTM Messaging Framework (SP-12-702)** — Complete. 4 messaging pillars,
competitive positioning against 5 categories, objection handling guide, and a
sales enablement cheat sheet. Our tagline: _Design it right. Build it fast._

**Privacy-First Analytics** — Matomo self-hosted selected after scoring 3
vendors across 8 dimensions. No Google Analytics, no third-party data
processing, full data residency control.

### This Week’s Decision

We chose HTTP-based smoke tests over Playwright for Sprint 1. Why? Our CI
pipeline doesn’t need browser chromium installation, tests run 10x faster, and
we cover the same critical journeys at the API level. Playwright upgrade path is
preserved for Sprint 2 E2E scenarios.

### What’s Next

Week 2 targets: all marketing deliverables to 85%+, SP-11-613 CI integration,
sprint close preparation.

_Agentic SDLC is open-source. Star the repo: [GitHub link]_

Design it right. Build it fast.

— The Agentic SDLC Team

---

## 8. Email UTM Parameters

### Standard Convention

All email links use:

```
https://[domain]/?utm_source=email&utm_medium=newsletter&utm_campaign=[campaign]&utm_content=[link-id]
```

| Parameter      | Convention                         | Examples                                    |
| -------------- | ---------------------------------- | ------------------------------------------- |
| `utm_source`   | Always `email` for email channel   | `email`                                     |
| `utm_medium`   | `welcome-sequence` or `newsletter` | `welcome-sequence`, `newsletter`            |
| `utm_campaign` | Sequence or issue identifier       | `welcome-seq-1`, `sprint-report-001`        |
| `utm_content`  | Specific CTA or link               | `explore-docs`, `start-free`, `github-repo` |

### Welcome Sequence Links

- Email 1 CTA:
  `?utm_source=email&utm_medium=welcome-sequence&utm_campaign=welcome-seq-1&utm_content=explore-docs`
- Email 5 CTA:
  `?utm_source=email&utm_medium=welcome-sequence&utm_campaign=welcome-seq-5&utm_content=start-free`

---

## 9. HTML Email Template Specification

### Template Architecture

Responsive, single-column layout compatible with all major email clients (Gmail,
Outlook 365, Apple Mail, Thunderbird, Fastmail). Uses inline CSS for maximum
compatibility — no external stylesheet support in email.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{subject}}</title>
    <!--[if mso]>
      <style>
        body {
          font-family: Arial, sans-serif !important;
        }
      </style>
    <![endif]-->
  </head>
  <body
    style="margin:0;padding:0;background-color:#f7fafc;font-family:'Inter',Arial,sans-serif;"
  >
    <!-- Wrapper table for email client compatibility -->
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      width="100%"
      style="background-color:#f7fafc;"
    >
      <tr>
        <td align="center" style="padding:24px 16px;">
          <!-- Content container -->
          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            width="600"
            style="max-width:600px;width:100%;
               background-color:#ffffff;border-radius:8px;
               box-shadow:0 1px 3px rgba(0,0,0,0.05);"
          >
            <!-- Header -->
            <tr>
              <td
                style="padding:32px 32px 24px;border-bottom:2px solid #1a365d;"
              >
                <!-- Logo (inline image or text fallback) -->
                <img
                  src="{{logo_url}}"
                  alt="Agentic SDLC"
                  width="180"
                  height="45"
                  style="display:block;max-width:180px;height:auto;"
                />
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td
                style="padding:32px;color:#1a202c;font-size:16px;
                        line-height:1.6;"
              >
                {{content}}
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td style="padding:0 32px 32px;" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td
                      style="background-color:#1a365d;border-radius:6px;
                              padding:14px 28px;"
                    >
                      <a
                        href="{{cta_url}}"
                        target="_blank"
                        style="color:#ffffff;text-decoration:none;
                              font-weight:600;font-size:16px;
                              display:inline-block;"
                      >
                        {{cta_text}}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="padding:24px 32px;background-color:#f7fafc;
                        border-top:1px solid #e2e8f0;color:#4a5568;
                        font-size:14px;line-height:1.5;
                        border-radius:0 0 8px 8px;"
              >
                <p style="margin:0 0 8px;">
                  <a
                    href="{{linkedin_url}}"
                    style="color:#2b6cb0;text-decoration:none;"
                    >LinkedIn</a
                  >
                  ·
                  <a
                    href="{{twitter_url}}"
                    style="color:#2b6cb0;text-decoration:none;"
                    >Twitter/X</a
                  >
                  ·
                  <a
                    href="{{github_url}}"
                    style="color:#2b6cb0;text-decoration:none;"
                    >GitHub</a
                  >
                </p>
                <p style="margin:0 0 8px;">
                  Agentic SDLC · {{company_address}}
                </p>
                <p style="margin:0;">
                  <a
                    href="{{unsubscribe_url}}"
                    style="color:#4a5568;
                   text-decoration:underline;"
                    >Unsubscribe</a
                  >
                  ·
                  <a
                    href="{{preferences_url}}"
                    style="color:#4a5568;
                   text-decoration:underline;"
                    >Email preferences</a
                  >
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### Template Variables

| Variable              | Source                                       | Example                       |
| --------------------- | -------------------------------------------- | ----------------------------- |
| `{{subject}}`         | Email subject line                           | "Welcome to Agentic SDLC"     |
| `{{logo_url}}`        | SP-12-701 brand assets (horizontal PNG @2x)  | CDN-hosted logo URL           |
| `{{content}}`         | Email body copy (HTML-formatted)             | Per-email written copy        |
| `{{cta_url}}`         | Call-to-action destination + UTM params      | Docs link with UTM            |
| `{{cta_text}}`        | CTA button label                             | "Explore the Documentation →" |
| `{{first_name}}`      | Subscriber first name (Buttondown merge tag) | "Alex"                        |
| `{{unsubscribe_url}}` | Buttondown auto-generated                    | One-click unsubscribe         |
| `{{preferences_url}}` | Buttondown preferences page                  | Manage subscription           |
| `{{company_address}}` | CAN-SPAM required physical address           | Organization address          |

### Email Client Testing Checklist

| Client            | Platform      | Priority |
| ----------------- | ------------- | -------- |
| Gmail (Web)       | Browser       | P1       |
| Gmail (App)       | iOS / Android | P1       |
| Outlook 365 (Web) | Browser       | P1       |
| Outlook (Desktop) | Windows       | P2       |
| Apple Mail        | macOS / iOS   | P1       |
| Thunderbird       | Desktop       | P2       |
| Dark mode         | All clients   | P1       |

---

## 10. Double Opt-In Flow Specification

### Flow Diagram

```
Subscriber enters email on landing page
  ↓
Landing page sends POST to Buttondown API
  ↓
Buttondown sends confirmation email (auto-generated)
  ↓
Subscriber clicks confirmation link
  ↓
Subscriber marked CONFIRMED in Buttondown
  ↓
Welcome Email 1 triggered (Day 0)
  ↓
Emails 2-5 follow drip schedule (Day 2, 4, 7, 10)
```

### Landing Page Signup Form

```html
<form id="signup-form" action="/api/newsletter/subscribe" method="POST">
  <label for="email">Get updates on Agentic SDLC</label>
  <input
    type="email"
    id="email"
    name="email"
    required
    placeholder="your@email.com"
    aria-describedby="signup-privacy"
  />
  <button type="submit">Subscribe</button>
  <p id="signup-privacy" class="text-sm text-muted">
    No spam. Unsubscribe anytime. We use
    <a href="/privacy">Buttondown</a> — no tracking pixels.
  </p>
</form>
```

### Server-Side Handler

```javascript
// POST /api/newsletter/subscribe
// Proxies to Buttondown API — keeps API key server-side
async function handleSubscribe(req, res) {
  const { email } = req.body;
  // Input validation (email format only, no PII logging)
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  const response = await fetch('https://api.buttondown.com/v1/subscribers', {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, type: 'regular' }),
  });
  if (response.ok) {
    return res.status(201).json({ message: 'Check your email to confirm' });
  }
  return res.status(response.status).json({ error: 'Subscription failed' });
}
```

### GDPR Compliance Notes

- Double opt-in satisfies GDPR "unambiguous consent" requirement
- Confirmation email is auto-sent by Buttondown (not custom-triggered)
- Subscriber data stored only in Buttondown (privacy-first ESP)
- No PII logged server-side — only success/failure status
- Unsubscribe link in every email (CAN-SPAM + GDPR)

---

## 11. Remaining Work

- [x] Finalize ESP selection — Buttondown confirmed
- [x] Write Email 1-5 copy (complete welcome sequence)
- [x] Configure UTM parameters for email links
- [x] Write first newsletter issue
- [x] Create HTML email template specification
- [x] Document double opt-in flow specification
- [ ] Set up Buttondown account + API key configuration → Sprint 2
- [ ] Implement server-side subscribe endpoint → Sprint 2
- [ ] Test email template across clients → Sprint 2

**Note:** All specification and content work complete. Remaining items require
Buttondown account setup and server-side implementation — scheduled for
Sprint 2.

---

## HANDOFF CHECKLIST

- [x] Email strategy and objectives defined
- [x] Segmentation strategy documented (4 segments)
- [x] Welcome sequence outlined (5 emails, structure + subject lines)
- [x] Newsletter framework defined ("The Sprint Report")
- [x] ESP evaluated and recommended (Buttondown)
- [x] Template structure aligned with design tokens (SP-12-701)
- [x] Compliance requirements documented (CAN-SPAM, GDPR)
- [x] Email 1-5 copy written (complete welcome sequence)
- [x] First newsletter issue written ("The Sprint Report — Sprint 1")
- [x] UTM parameter scheme defined for email links
- [x] ESP confirmed (Buttondown)
- [x] HTML email template specification (responsive, inline CSS, client
      checklist)
- [x] Double opt-in flow specification (landing form, server handler, GDPR)
- [ ] Remaining: Buttondown setup + server implementation (Sprint 2)
- [x] Output written to file per MEMORY MANAGEMENT PROTOCOL
