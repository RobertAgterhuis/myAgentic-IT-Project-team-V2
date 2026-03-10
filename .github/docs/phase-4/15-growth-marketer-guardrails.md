# Growth Marketer Guardrails — CREATE Mode
> **Agent:** 15-growth-marketer  
> **Phase:** 4 — Brand & Growth  
> **Deliverable:** 4 of 4 (Guardrails)  
> **Date:** 2026-03-10T15:15:00Z  
> **Mode:** CREATE  
> **Based on:** 15-growth-marketer-analysis.md

---

## Metadata
- Agent: Growth Marketer (15)
- Phase: 4
- Date: 2026-03-10
- Based on: Growth Marketer Analysis (gaps and risks)

---

## Guardrail G-GM-001

### Title
Growth Model Assumption Validation Required Before Paid Advertising Scale

### Scope
- Applies to: All paid advertising budget allocation (Google Ads, LinkedIn Ads, paid partnerships)
- Time horizon: Month 1-2 (pre-paid scale), then ongoing (monthly review)

### Rule
Must not allocate paid advertising budget exceeding $10K/month until evidence of 30%+ trial-to-customer conversion rate is documented. If organic + community channels deliver >$100K ARR at <5% CAC-to-LTV ratio, then paid ads (Month 2+) may scale with documented growth model assumptions (PLG + SLG hybrid confirmed via activation/retention metrics).

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-GM-001 — premature paid spend`; escalate to CFO/Finance and pause paid ads campaign until conversion rate evidence is provided and threshold is met.

### Rationale
RISK-GM-001 (SEO ranking risk) and RISK-GM-004 (growth model assumptions unvalidated) require proof before scaling. Paid spend without PMF evidence is capital waste (SaaS benchmark: $500+ CAC for immature products; $30-50 CAC for PMF-validated products = 10x difference). Source: GAP-GM-002 (aha-moment validation pending), REC-GM-002 (activation friction testing before scale).

### Verification Method
Weekly growth metrics dashboard: Track trial-to-customer conversion rate, CAC by channel, LTV estimate. Quarterly CFO review of paid ad ROI vs. organic ROI. Paid ads budget approval gate: requires Finance + VP Product sign-off if conversion rate <30%.

---

## Guardrail G-GM-002

### Title
Activation Friction Testing Must Be Completed Before Launch

### Scope
- Applies to: Product launch, onboarding flow deployment
- Time horizon: Pre-launch mandatory gate (must complete by Week -1)

### Rule
Product launch is blocked if onboarding friction testing (SP-1-108) is not completed with clear verdict:  "Flow is acceptable" (aha-moment achieved for 60%+ users within 25-30 min) OR "Flow requires simplification" with implemented fixes and re-test passing. Test sample size minimum: 8 users representing target ICP (architects, PMs).

### Violation Action
Mark `BLOCKER_CRITICAL: G-GM-002 — launch gate failed`; escalate to Product Sponsor; delay launch until testing complete + verdict obtained.

### Rationale
RISK-GM-002 (onboarding friction unknown) is existential risk to PLG model. Time-to-value <30 min is non-negotiable for trial-based acquisition. Launching without friction validation is 50%+ probability of <2% trial-to-customer conversion (unviable). Source: Agent analysis REC-GM-002, UX Researcher (10) time-to-value research.

### Verification Method
SP-1-108 completion checklist: 8+ test users, time-to-aha-moment documented, friction points logged, verdict stated. Product manager or Growth Marketer sign-off on verdict. If "Flow requires simplification", re-test with 5 new users post-fix must pass before launch.

---

## Guardrail G-GM-003

### Title
Growth Experiment Structure and Baseline Documentation Required

### Scope
- Applies to: All growth experiments (activation, retention, viral, acquisition optimization)
- Time horizon: Experiment design mandatory before launch; ongoing for all experiments

### Rule
No growth experiment may launch without documented hypothesis, baseline metric, target effect size, sample size calculation, and statistical significance threshold (p<0.05). Experiments without baseline measurement or success criteria are not permitted.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-GM-003 — experiment not rigorously designed`; reject experiment from backlog until hypothesis and baseline are documented by CRO Specialist (Agent 16).

### Rationale
RISK-GM-004 (growth model assumptions unvalidated) requires structured testing. Ad-hoc experiments without baselines waste time and produce inconclusive results. Source: REC-GM-003 (growth experiments backlog structured for rigorous testing), Agent analysis section "Growth Experiments Backlog".

