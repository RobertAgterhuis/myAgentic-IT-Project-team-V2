# Sprint 1 Daily Standup Agenda & Protocol

**Sprint:** Sprint 1 (March 10-24, 2026)  
**Daily Standup:** 09:00 UTC, all weekdays (March 11-24, 10 working days)  
**Duration:** 15 minutes (strict timebox)  
**Location:** [TBD — Slack thread, Zoom, or Teams]

---

## Standup Protocol

### **Participant Roles**

**Track Owners (Mandatory – one per track):**

- **Business:** Business Analyst (SP-10-602, SP-10-603)
- **Tech:** Senior Developer or DevOps Engineer (SP-11-611, SP-11-612,
  SP-11-613)
- **UX:** Accessibility Specialist or UI Designer (SP-1-501)
- **Marketing:** Growth Marketer or CRO Specialist (SP-12-701 through SP-12-705)

**Facilitator (PM):**

- Opens standup at 09:00 UTC sharp
- Keeps time (15 min hard stop)
- Directs escalations
- Records KPI updates

**Observer (Optional):**

- Orchestrator (tracks velocity, KPIs, decisions)
- Tech Lead (dependency watch from Tech chair)

### **Standup Format (15 minutes strict)**

**0:00-0:05 – CHECK-IN (5 min)**

- Facilitator: "Daily standup starting. Track owners present? [Confirm
  presence]"
- If absent: Note absence, assign proxy owner if needed
- Quick mood check: "Team morale: 👍 / 😐 / 👎 ?" [for KPI log]

**0:05-0:10 – WHAT DID WE COMPLETE? (5 min)**

- Business owner (1.5 min): "Yesterday we completed [item/task]. Status: [%
  complete]."
  - If SP-10-602 complete: "Governance docs done, ready for stakeholder
    sign-off."
  - If SP-10-603 in progress: "Conducted 2 of 5 stakeholder meetings; 2 more
    scheduled tomorrow."
- Tech owner (1.5 min): "Yesterday we completed [item/task]. Status: [%
  complete]."
  - If SP-11-611 complete: "CI pipeline running green; all tests passing."
  - If SP-11-612 in progress: "Jest config done; writing unit tests, coverage at
    XX%."
  - If SP-11-613 not started: "Blocked on SP-11-612; ready to start EOD [date]."
- UX owner (1 min): "Yesterday we completed [item/task]."
  - If SP-1-501 complete: "Token lock completed; accessibility audit shows XX%
    pass rate."
- Marketing owner (1 min): "Yesterday we completed [item/task]. Status: [%
  complete]."
  - If items complete: "All 5 marketing items done. Brand audit in progress."
  - If in progress: "Brand assets final, GTM messaging approved, social content
    80% done."

**0:10-0:13 – WHAT ARE WE BUILDING TODAY? (3 min)**

- Business owner (45 sec): "Today we're [task]. Blocking others? [Y/N]."
- Tech owner (45 sec): "Today we're [task]. Blocking others? [Y/N]."
  - **Tech must call out**: "SP-11-611 blocks SP-11-612" or "SP-11-611 unblocks
    SP-11-612"
- UX owner (30 sec): "Today we're [task]. Blocking others? [Y/N]."
- Marketing owner (30 sec): "Today we're [task]. Blocking others? [Y/N]."

**0:13-0:15 – BLOCKERS & ESCALATIONS (2 min)**

- Facilitator: "Any blockers or escalations?"
- **If blocker:** State owner, expected resolution, escalation? (Y/N)
  - Example: "CI pipeline config issue. DevOps investigating; expect resolution
    by 14:00 today. Escalating to PM for resource if not resolved by then."
- **If escalation:** PM acknowledges, commits to 2-hour response SLA
- Target: 0 blockers; if any exist, log blocker count for KPI tracking

**0:15 – CLOSE**

- Facilitator: "Great work, team. See you tonight at [checkpoint link, if
  applicable] or tomorrow at standup."

---

## Standup Logging (Post-Standup, ~10:00 UTC)

After standup concludes, **KPI Agent** logs key metrics to
`sprint-1-kpi-log.md`:

