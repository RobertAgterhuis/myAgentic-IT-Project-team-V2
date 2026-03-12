# Welcome Sequence Email Templates — Buttondown

This directory contains the 5-email welcome sequence for the Agentic SDLC
Platform newsletter, implemented per SP-12-704 (Email Marketing Framework).

## Template Architecture

- **base-layout.html** — Responsive HTML wrapper (600px, inline CSS, dark mode
  support). Tested for: Gmail (web/app), Outlook 365, Apple Mail, Thunderbird,
  dark mode.
- **welcome-1.md** through **welcome-5.md** — Buttondown Markdown content for
  each sequence email. Buttondown renders Markdown into the configured template.

## Welcome Sequence Schedule

| # | Send Trigger | Subject | Goal |
|---|-------------|---------|------|
| 1 | Immediate (confirmation) | Welcome to the Agentic SDLC Platform | Value proposition |
| 2 | Day 2 | Why 68% of software projects fail | Problem awareness |
| 3 | Day 4 | How 4 phases replace chaos with clarity | Product education |
| 4 | Day 7 | Sprint 1: 15 items, 113 tests, 0 blockers | Social proof |
| 5 | Day 10 | Ready to build your first project? | Conversion |

## Buttondown Configuration

### Automation Rules (set in Buttondown dashboard)

```
Trigger: subscriber.confirmed
Action: Send welcome-1 immediately

Trigger: subscriber.confirmed + delay 2 days
Action: Send welcome-2

Trigger: subscriber.confirmed + delay 4 days
Action: Send welcome-3

Trigger: subscriber.confirmed + delay 7 days
Action: Send welcome-4

Trigger: subscriber.confirmed + delay 10 days
Action: Send welcome-5
```

### Subscriber Tags (Segments)

- `engineering-leaders` — CTOs, VPs of Engineering, Tech Directors
- `product-managers` — Product leads, Program managers
- `developers` — Individual contributors, senior developers
- `evaluators` — Evaluating the platform (default segment)

### Custom Fields

- `source` — Acquisition channel (direct, landing, social, referral)
- `segment` — Subscriber tag (engineering-leaders, product-managers, developers,
  evaluators)

## UTM Convention

All links in emails use:
```
?utm_source=email&utm_medium=welcome-sequence&utm_campaign=welcome-seq-[N]&utm_content=[link-id]
```

## Compliance

- **CAN-SPAM:** Physical mailing address placeholder in footer, one-click
  unsubscribe via `{{UNSUBSCRIBE_URL}}`
- **GDPR:** Double opt-in enforced (Buttondown default), no tracking pixels by
  default
- **Buttondown handles:** Unsubscribe management, bounce processing, complaint
  handling
