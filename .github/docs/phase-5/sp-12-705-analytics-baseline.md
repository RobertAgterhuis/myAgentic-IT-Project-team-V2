# SP-12-705 Analytics Baseline & Privacy-First Setup

**Story:** SP-12-705 (Campaign Analytics Baseline & Privacy-First Setup)  
**Sprint:** Sprint 1 (March 10-24, 2026)  
**Track:** Marketing  
**Owner:** CRO Specialist  
**Status:** ✅ SPRINT 1 SCOPE COMPLETE (Day 8 — 95%, GitHub traffic baseline captured, Matomo staging spec finalized)  
**Note:** Implementation deferred to Sprint 2 per DEC-BLOCKER-1-502 (no GA4; privacy-first only)

**Sprint 2 Carryover:** Matomo Docker stack deployment in staging, final traffic
snapshot at sprint close. All vendor evaluation, A/B testing framework,
dashboard mockup, goal configuration, and GitHub traffic baseline are complete.

---

## 1. Privacy-First Analytics Vendor Evaluation

Per executive decision DEC-BLOCKER-1-502: **No Google Analytics 4.** Evaluate
privacy-first alternatives only (Plausible, Fathom, Matomo).

### Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Privacy compliance | 30% | GDPR compliance without cookie banner, data residency, no PII collection |
| Feature completeness | 25% | Goals, funnels, custom events, UTM tracking, API access |
| Self-hosting option | 20% | Can be deployed on own infrastructure (Docker/cloud) |
| Cost efficiency | 15% | Pricing model, free tier availability, per-pageview costs |
| Integration ease | 10% | Script size, API documentation, dashboard customization |

### Vendor Comparison

| Feature | Plausible | Fathom | Matomo |
|---------|-----------|--------|--------|
| **Privacy Model** | Cookieless, no PII, EU-hosted | Cookieless, no PII, consent-free | Cookie-based (configurable cookieless), full GDPR compliance tools |
| **GDPR Compliance** | ✅ No consent banner needed | ✅ No consent banner needed | ✅ With configuration (cookieless mode) |
| **Self-Hosting** | ✅ Docker, Elixir (open source) | ❌ Cloud-only | ✅ Docker, PHP (open source, most mature) |
| **Custom Events** | ✅ JavaScript API | ✅ JavaScript API | ✅ Full event tracking + e-commerce |
| **Funnels** | ✅ Built-in | ✅ Built-in | ✅ Advanced (multi-step, configurable) |
| **Goals/Conversions** | ✅ Page + event goals | ✅ Page + event goals | ✅ Advanced goal tracking |
| **UTM Tracking** | ✅ Automatic | ✅ Automatic | ✅ Automatic + manual campaigns |
| **API Access** | ✅ REST API | ✅ REST API | ✅ REST API + reporting API |
| **Dashboard** | Clean, minimal | Clean, minimal | Full-featured (complex) |
| **Script Size** | ~1KB | ~2KB | ~22KB (full) / ~5KB (lite) |
| **Cost (Cloud)** | $9/mo (10K views) | $14/mo (up to 100K) | Free (self-hosted) / €19/mo (cloud) |
| **Cost (Self-Host)** | Free (OSS) | N/A | Free (OSS) |
| **Community** | Active, growing | Smaller, focused | Largest (15+ years, enterprise adoption) |

### Scoring

| Vendor | Privacy (30%) | Features (25%) | Self-Host (20%) | Cost (15%) | Integration (10%) | **Total** |
|--------|--------------|----------------|-----------------|-----------|-------------------|-----------|
| **Plausible** | 9.5 | 7.0 | 8.5 | 8.0 | 9.0 | **8.3** |
| **Fathom** | 9.5 | 7.0 | 2.0 | 6.5 | 8.5 | **7.0** |
| **Matomo** | 8.0 | 9.5 | 9.5 | 9.5 | 6.0 | **8.6** |

### Recommendation

**Primary: Matomo (self-hosted)** — Highest score (8.6). Best feature
completeness, full self-hosting (Docker), free, largest community. Requires
cookieless mode configuration for GDPR consent-free operation.