### Verification Method
Experiment template: Hypothesis, Baseline (current metric value), Target (desired effect size), Sample Size Calc (power analysis with n >= required for p<0.05), Success Criteria. CRO Specialist sign-off before test deployment. Weekly experiment dashboard review by Growth Lead.

---

## Guardrail G-GM-004

### Title
Channel Attribution Must Be Tracked and Reconciled Monthly

### Scope
- Applies to: All acquisition channels (organic, community, partnerships, paid ads)
- Time horizon: Month 1 onward (ongoing)

### Rule
Every trial signup and customer acquisition must be attributed to a source channel (organic search, ProductHunt, Reddit, newsletter partner, paid ad, partnership, referral, direct). Unattributed conversions must not exceed 5% of total monthly conversions. Monthly reconciliation: sum of attributed conversions must match total signups/customers within 2% variance.

### Violation Action
Mark `ATTRIBUTION_ERROR: [channel] — reconciliation variance >2%`; escalate to Growth Marketer and Analytics team for investigation. Pause reporting until reconciliation complete (identify missing UTM tags, tracking gaps, or double-counting).

### Rationale
Cannot validate growth model assumptions (REC-GM-001) without reliable channel attribution. Inaccurate attribution leads to wrong channel prioritization (e.g., paying for ads that are actually organic traffic leaking through untagged links). Source: Agent analysis Section "Acquisition Channel Strategy" (channel prioritization depends on attribution accuracy).

### Verification Method
Product analytics (GA4 + Mixpanel) UTM tracking + monthly reconciliation report. Channel attribution dashboard updated daily, reviewed weekly. Monthly audit: sign-off by VP Growth on attribution accuracy.

---

## Guardrail G-GM-005

### Title
Aha-Moment Achievement Rate Must Sustain 50%+ for Activation Health

### Scope
- Applies to: Trial user onboarding, activation metrics tracking
- Time horizon: Ongoing (Month 1+)

### Rule
Aha-moment achievement rate (users completing Phase 1 + inviting team member within 25-30 min of signup) must not fall below 50% for any 7-day cohort. If rate drops below 50%, alert Growth Marketer and Product Manager within 24 hours. Investigation + fix required within 5 days (either product friction fix or marketing copy update).

### Violation Action
Mark `ACTIVATION_YELLOW_FLAG` if rate 40-50%; mark `ACTIVATION_RED_FLAG` if rate <40%. Red flag triggers immediate escalation to VP Product + Growth Lead. Launch post-mortem and remediation plan within 24 hours.

### Rationale
Aha-moment rate is leading indicator of trial-to-customer conversion. If rate drops, it signals either (1) onboarding flow regression (product bug), (2) user expectations mismatch (marketing messaging overpromised), or (3) product-market fit shifting. Early detection enables rapid fix. Source: RISK-GM-002 (onboarding friction), REC-GM-002 (aha-moment validation).

### Verification Method
Product analytics tracking of aha-moment events (project creation + team invitation) per cohort. Daily dashboard aggregation. Weekly Growth Standup review of 7-day rate. Escalation path: Growth Marketer → Product Manager → VP Product if red flag.

---

## Guardrail G-GM-006

### Title
Partnership Commitments Must Have Written Terms Before Product Changes

### Scope
- Applies to: All strategic partnerships (consulting firms, platforms, AI vendors)
- Time horizon: Permanent