```markdown
### 2026-03-11 Daily Standup – March 11, 2026

**Time:** 09:00 UTC ✓  
**Attendees:** Business (✓), Tech (✓), UX (✓), Marketing (✓), PM (✓)

**Completed Yesterday:**

- Business: SP-10-602 governance docs START
- Tech: SP-11-611 CI pipeline configuration
- UX: SP-1-501 token lock START
- Marketing: All 5 items (brand assets, GTM, social, email, analytics) START

**Building Today:**

- Business: SP-10-602 governance docs COMPLETE
- Tech: SP-11-611 CI pipeline (Docker + secrets config)
- UX: SP-1-501 accessibility pre-audit
- Marketing: 5 parallel tracks (brand finalization, content drafts)

**Blockers:** 0 (all unblocked)

**KPI Snapshot (EOD):** | Metric | Target | Current | Trend |
|--------|--------|---------|-------| | Velocity | 100% by 3/24 | 5% | ↑ | |
Blockers | 0 | 0 | → | | Morale | High | High | → |
```

---

## Daily Standup Checklist (For Facilitator)

- [ ] Standup starts at 09:00 UTC sharp (no delays)
- [ ] All 4 track owners present (or proxy assigned)
- [ ] Each track reports: Completed, Building today, Blockers (5 min max)
- [ ] Tech owner calls out dependency status (critical path)
- [ ] PM records blocker count + escalations
- [ ] Escalation SLA confirmed (2-hour response)
- [ ] Next meeting confirmed (checkpoint date if applicable, else "see you
      tomorrow")
- [ ] Log posted to sprint-1-kpi-log.md within 1 hour post-standup
- [ ] Standup ends by 09:15 UTC (no exceptions)

---

## Escalation Process (If Blocker Detected)

**Timeline:**

- **09:00 – 09:15:** Blocker identified in standup
- **09:15 – 11:15:** PM investigates, proposes solution (2-hour SLA target)
- **11:15+:** If unresolved, escalate to Orchestrator; may require scope
  deferral or resource reallocation

**Escalation Checklist:**

- [ ] Blocker owner identified
- [ ] Blocker description documented
- [ ] Estimated impact (which other items blocked?)
- [ ] Proposed solutions (resource reallocation, skill swap, scope defer?)
- [ ] PM decision documented
- [ ] GitHub issue updated with blocker tag + comment
- [ ] Standup log updated with escalation note

**Prevention:**

- Tech owner checks daily: "Is SP-11-611 on track to complete by tomorrow?"
  (blocks SP-11-612)
- Business owner checks: "Are all 5 stakeholder meetings scheduled?" (needed for
  SP-10-603)
- UX owner checks: "Do we have accessibility audit results to lock tokens?"
- Marketing owner checks: "Does GTM messaging finalization impact social + email
  content?"

---

## Weekly Checkpoint Cadence (Part of Weekly Standup Ritual)

**Mon/Wed/Fri @ 14:00 UTC (3x per week)**  
**Duration:** 30 minutes  
**Participants:** All 4 track owners + Tech Lead + PM

### Checkpoint Agenda (30 min)

**0:00-0:05 – Week Status Snapshot**

- "We're at XX% velocity. Blocker count: X. On track/at risk/behind?"

**0:05-0:15 – Track Breakdown (10 min)**

- **Business (2 min):** SP-10-602 & 603 status, stakeholder meetings scheduled?
- **Tech (3 min):** SP-11-611 (CI) – on track for 3/13 complete? SP-11-612 ready
  to start?
- **UX (2 min):** SP-1-501 token lock – audit findings, accessibility score
  trending up/down?
- **Marketing (3 min):** All 5 items – which are complete? Any refinement
  needed? Analytics eval on track?

**0:15-0:20 – Dependency & Risk Review (5 min)**

- Tech critical path: "SP-11-611 complete? SP-11-612 start date confirmed?"
- New risks emerged? Any mitigations working well?
- Are we trending toward 15/15 completion by 3/24?

**0:20-0:25 – Resource & Capacity Check (5 min)**

- Any team member unavailable next week? (vacation, illness, higher priority?)
- Capacity utilization ≥90%? Reallocation needed?
- Skill gaps? Need pairing or training?

**0:25-0:30 – Decisions & Closeout (5 min)**

- Any decisions needed from PM? Escalations to Orchestrator?
- Confirm next checkpoint (same time next week, same attendees)
- "See you [date] for next checkpoint. Great progress this week!"

**Checkpoint Log Location:** `sprint-1-kpi-log.md` (Weekly Checkpoint Report
section)

---

## Standup Communication Channel

**Format:** [TBD — Slack thread, Zoom recording, or Teams meeting]

**Pre-Standup (by 08:55 UTC):**

- All track owners log in / join meeting
- PM has standup agenda + previous day's KPI snapshot visible

**During Standup (09:00-09:15 UTC):**

- Live standup in [platform]
- Log / minutes captured in Slack thread or meeting notes

**Post-Standup (09:15-10:00 UTC):**

- KPI Agent updates sprint-1-kpi-log.md
- GitHub milestone board refreshed with status (issues tagged BLOCKED if
  applicable)
- Team reads log + continues work

**Timezone Coverage:**

- 09:00 UTC covers: US Pacific (1 AM), US Eastern (4 AM), Europe (10 AM), India
  (2:30 PM), Asia-Pac evening
  - **Note:** This is early morning for US West Coast. If team distribution
    spans more timezones, consider rotating standup time on Fri/Mon, or second
    standup at 17:00 UTC.

---

## Standup Success Criteria

✅ Standup happens every weekday 09:00 UTC (zero delays, zero cancellations)  
✅ All 4 track owners present (or proxy confirmed)  
✅ Completed/Building/Blockers reported per track (no additional context
needed)  
✅ Blocker escalations resolved within 2 hours (or escalated to Orchestrator)  
✅ KPI log updated daily within 1 hour post-standup  
✅ Tech dependencies explicitly called out ("SP-11-611 unblocks SP-11-612 by
3/13")  
✅ Team morale tracked (indicator of team health + risk)  
✅ Velocity trending toward 15/15 complete by 3/24  
✅ Zero "surprise" blockers (dependency watch + daily communication prevent
this)

---

## Sample Sprint 1 Standup Transcript (Day 1 – March 11, 2026)

```
09:00 – Facilitator (PM): "Daily standup starting. Sprint 1, day 1 of 10. All track owners present?"
Business: ✓
Tech: ✓
UX: ✓
Marketing: ✓

Team morale? 👍 / 😐 / 👎
[Responses: 👍 👍 👍 👍 – Team energized]

Yesterday (Mar 10): Phase 5 initialization complete. Team briefing published.

Business: "Yesterday we kicked off. Today we start governance docs (SP-10-602). Target: complete by EOD tomorrow. No blockers."

Tech: "Yesterday: kicked off. Today: CI pipeline setup (SP-11-611 Start). Target complete by 3/13 EOD. Critical: this unblocks SP-11-612 (test strategy). No blockers today but need steady progress."

UX: "Yesterday: checked acceptance criteria. Today: token finalization + accessibility pre-audit (SP-1-501). Audit findings due by 3/13 for token lock. No blockers."

Marketing: "Yesterday: team briefing reviewed. Today: all 5 items start in parallel. GTM messaging finalization (blocking social + email), brand asset final export, analytics vendor eval start. No blockers."

Facilitator: "Blockers? Any escalations needed?"
[No hands up]

Facilitator: "Great! 0 blockers. See you tomorrow, 09:00 UTC. Let's ship!"

09:13 – Standup complete. KPI Agent logs data.
```

---

## Standup Facilitation Tips

1. **Keep Strict Timebox:** Use a timer. When 15 min is up, standup ends (can
   continue side conversations offline).
2. **No Problem-Solving in Standup:** "That's great context, but let's debug
   offline. Keep standup moving."
3. **Tech Owner Owns Dependency Watch:** If Tech owner doesn't call out
   "SP-11-611 complete, SP-11-612 ready to start," that's a red flag.
4. **Escalation is Not Failure:** "We found a blocker. Good job catching it.
   Let's resolve it together."
5. **Celebrate Small Wins:** "SP-10-602 done, that's 1 of 15 —progress!"
6. **Track Decisions:** If a decision is made in standup (e.g., "defer analytics
   to Sprint 2"), log it + update decisions.md.

---

## Reference & Escalation Contacts

**PM (Facilitator):** [Name] – 2-hour escalation SLA  
**Tech Lead:** [Name] – dependency watch, sequential chain alerts  
**Business Owner:** [Name] – stakeholder sign-off ownership  
**Brand Strategist:** [Name] – design token / brand consistency  
**Orchestrator:** [Name] – unresolved escalations >2 hours, scope decisions

---

**Standup protocol active starting 2026-03-11T09:00:00Z. Let's go!**