**Alternative: Plausible (cloud or self-hosted)** — Score 8.3. Simplest setup,
best privacy-by-default, smallest script footprint. Limited advanced features
compared to Matomo.

**Decision Required:** PM to confirm vendor selection at Week 2 checkpoint.
Recommendation: Matomo self-hosted for feature completeness; Plausible cloud if
simplicity preferred.

---

## 2. Analytics Goals Definition

### Primary KPIs

| Goal | Metric | Target | Measurement |
|------|--------|--------|-------------|
| **Product Adoption** | Monthly Active Users (MAU) | Baseline → +20% Q2 | Unique visitors to /dashboard or /webapp |
| **Signup Conversion** | Visitor → Signup rate | ≥5% | Landing page visitors → account created |
| **Feature Adoption** | Feature use rate | ≥60% of active users | Users who access ≥3 features per session |
| **Engagement** | Avg. session duration | ≥3 minutes | Time on site per session |
| **Retention** | 7-day return rate | ≥40% | Users returning within 7 days of first visit |

### Secondary KPIs

| Goal | Metric | Target |
|------|--------|--------|
| Documentation reads | Pages/session in /docs | ≥2.5 pages |
| CLI/API adoption | API endpoint unique callers | Baseline (Sprint 2) |
| Community engagement | GitHub stars + issues/month | Baseline (Sprint 2) |
| Email list growth | New subscribers/week | ≥50/week post-launch |

---

## 3. Event Tracking Plan

### Critical User Journeys

| Journey | Events | Priority |
|---------|--------|----------|
| **Landing → Signup** | `page_view(/landing)` → `cta_click(signup)` → `signup_start` → `signup_complete` | P1 |
| **Signup → First Use** | `signup_complete` → `onboarding_start` → `feature_first_use(X)` → `onboarding_complete` | P1 |
| **Feature Adoption** | `feature_use(questionnaire)`, `feature_use(decisions)`, `feature_use(sprint)`, `feature_use(dashboard)` | P1 |
| **Return Visit** | `session_start(returning)` → `feature_use(X)` → `session_end` | P2 |
| **Documentation** | `docs_view(page)` → `docs_search(query)` → `docs_feedback(helpful/not)` | P2 |

### Event Naming Convention

- **Format:** `[category]_[action]([label])` — e.g., `cta_click(signup)`
- **Categories:** `page`, `cta`, `signup`, `onboarding`, `feature`, `docs`, `session`
- **Actions:** `view`, `click`, `start`, `complete`, `use`, `search`, `feedback`
- **Labels:** Descriptive, lowercase, snake_case — e.g., `questionnaire`, `decisions_tab`

### Privacy Rules

- **No PII in events:** No email, name, IP address, or user ID in event payloads
- **No cookie tracking:** Use cookieless mode (hash-based visitor identification)
- **No third-party sharing:** Analytics data stays on self-hosted infrastructure
- **Data retention:** 24 months (configurable in Matomo/Plausible)
- **GDPR consent:** Not required in cookieless mode (no personal data processed)

---

## 4. Dashboard Template

### Overview Dashboard Panels

| Panel | Metrics Displayed | Refresh Rate |
|-------|-------------------|-------------|
| **Visitors** | Unique visitors (daily/weekly/monthly), traffic sources, top pages | Real-time |
| **Conversion Funnel** | Landing → Signup → First Use → Active User (4-step funnel) | Daily |
| **Feature Adoption** | Usage count per feature, adoption rate, top features | Daily |
| **Engagement** | Avg. session duration, pages/session, bounce rate | Daily |
| **Geographic** | Visitors by country (no city-level for privacy) | Weekly |
| **Campaign** | UTM source/medium/campaign performance | Daily |

---

## 5. A/B Testing Framework

### Testing Strategy

| Test Type | Use Case | Tool | Priority |
|-----------|----------|------|----------|
| **Landing page variants** | Headline, CTA text, hero imagery | Server-side (Node.js middleware) | P1 |
| **Onboarding flow** | Step order, content length, skip options | Feature flags | P1 |
| **Pricing page** | Layout, plan emphasis, social proof placement | Server-side | P2 |
| **Email subject lines** | Open rate optimization | ESP built-in (Buttondown/Mailchimp) | P2 |

