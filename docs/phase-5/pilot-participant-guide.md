# Pilot Participant Guide — Start Here

**Sprint:** S1 | **Issue:** #163 | **Version:** 1.0

---

## Welcome

Thank you for participating in the Agentic SDLC Platform pilot. This guide
explains how to set up your environment, choose a scenario, run your mini-cycle,
and submit your feedback.

**Estimated time:** 2 hours (self-paced)

---

## 1. Environment Setup

### Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | ≥ 18.0.0 | `node --version` |
| VS Code | Latest | — |
| GitHub Copilot Chat | Latest | VS Code Extensions panel |
| Git | ≥ 2.30 | `git --version` |

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2.git
cd myAgentic-IT-Project-team-V2

# 2. Install dependencies
npm ci

# 3. Verify tests pass
npm test

# 4. Start the webapp (optional — for landing page review)
npm start
```

---

## 2. Pilot Scenarios

Choose **one** scenario for your mini-cycle. Each scenario is designed to
exercise different aspects of the platform.

### Scenario A: Task Management API (Recommended for first-time users)

**Domain:** Backend / API Development
**Focus:** Phase 1 (Business Analysis)
**Brief:** `docs/phase-5/sp-2-201p-sample-project-brief.md`

> Build a RESTful task management API for small teams (5–15 people) that
> integrates with Slack and supports real-time collaboration. MVP in 4 weeks,
> $0 infrastructure budget, Node.js + PostgreSQL stack.

**Command:** `CREATE Task Management API`

### Scenario B: Internal Knowledge Base

**Domain:** Full-stack / Content Platform
**Focus:** Phase 1 (Business) + Phase 3 (UX) emphasis

> Build a searchable knowledge base for a 50-person company. Employees create,
> tag, and upvote articles. Includes markdown editor, full-text search, and
> tag-based navigation. Must meet WCAG 2.1 AA accessibility standards.

**Key constraints:**
- Team: 2 developers + 1 designer (part-time)
- Timeline: 6 weeks to MVP
- Tech: Next.js + SQLite (simple deployment)
- Users: 50 internal employees, no external access

**Command:** `CREATE Internal Knowledge Base`

### Scenario C: Event Registration Platform

**Domain:** Marketing / E-commerce
**Focus:** Phase 4 (Brand & Growth) + Phase 2 (Architecture) emphasis

> Build an event registration platform for a community meetup group that runs
> monthly tech talks (50–200 attendees). Supports event creation, RSVP,
> waitlists, and automated reminder emails. Needs a public landing page with
> social sharing.

**Key constraints:**
- Team: 1 full-stack developer
- Timeline: 3 weeks to MVP
- Tech: No preference (platform recommends)
- Budget: Free tier only (Vercel, Supabase)
- Compliance: GDPR (EU attendees)

**Command:** `CREATE Event Registration Platform`

---

## 3. Mini-Cycle Steps

Follow these steps regardless of which scenario you choose.

| Step | Activity | Duration | What to Focus On |
|------|----------|----------|------------------|
| 1 | Review onboarding output | 15 min | Is the intake process clear? Are questions relevant? |
| 2 | Execute Phase 1 (Business) for your scenario | 45 min | Does the business analysis produce useful output? |
| 3 | Review Critic + Risk validation output | 15 min | Is the quality gate meaningful? Are risks actionable? |
| 4 | Review Synthesis Report structure | 15 min | Do cross-team dependencies make sense? |
| 5 | Review Sprint Plan + Sprint Gate | 15 min | Is the sprint plan realistic and well-structured? |
| 6 | Complete feedback rubric | 15 min | Record your structured evaluation |

---

## 4. Evaluation Criteria by Discipline

When reviewing platform output, evaluate each discipline against these criteria.

### Business (Phase 1)

| Criterion | What to Look For |
|-----------|-----------------|
| Market analysis depth | Competitive landscape, target segment identification, TAM/SAM/SOM |
| Requirements quality | Acceptance criteria present, prioritized, testable |
| Financial viability | Revenue model, cost projections, break-even analysis |
| Risk identification | Business risks with severity and mitigation plans |
| Domain model completeness | Core entities, relationships, bounded contexts |

### Technology (Phase 2)

| Criterion | What to Look For |
|-----------|-----------------|
| Architecture fitness | Technology choices match constraints (budget, team, timeline) |
| Security baseline | Auth model, data protection, secrets management |
| Scalability considerations | Performance targets, caching strategy, database design |
| DevOps readiness | CI/CD pipeline, deployment strategy, monitoring |
| Data architecture | Schema design, migration strategy, backup plan |

### UX/Experience (Phase 3)

| Criterion | What to Look For |
|-----------|-----------------|
| User research basis | Personas, journey maps, pain points identified |
| Accessibility compliance | WCAG 2.1 AA targets, keyboard navigation, screen reader support |
| Design system alignment | Consistent tokens, component patterns, responsive layout |
| Content strategy | Tone of voice, copy quality, i18n readiness |
| Usability | Task flow clarity, error handling, progressive disclosure |

### Marketing (Phase 4)

| Criterion | What to Look For |
|-----------|-----------------|
| Brand coherence | Visual identity, positioning statement, value proposition |
| Go-to-market strategy | Channel selection, launch sequence, messaging framework |
| Growth mechanics | Conversion funnels, retention hooks, referral loops |
| Analytics plan | KPIs defined, tracking instrumented, reporting cadence |
| Content calendar | Launch content, ongoing cadence, channel-specific formats |

---

## 5. Feedback Collection

### How to Submit

1. Open `docs/phase-5/sp-2-202-pilot-feedback-rubric.md`
2. Fill in **all 6 sections** (participant info, step assessments, friction
   points, completeness gaps, open-ended feedback, scoring)
3. Save as `pilot-feedback-[YOUR-NAME].md` in `docs/phase-5/`
4. Submit via one of:
   - **Git:** Commit and push to a branch named `pilot/feedback-[YOUR-NAME]`,
     then open a PR
   - **Email:** Send the completed rubric file to the Product Manager
   - **Direct:** Place file in shared folder (if provided)

### Feedback Deadline

Submit within **5 business days** of completing your mini-cycle.

### What Happens Next

1. Product Manager aggregates all rubric responses
2. Scores computed per Section 6 of the rubric
3. Friction points triaged by severity (Critical → Low)
4. Results published in Sprint Retrospective
5. Critical/High items become Sprint 3 stories

---

## 6. Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm ci` fails | Ensure Node.js ≥ 18. Delete `node_modules` and retry. |
| Copilot Chat not responding | Reload VS Code window (`Ctrl+Shift+P` → "Reload Window") |
| Phase agent seems stuck | Start a fresh Copilot Chat conversation — state is preserved in files |
| Test failures on setup | Run `npm test -- --passWithNoTests` to see which specific test fails |
| Landing page not loading | Run `npm start` and open `http://localhost:3000/landing` |

---

## 7. Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| User Manual | `docs/user-manual.md` | Platform usage guide |
| Technical Manual | `docs/technical-manual.md` | Architecture reference |
| Sample Brief (Scenario A) | `docs/phase-5/sp-2-201p-sample-project-brief.md` | Task Management API brief |
| Feedback Rubric | `docs/phase-5/sp-2-202-pilot-feedback-rubric.md` | Structured evaluation form |
| Distribution Plan | `docs/phase-5/sp-2-201p-pilot-distribution-plan.md` | Pilot logistics |
| Pilot Scope | `docs/phase-5/sp-2-201p-internal-pilot-scope.md` | Mini-cycle definition |
