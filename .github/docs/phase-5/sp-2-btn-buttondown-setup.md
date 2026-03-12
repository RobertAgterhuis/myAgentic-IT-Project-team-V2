# SP-2-BTN Buttondown ESP Setup & Integration

**Story:** SP-2-BTN (#126)  
**Sprint:** Sprint 2 (March 25 – April 7, 2026)  
**Track:** Marketing  
**Owner:** Growth Marketer  
**Status:** 🔄 IN PROGRESS (Day 1 — 30%)  
**Predecessor:** SP-12-704 (Email Marketing Framework) ✅  
**Estimated Days:** 1-2  
**Target Completion:** March 26, 2026

---

## 1. Scope (from SP-12-704 Carryover)

| Deliverable                            | Source       | Status   |
| -------------------------------------- | ------------ | -------- |
| Buttondown account configuration       | SP-12-704 §4 | 🔄 Day 1 |
| Server-side subscribe endpoint         | SP-12-704 §4 | ⬜ Day 2 |
| Cross-client email template testing    | SP-12-704 §4 | ⬜ Day 2 |
| Welcome sequence deployment (5 emails) | SP-12-704 §6 | ⬜ Day 2 |

---

## 2. Account Configuration

### Buttondown Settings

| Setting                | Value                            | Rationale                                            |
| ---------------------- | -------------------------------- | ---------------------------------------------------- |
| **Newsletter Name**    | Agentic SDLC — The Sprint Report | Aligns with SP-12-704 §3 newsletter name             |
| **From Name**          | Agentic SDLC Team                | Professional, team-oriented                          |
| **Reply-To**           | team@agentic-sdlc.dev            | Enables direct engagement (Email 1 P.S.)             |
| **Double Opt-In**      | Enabled                          | GDPR compliance (SP-12-704 §5)                       |
| **Tracking Pixels**    | Disabled                         | Privacy-first policy (aligns with Matomo, SP-12-705) |
| **RSS Feed**           | Disabled                         | Manual newsletter only for Sprint 2                  |
| **Custom Domain**      | newsletter.agentic-sdlc.dev      | Brand consistency                                    |
| **Unsubscribe Footer** | Enabled (mandatory)              | CAN-SPAM compliance                                  |

### Subscriber Tags (from SP-12-704 Segmentation)

| Tag                   | Maps To                  | Content Focus                          |
| --------------------- | ------------------------ | -------------------------------------- |
| `engineering-leaders` | CTO, VP Eng, Eng Manager | Architecture, governance, productivity |
| `product-managers`    | PM, Product Lead         | Sprint velocity, requirements, tooling |
| `developers`          | Software Eng, DevOps     | Technical deep dives, CI/CD, testing   |
| `evaluators`          | Trial/signup < 7 days    | Quick wins, onboarding, support        |

---

## 3. API Integration Specification

### Subscribe Endpoint Design

```
POST /api/subscribe
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "metadata": {
    "segment": "developers",       // one of: engineering-leaders, product-managers, developers, evaluators
    "source": "landing-page"        // UTM source tracking
  }
}

Response (201):
{
  "status": "pending_confirmation",
  "message": "Please check your email to confirm subscription."
}

Response (400):
{
  "error": "invalid_email",
  "message": "Please provide a valid email address."
}

Response (409):
{
  "error": "already_subscribed",
  "message": "This email is already subscribed."
}
```

### Buttondown API Integration

```javascript
// Server-side Buttondown API call (Node.js)
// Environment: BUTTONDOWN_API_KEY in .env (never client-side)

const BUTTONDOWN_API = 'https://api.buttondown.email/v1/subscribers';

async function subscribeUser(email, metadata) {
  const response = await fetch(BUTTONDOWN_API, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      tags: [metadata.segment],
      metadata: { source: metadata.source },
      referrer_url: metadata.source,
    }),
  });

  if (response.status === 201) {
    return { status: 'pending_confirmation' };
  }
  if (response.status === 409) {
    return { status: 'already_subscribed' };
  }
  throw new Error(`Buttondown API error: ${response.status}`);
}
```

### Required Secrets

| Secret               | Where                                | Purpose               |
| -------------------- | ------------------------------------ | --------------------- |
| `BUTTONDOWN_API_KEY` | `.env` (local) / GitHub Secrets (CI) | Server-side API calls |

**Security:** API key is never exposed to the client. All subscribe requests go
through the server-side endpoint.

---

## 4. Email Template Specification

### Brand-Aligned Template (from SP-12-704 §4)

| Element        | Value                            | Source                |
| -------------- | -------------------------------- | --------------------- |
| Logo           | SP-12-701 brand assets           | `.github/docs/brand/` |
| Background     | `#FAFAFA` (`--color-background`) | Design tokens         |
| Primary accent | `#2563EB` (`--color-primary`)    | Design tokens         |
| Font family    | Inter (`--font-family-primary`)  | Design tokens         |
| Body font size | 16px (`--font-size-body`)        | Design tokens         |
| Link color     | `#2563EB` (`--color-primary`)    | Design tokens         |
| Max width      | 600px                            | Email best practice   |

### Cross-Client Testing Matrix

| Client        | Platform  | Priority | Status |
| ------------- | --------- | -------- | ------ |
| Gmail (Web)   | Desktop   | P1       | ⬜     |
| Apple Mail    | macOS/iOS | P1       | ⬜     |
| Outlook 365   | Desktop   | P1       | ⬜     |
| Outlook (Web) | Desktop   | P2       | ⬜     |
| Yahoo Mail    | Desktop   | P2       | ⬜     |
| Gmail (App)   | Mobile    | P1       | ⬜     |
| Samsung Mail  | Mobile    | P3       | ⬜     |

**Testing Tool:** Buttondown built-in preview + manual cross-client (Day 2)

---

## 5. Welcome Sequence Deployment (5 Emails)

All email copy is COMPLETE in SP-12-704 §6. Deployment to Buttondown:

| Email | Subject                     | Trigger                   | Delay     |
| ----- | --------------------------- | ------------------------- | --------- |
| 1     | Welcome + Value Proposition | On subscribe confirmation | Immediate |
| 2     | The Problem We Solve        | Timed                     | Day 2     |
| 3     | How It Works                | Timed                     | Day 4     |
| 4     | Social Proof / Case Study   | Timed                     | Day 7     |
| 5     | Activation CTA              | Timed                     | Day 10    |

---

## 6. Acceptance Criteria

- [ ] Buttondown account created with privacy-first settings
- [ ] Double opt-in enabled (GDPR compliance)
- [ ] Tracking pixels disabled
- [ ] 4 subscriber segments configured as tags
- [ ] Server-side `/api/subscribe` endpoint spec documented
- [ ] Cross-client template testing matrix defined
- [ ] Welcome sequence (5 emails) scheduled in Buttondown
- [ ] `BUTTONDOWN_API_KEY` documented as required secret

---

## Day 1 Progress

- ✅ Account configuration spec complete (§2)
- ✅ API integration spec documented (§3)
- ✅ Template specification defined (§4)
- ✅ Deployment plan for welcome sequence (§5)
- ⬜ Actual Buttondown account creation (requires production credentials)
- ⬜ Cross-client testing execution (Day 2)
- ⬜ Endpoint implementation in codebase (Day 2)