### A/B Testing Rules

1. **Minimum sample size:** 200 visitors per variant before declaring significance
2. **Statistical significance threshold:** 95% confidence (p < 0.05)
3. **Test duration:** Minimum 7 days (to account for weekday/weekend variance)
4. **One test per page:** Avoid interaction effects between simultaneous tests
5. **Privacy:** No A/B cookies — use hash-based bucketing (visitor hash mod N)

### Server-Side A/B Implementation Pattern

```javascript
// Privacy-compliant A/B bucketing (no cookies, no PII)
function getVariant(visitorHash, testId, numVariants) {
  const bucket = Math.abs(hashCode(visitorHash + testId)) % numVariants;
  return bucket; // 0 = control, 1+ = variants
}

// Track variant exposure via analytics event
// event: ab_test_exposure(test_id, variant_id)
// event: ab_test_conversion(test_id, variant_id)
```

### Sprint 2 A/B Test Backlog

| Test ID | Page | Hypothesis | Variants |
|---------|------|-----------|----------|
| AB-001 | Landing | "End-to-End" headline outperforms "Multi-Agent" headline | 2 |
| AB-002 | Landing | CTA "Start Building →" outperforms "Get Started →" | 2 |
| AB-003 | Onboarding | 3-step onboarding outperforms 5-step onboarding | 2 |

---

## 6. Implementation Guide (Sprint 2 Developer Handoff)

### Matomo Self-Hosted Deployment

```yaml
# docker-compose.analytics.yml
services:
  matomo:
    image: matomo:5-fpm-alpine
    restart: unless-stopped
    volumes:
      - matomo-data:/var/www/html
    environment:
      - MATOMO_DATABASE_HOST=matomo-db
      - MATOMO_DATABASE_DBNAME=matomo
      - MATOMO_DATABASE_USERNAME=matomo
    depends_on:
      - matomo-db

  matomo-db:
    image: mariadb:11
    restart: unless-stopped
    volumes:
      - matomo-db-data:/var/lib/mysql
    environment:
      - MYSQL_DATABASE=matomo
      - MYSQL_USER=matomo

  matomo-web:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - matomo-data:/var/www/html:ro
      - ./matomo-nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - matomo

volumes:
  matomo-data:
  matomo-db-data:
```

> **Note:** Database passwords must be injected via secrets management (not
> committed to repository). See RISK-806.

### Tracking Script Integration

```html
<!-- Matomo cookieless tracking (no consent banner required) -->
<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['disableCookies']);     // CRITICAL: cookieless mode
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u = 'https://analytics.yourdomain.com/';
    _paq.push(['setTrackerUrl', u + 'matomo.php']);
    _paq.push(['setSiteId', '1']);
    var d = document, g = d.createElement('script'),
        s = d.getElementsByTagName('script')[0];
    g.async = true; g.src = u + 'matomo.js';
    s.parentNode.insertBefore(g, s);
  })();
</script>
```

### Custom Event Helper

```javascript
// analytics.js — event tracking helper for webapp
function trackEvent(category, action, label, value) {
  if (typeof _paq !== 'undefined') {
    _paq.push(['trackEvent', category, action, label, value]);
  }
}

// Usage examples (aligned with Section 3 event plan):
// trackEvent('cta', 'click', 'signup');
// trackEvent('feature', 'use', 'questionnaire');
// trackEvent('docs', 'view', 'technical-manual');
```

### Plausible Alternative (If Selected)

```html
<!-- Plausible — drop-in, 1KB, no cookies, no consent needed -->
<script defer data-domain="yourdomain.com"
  src="https://plausible.io/js/script.js"></script>
```

---

## 7. Baseline Traffic Metrics (Pre-Analytics, Sprint 1)

### Data Sources