### Rule
Product features or roadmap changes demanded by a partner must not be committed or prioritized unless signed partnership agreement with revenue commitment is in place. Partner "pilot" discussions do not override product roadmap prioritization without explicit LOI or MSA.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-GM-006 — product commitment without partnership terms`; escalate to VP Product and Head of Sales. Reverse product commitment and re-engage partner with "partnership formalization" discussion.

### Rationale
RISK-GM-004 (partnership pipeline untested) can create situation where product team chases uncertain partner requests. Without written commitment, partner may abandon mid-pilot. Product resources wasted. Source: Agent analysis Section "Strategic Partnerships", REC-GM-004 (partnership roadmap requires explicit terms).

### Verification Method
Partnership CRM tracking of LOI/MSA status per partner. Weekly partnership review: confirm written agreement in place before any product team commitments. Legal + VP Sales approval gate for partnership-driven product changes.

---

## Guardrail G-GM-007

### Title
Referral Program Metrics Must Demonstrate Sustainable K-Factor Before Scale

### Scope
- Applies to: Referral program marketing, incentive spending
- Time horizon: Month 1-2 pilot; then ongoing

### Rule
Referral program launch is permitted at Month 1 with $500 referrer incentive + 1-month free tier for referee (approved budget: $5K/month test spend). Scaling to higher incentive levels (e.g., $1K referrer credit) requires demonstrated k-factor >= 0.15 (each customer generates 0.15+ new customer referrals within 30 days). If k-factor <0.10 after 60 days, pivot incentive model (test leaderboard, gamification, or different reward structure) or sunset program.

### Violation Action
Mark `REFERRAL_UNDERPERFORMING` if k-factor <0.10. Escalate to VP Growth + CMO for incentive model pivot decision. Do not increase referral budget until k-factor threshold achieved.

### Rationale
RISK-GM-005 (referral mechanism too friction-heavy, k-factor may be <0.1) requires empirical validation. Scaling an underperforming referral program wastes budget. SaaS benchmark: successful referral programs k=0.20-0.50 (Dropbox, Slack); underperforming k=<0.05 (product market fit issue). Source: Agent analysis Section "Referral & Viral Mechanics", REC-GM-005 (referral/viral scaling strategy).

### Verification Method
Referral tracking dashboard: monthly k-factor calculation (# customers generated by referrals / # active referrers). Calculated weekly, reviewed monthly. If k-factor plateaus <0.10 for 2 weeks, growth team initiates pivot decision meeting.

---

## Guardrail G-GM-008  

### Title
SEO Content Authority Must Not Claims Without Source Attribution

### Scope
- Applies to: All SEO content published (blog posts, thought leadership, case studies)
- Time horizon: Permanent

### Rule
Every claim in SEO content with a data point (metric, benchmark, percentage, research finding) must include source attribution. "SDLC projects complete 40% faster with structured phases" must cite research, survey, or case study. Unattributed claims are considered marketing opinion and must be qualified as such ("Our research suggests...", "Customers report...").

### Violation Action
Mark `CONTENT_UNATTRIBUTED_CLAIM: [claim]`; reject blog post publication until sources are added or claims are reframed as opinion statements.

### Rationale
RISK-GM-001 (SEO strategy must establish authority) requires credibility. Unattributed claims undermine audience trust. Google SEO algorithm also rewards E-A-T (Expertise, Authoritativeness, Trustworthiness); unattributed claims lower trustworthiness score. Source: Agent analysis Section "SEO Content Strategy", Brand Strategist voice (Transparent, Rigorous).

### Verification Method
Content editorial process: Growth Marketer + Editor review all data claims; sources documented in article or footnotes. Peer review step: Product Manager confirms claims are accurate. Before publication, fact-check all metrics.

---

## Guardrails Overview

| ID | Title | Scope | Category | Verification |
|---|---|---|---|---|
| G-GM-001 | Growth Model Validation Before Paid Spend | Acquisition channel strategy | Capital allocation | Weekly metrics + CFO quarterly review |
| G-GM-002 | Activation Friction Testing Launch Gate | Product launch requirement | Product-market fit | Pre-launch test completion checklist |
| G-GM-003 | Growth Experiment Rigor Requirement | Experiment design discipline | Data quality | CRO Specialist design sign-off |
| G-GM-004 | Channel Attribution Reconciliation | Data tracking accuracy | Analytics integrity | Monthly attribution audit + reconciliation |
| G-GM-005 | Aha-Moment Achievement Rate Threshold | Activation health baseline | Leading indicator monitoring | Daily dashboard, escalation at 40% |
| G-GM-006 | Partnership Commitments Require Written Terms | Sales process discipline | Risk mitigation | Partnership CRM tracking + legal approval |
| G-GM-007 | Referral K-Factor Threshold Before Scale | Viral mechanics validation | Capital efficiency | Weekly k-factor calculation |
| G-GM-008 | SEO Content Source Attribution Required | Content credibility | Brand authority | Editorial review process before publication |

---

## HANDOFF CHECKLIST
- [x] All guardrails are testable and actional (start with verb: "Must not", "Must", "Requires")
- [x] Violation action defined per guardrail (concrete action: escalate, block, mark violation)
- [x] Verification method defined per guardrail (how compliance is tested, frequency)
- [x] Rationale linked to analysis gaps/risks (source: GAP-NNN, RISK-NNN)
- [x] No duplicates with existing global or Phase 3 guardrails (overlap check: G-UID, G-A11Y, G-CS, G-L10N, G-BS are different domain)
- [x] Guardrails protect growth strategy execution (prevent common failures: premature spend, untested assumptions, attribution error, underperformance)
- [x] Ready for handoff to implementation teams (Phase 5)

**Status:** COMPLETE  
**Next Step:** Update session state and commit all Agent 15 deliverables

