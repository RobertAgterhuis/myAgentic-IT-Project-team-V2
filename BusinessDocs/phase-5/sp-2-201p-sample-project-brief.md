# Pilot Sample Project Brief — "Task Management API"

**Purpose:** Sample project for internal pilot mini-cycle (SP-2-201-P).
Participants execute Phase 1 (Business Analysis only) using this brief as input
to the Onboarding Agent.

---

## Project: Task Management API

### One-Line Description

A RESTful task management API for small teams (5-15 people) that integrates with
Slack and supports real-time collaboration.

### Target Users

- **Primary:** Small engineering teams using Slack as their communication hub
- **Secondary:** Freelancers and consultants managing multiple client projects

### Problem Statement

Small teams waste 3-5 hours per week switching between task tools (Jira, Trello,
Asana) and their communication platform (Slack). They need a task system that
lives where they already work.

### Key Features (MVP)

1. CRUD operations for tasks, projects, and labels
2. Slack bot: create, assign, and complete tasks via slash commands
3. Real-time updates via WebSocket (task status changes appear instantly)
4. Simple role model: Owner, Member, Viewer
5. REST API with OpenAPI 3.0 documentation

### Constraints

- **Budget:** $0 infrastructure (use free tiers: Railway, Supabase, Vercel)
- **Timeline:** MVP in 4 weeks
- **Team:** 1 full-stack developer + 1 part-time designer
- **Tech preference:** Node.js + PostgreSQL (team's existing stack)

### Success Metrics

- 50 active users within 30 days of launch
- < 200ms API response time (p95)
- 99.5% uptime

### Out of Scope (MVP)

- Mobile app (API-first, web dashboard only)
- File attachments
- Gantt charts or timeline views
- Enterprise SSO

---

## Pilot Instructions

1. Open VS Code with the Agentic SDLC Platform repository
2. Start a new GitHub Copilot Chat conversation
3. Type: `CREATE Task Management API`
4. When the Onboarding Agent asks questions, use this brief as your source
5. Let Phase 1 agents run (Business Analyst, Domain Expert, Sales Strategist,
   Financial Analyst, Product Manager)
6. Review the Critic + Risk validation output
7. Review the Synthesis Report structure
8. Complete the feedback rubric (SP-2-202)

**Total estimated time:** ~2 hours (self-paced)