Before Matomo deployment (Sprint 2), baseline metrics are captured from:
1. **GitHub Repository Insights** — traffic, clones, referrers (available via
   GitHub API: `GET /repos/{owner}/{repo}/traffic/views`)
2. **GitHub Pages** — docs site at `docs/` directory, served via Jekyll
3. **CI Pipeline Telemetry** — build frequency, test run counts, pass rates

### Sprint 1 Baseline Snapshot (March 19, 2026 — Day 7)

| Metric | Value | Source | Notes |
|--------|-------|--------|-------|
| Repository views (14d) | 46 views (1 unique visitor) | GitHub Traffic API | Captured March 19 via `GET /traffic/views` |
| Repository clones (14d) | 533 clones (76 unique) | GitHub Traffic API | Captured March 19 via `GET /traffic/clones` |
| Top referrers | github.com — 32 views (1 unique) | GitHub Traffic API | Single referrer source |
| Top pages | /issues (15 views), / (14 views), /pulls (4 views) | GitHub Traffic API | Issue tracker most visited |
| Test suite size | 99 tests, 5 suites | CI Pipeline (`npm test`) | Verified March 19 |
| Test pass rate | 100% (99/99) | CI Pipeline | All suites green |
| CI pipeline jobs | 8 (7 enabled, 1 gated) | ci-pipeline.yml | Job 7=enabled (Day 7), Job 8=status badge |
| Coverage gate | 80% threshold | jest.config (coverageThreshold) | Holding |
| Docs pages | 12 pages in `docs/` | GitHub Pages / Jekyll | _config.yml present |
| API endpoints | 42 routes across 9 route files | Server route table | Source: server.js ROUTES |
| WCAG AA score | 91% | Accessibility audit | Sprint 1 baseline |
| Design tokens version | 2.0.0 (LOCKED) | design-tokens.json | Stable |

### Post-Analytics Targets (Sprint 2 Week 3)

| Metric | Baseline (Sprint 1) | Sprint 2 Target | Measurement Tool |
|--------|---------------------|-----------------|------------------|
| Weekly unique visitors | Unknown | Establish baseline | Matomo |
| Avg session duration | Unknown | >2 min | Matomo |
| Bounce rate | Unknown | <60% | Matomo |
| Questionnaire completion | 0% (no tracking) | >40% | Matomo events |
| API health uptime | Assumed 99%+ (local) | 99.5% SLA | Matomo + health endpoint |

> **Note:** GitHub traffic data captured March 19 via API. A final delta
> snapshot should be captured at sprint close (March 24) for comparison.

### Traffic Insight Summary (March 19)

- **Clone-to-view ratio: 11.6x** — 533 clones vs 46 views indicates CI/CD
  automation (pipelines cloning frequently) rather than organic browse traffic.
- **Single unique visitor** across views — confirms the repository is not yet
  publicly promoted (expected, marketing launch is Sprint 2+).
- **Issues page is top content** (15/46 views, 33%) — sprint board activity
  drives most engagement.
- **76 unique cloners** — likely CI runners across branches + developer
  workstations.

### Baseline Delta Tracking

| Metric | March 19 | March 24 (Sprint Close) | Delta |
|--------|----------|------------------------|-------|
| Repo views (14d) | 46 | _TBD_ | — |
| Unique visitors | 1 | _TBD_ | — |
| Clones (14d) | 533 | _TBD_ | — |
| Unique cloners | 76 | _TBD_ | — |
| Top referrer | github.com (32) | _TBD_ | — |

---

## 8. Dashboard Template Mockup Specification

### Matomo Dashboard Layout (6-panel grid)

```
┌───────────────────────────────────────────────────────────┐
│  P1: Visitor Overview              P2: Traffic Sources       │
│  ─ Unique visitors (line chart)    ─ Referrer breakdown (pie) │
│  ─ Daily/Weekly/Monthly toggle     ─ UTM campaign table       │
│  ─ New vs returning visitors       ─ Direct / Organic / Social│
├───────────────────────────────────────────────────────────┤
│  P3: Conversion Funnel             P4: Feature Adoption      │
│  ─ Landing → Signup → Use → Active ─ Bar chart: top features   │
│  ─ Drop-off rates per step        ─ questionnaire / decisions │
│  ─ Goal completion rate            ─ dashboard / sprint view   │
├───────────────────────────────────────────────────────────┤
│  P5: Engagement                    P6: A/B Test Results      │
│  ─ Avg session duration            ─ Active tests (table)     │
│  ─ Pages per session               ─ Variant performance      │
│  ─ Bounce rate (target: <60%)      ─ Statistical significance │
└───────────────────────────────────────────────────────────┘
```

### Panel Configuration (Matomo widget IDs)

| Panel | Matomo Widget | Refresh | Notes |
|-------|--------------|---------|-------|
| P1 | VisitsSummary.getVisits | Real-time | Period selector: day/week/month |
| P2 | Referrers.getReferrerType | Daily | Includes UTM campaign breakdowns |
| P3 | Goals.get (Goal ID 1-4) | Daily | 4-step funnel configured in Matomo goals |
| P4 | Events.getAction (category=feature) | Daily | Custom events from analytics.js helper |
| P5 | VisitsSummary.getSummary | Daily | Session duration, pages/session, bounce |
| P6 | Custom segment + manual | Weekly | A/B test results from hash-based bucketing |

### Matomo Goal Configuration

| Goal ID | Name | Trigger | Target |
|---------|------|---------|--------|
| 1 | Landing Page Visit | URL = / | Funnel step 1 |
| 2 | Signup / First Use | Event: `cta.click.signup` | Funnel step 2 |
| 3 | Feature Adoption | Event: `feature.use.*` (any) | Funnel step 3 |
| 4 | Active User | ≥3 sessions in 7 days | Funnel step 4 |
| 5 | Health Uptime | External check: /health 200 | SLA metric |

---

## 9. Remaining Work

- [x] PM confirms vendor selection — **Matomo (self-hosted)** selected at March 17 standup. Plausible retained as lightweight alternative for landing page only. Decision rationale: highest feature score (8.6), self-hosted data residency, funnel support for conversion tracking.
- [x] ~~Create analytics implementation guide for Sprint 2 developer handoff~~ ✅ Done (Section 6)
- [x] ~~Define A/B testing configuration~~ ✅ Done (Section 5)
- [x] Document baseline traffic metrics (Sprint 1 snapshot in Section 7)
- [x] Create dashboard template mockup specification (Section 8)
- [x] Capture GitHub repo traffic data ✅ Done (March 19, Day 7 — baseline captured via GitHub Traffic API)
- [ ] Deploy Matomo Docker stack in staging (Sprint 2)
- [ ] Final traffic snapshot at sprint close March 24 (delta comparison vs March 19)

**Implementation Timeline (Sprint 2):**
- Week 1: Vendor deployment (Docker self-hosted or cloud signup)
- Week 2: Tracking script integration + event implementation
- Week 3: Dashboard configuration + baseline capture
- Week 4: A/B testing framework setup

---

## HANDOFF CHECKLIST

- [x] Privacy-first vendor evaluation complete (3 vendors scored)
- [x] Recommendation documented (Matomo primary, Plausible alternative)
- [x] Analytics goals defined (5 primary, 4 secondary KPIs)
- [x] Event tracking plan with naming conventions
- [x] Privacy rules documented (no PII, cookieless, no third-party sharing)
- [x] Dashboard template panels defined
- [x] A/B testing framework defined with privacy-compliant bucketing
- [x] Implementation guide with deployment configs (Matomo + Plausible)
- [x] Vendor selection confirmed — Matomo (self-hosted), March 17
- [x] Baseline traffic metrics documented (Sprint 1 pre-analytics snapshot)
- [x] Dashboard template mockup specified (6-panel grid + Matomo widget IDs)
- [x] Matomo goal configuration defined (5 goals)
- [x] GitHub repo traffic baseline captured via API (views, clones, referrers, top pages — March 19)
- [x] CI pipeline status updated (7 enabled, Job 7 added Day 7)
- [x] Output written to file per MEMORY MANAGEMENT PROTOCOL
