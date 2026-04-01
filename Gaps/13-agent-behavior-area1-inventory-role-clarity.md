# Agentic Behavior Audit — Area 1: Agent Inventory & Role Clarity

## Evidence Basis

- Canonical agent registry entries: platform/schema/agents.json:57, platform/schema/agents.json:1390
- Runtime phase map compiled from schema: platform/engine/agent-phase-map.ts:64, platform/engine/agent-phase-map.ts:99
- Flow assignment/invocation map: platform/engine/flows.yaml:323, platform/engine/flows.yaml:399
- Orchestrator intent for additional agents: templates/sdlc/agents/00-orchestrator.md:238

## Full Agent Inventory (Behavior-Relevant)

AGENT: 00 Orchestrator

- Defined in: platform/schema/agents.json:57
- Prompt/Instructions: templates/sdlc/agents/00-orchestrator.md:1
- Declared purpose: process controller and phase conductor
- Tools available: registry-driven runtime tools + queue/session/github integrations
- Input: command mode + session state + prior phase outputs
- Output: state transitions and downstream agent activation
- Invoked by: SPRINT_GATE assignment in flow (platform/engine/flows.yaml:383)
- Status: 🟡 FRAGILE

AGENT: 01 Business Analyst

- Defined in: platform/schema/agents.json:90
- Prompt/Instructions: templates/sdlc/agents/01-business-analyst.md:1
- Invoked by: PHASE_1 assignment (platform/engine/flows.yaml:326)
- Status: 🟡 FRAGILE

AGENT: 02 Domain Expert

- Defined in: platform/schema/agents.json:126
- Prompt/Instructions: templates/sdlc/agents/02-domain-expert.md:1
- Invoked by: PHASE_1 assignment (platform/engine/flows.yaml:328)
- Status: 🟡 FRAGILE

AGENT: 03 Sales Strategist

- Defined in: platform/schema/agents.json:162
- Prompt/Instructions: templates/sdlc/agents/03-sales-strategist.md:1
- Invoked by: PHASE_1 assignment (platform/engine/flows.yaml:330)
- Status: 🟡 FRAGILE

AGENT: 04 Financial Analyst

- Defined in: platform/schema/agents.json:198
- Prompt/Instructions: templates/sdlc/agents/04-financial-analyst.md:1
- Invoked by: PHASE_1 assignment (platform/engine/flows.yaml:332)
- Status: 🟡 FRAGILE

AGENT: 05 Software Architect

- Defined in: platform/schema/agents.json:234
- Prompt/Instructions: templates/sdlc/agents/05-software-architect.md:1
- Invoked by: PHASE_2 assignment (platform/engine/flows.yaml:339)
- Status: 🟡 FRAGILE

AGENT: 06 Senior Developer

- Defined in: platform/schema/agents.json:272
- Prompt/Instructions: templates/sdlc/agents/06-senior-developer.md:1
- Invoked by: PHASE_2 assignment (platform/engine/flows.yaml:341)
- Status: 🟠 UNRELIABLE (based on repetitive low-entropy sandbox output evidence)

AGENT: 07 DevOps Engineer

- Defined in: platform/schema/agents.json:310
- Prompt/Instructions: templates/sdlc/agents/07-devops-engineer.md:1
- Invoked by: PHASE_2 assignment (platform/engine/flows.yaml:343)
- Status: 🟡 FRAGILE

AGENT: 08 Security Architect

- Defined in: platform/schema/agents.json:348
- Prompt/Instructions: templates/sdlc/agents/08-security-architect.md:1
- Invoked by: PHASE_2 assignment (platform/engine/flows.yaml:345)
- Status: 🟡 FRAGILE

AGENT: 09 Data Architect

- Defined in: platform/schema/agents.json:386
- Prompt/Instructions: templates/sdlc/agents/09-data-architect.md:1
- Invoked by: PHASE_2 assignment (platform/engine/flows.yaml:347)
- Status: 🟡 FRAGILE

AGENT: 10 UX Researcher

- Defined in: platform/schema/agents.json:424
- Prompt/Instructions: templates/sdlc/agents/10-ux-researcher.md:1
- Invoked by: PHASE_3 assignment (platform/engine/flows.yaml:356)
- Status: 🟡 FRAGILE

AGENT: 11 UX Designer

- Defined in: platform/schema/agents.json:461
- Prompt/Instructions: templates/sdlc/agents/11-ux-designer.md:1
- Invoked by: PHASE_3 assignment (platform/engine/flows.yaml:358)
- Status: 🟡 FRAGILE

AGENT: 12 UI Designer

- Defined in: platform/schema/agents.json:498
- Prompt/Instructions: templates/sdlc/agents/12-ui-designer.md:1
- Invoked by: PHASE_3 assignment (platform/engine/flows.yaml:360)
- Status: 🟡 FRAGILE

AGENT: 13 Accessibility Specialist

- Defined in: platform/schema/agents.json:535
- Prompt/Instructions: templates/sdlc/agents/13-accessibility-specialist.md:1
- Invoked by: PHASE_3 assignment (platform/engine/flows.yaml:362)
- Status: 🟡 FRAGILE

AGENT: 14 Brand Strategist

- Defined in: platform/schema/agents.json:572
- Prompt/Instructions: templates/sdlc/agents/14-brand-strategist.md:1
- Invoked by: PHASE_4 assignment (platform/engine/flows.yaml:369)
- Status: 🟡 FRAGILE

AGENT: 15 Growth Marketer

- Defined in: platform/schema/agents.json:609
- Prompt/Instructions: templates/sdlc/agents/15-growth-marketer.md:1
- Invoked by: PHASE_4 assignment (platform/engine/flows.yaml:371)
- Status: 🟡 FRAGILE

AGENT: 16 CRO Specialist

- Defined in: platform/schema/agents.json:646
- Prompt/Instructions: templates/sdlc/agents/16-cro-specialist.md:1
- Invoked by: PHASE_4 assignment (platform/engine/flows.yaml:373)
- Status: 🟡 FRAGILE

AGENT: 17 Synthesis Agent

- Defined in: platform/schema/agents.json:683
- Prompt/Instructions: templates/sdlc/agents/17-synthesis-agent.md:1
- Invoked by: SYNTHESIS assignment (platform/engine/flows.yaml:381)
- Status: 🟡 FRAGILE

AGENT: 18 Critic Agent

- Defined in: platform/schema/agents.json:713
- Prompt/Instructions: templates/sdlc/agents/18-critic-agent.md:1
- Invoked by: CRITIC\_\* assignments (platform/engine/flows.yaml:335)
- Status: 🟡 FRAGILE

AGENT: 19 Risk Agent

- Defined in: platform/schema/agents.json:744
- Prompt/Instructions: templates/sdlc/agents/19-risk-agent.md:1
- Invoked by: CRITIC\_\* assignments (platform/engine/flows.yaml:337)
- Status: 🟡 FRAGILE

AGENT: 20 Implementation Agent

- Defined in: platform/schema/agents.json:775
- Prompt/Instructions: templates/sdlc/agents/20-implementation-agent.md:1
- Invoked by: PHASE_5_EXECUTING assignment (platform/engine/flows.yaml:385)
- Status: 🟡 FRAGILE

AGENT: 21 Test Agent

- Defined in: platform/schema/agents.json:810
- Prompt/Instructions: templates/sdlc/agents/21-test-agent.md:1
- Invoked by: PHASE_5_EXECUTING assignment (platform/engine/flows.yaml:387)
- Status: 🟡 FRAGILE

AGENT: 22 PR Review Agent

- Defined in: platform/schema/agents.json:845
- Prompt/Instructions: templates/sdlc/agents/22-pr-review-agent.md:1
- Invoked by: PHASE_5_EXECUTING assignment (platform/engine/flows.yaml:391)
- Status: 🟡 FRAGILE

AGENT: 23 Reevaluate Agent

- Defined in: platform/schema/agents.json:880
- Prompt/Instructions: templates/sdlc/agents/23-reevaluate-agent.md:1
- Invoked by: NEVER INVOKED in flow assignments (platform/engine/flows.yaml:323, platform/engine/flows.yaml:399)
- Status: ⚪ PHANTOM

AGENT: 24 Feature Agent

- Defined in: platform/schema/agents.json:910
- Prompt/Instructions: templates/sdlc/agents/24-feature-agent.md:1
- Invoked by: NEVER INVOKED in flow assignments (platform/engine/flows.yaml:323, platform/engine/flows.yaml:399)
- Status: ⚪ PHANTOM

AGENT: 25 Onboarding Agent

- Defined in: platform/schema/agents.json:940
- Prompt/Instructions: templates/sdlc/agents/25-onboarding-agent.md:1
- Invoked by: ONBOARDING assignment (platform/engine/flows.yaml:323)
- Status: 🟡 FRAGILE

AGENT: 26 Documentation Agent

- Defined in: platform/schema/agents.json:971
- Prompt/Instructions: templates/sdlc/agents/26-documentation-agent.md:1
- Invoked by: PHASE_5_EXECUTING assignment (platform/engine/flows.yaml:395)
- Status: 🟡 FRAGILE

AGENT: 27 GitHub Integration Agent

- Defined in: platform/schema/agents.json:1006
- Prompt/Instructions: templates/sdlc/agents/27-github-integration-agent.md:1
- Invoked by: PHASE_5_EXECUTING assignment (platform/engine/flows.yaml:397)
- Status: 🟡 FRAGILE

AGENT: 28 Retrospective Agent

- Defined in: platform/schema/agents.json:1041
- Prompt/Instructions: templates/sdlc/agents/28-retrospective-agent.md:1
- Invoked by: PHASE_5_EXECUTING assignment (platform/engine/flows.yaml:399)
- Status: 🟡 FRAGILE

AGENT: 29 KPI Agent

- Defined in: platform/schema/agents.json:1076
- Prompt/Instructions: templates/sdlc/agents/29-kpi-agent.md:1
- Invoked by: PHASE_5_EXECUTING assignment (platform/engine/flows.yaml:393)
- Status: 🟡 FRAGILE

AGENT: 30 Brand Assets Agent

- Defined in: platform/schema/agents.json:1111
- Prompt/Instructions: templates/sdlc/agents/30-brand-assets-agent.md:1
- Invoked by: PHASE_4 assignment (platform/engine/flows.yaml:375)
- Status: 🟡 FRAGILE

AGENT: 31 Storybook Agent

- Defined in: platform/schema/agents.json:1145
- Prompt/Instructions: templates/sdlc/agents/31-storybook-agent.md:1
- Invoked by: PHASE_4 assignment (platform/engine/flows.yaml:377)
- Status: 🟡 FRAGILE

AGENT: 32 Content Strategist

- Defined in: platform/schema/agents.json:1179
- Prompt/Instructions: templates/sdlc/agents/32-content-strategist.md:1
- Invoked by: PHASE_3 assignment (platform/engine/flows.yaml:364)
- Status: 🟡 FRAGILE

AGENT: 33 Legal Counsel

- Defined in: platform/schema/agents.json:1216
- Prompt/Instructions: templates/sdlc/agents/33-legal-counsel.md:1
- Invoked by: PHASE_2 assignment (platform/engine/flows.yaml:349)
- Status: 🟡 FRAGILE

AGENT: 34 Product Manager

- Defined in: platform/schema/agents.json:1254
- Prompt/Instructions: templates/sdlc/agents/34-product-manager.md:1
- Invoked by: PHASE_1 assignment (platform/engine/flows.yaml:333)
- Status: 🟡 FRAGILE

AGENT: 35 Localization Specialist

- Defined in: platform/schema/agents.json:1290
- Prompt/Instructions: templates/sdlc/agents/35-localization-specialist.md:1
- Invoked by: PHASE_3 assignment (platform/engine/flows.yaml:366)
- Status: 🟡 FRAGILE

AGENT: 36 Questionnaire Agent

- Defined in: platform/schema/agents.json:1327
- Prompt/Instructions: templates/sdlc/agents/36-questionnaire-agent.md:1
- Invoked by: NEVER INVOKED in flow assignments (platform/engine/flows.yaml:323, platform/engine/flows.yaml:399)
- Status: ⚪ PHANTOM

AGENT: 37 Scope Change Agent

- Defined in: platform/schema/agents.json:1360
- Prompt/Instructions: templates/sdlc/agents/37-scope-change-agent.md:1
- Invoked by: referenced by Orchestrator instructions but absent from runtime assignments (templates/sdlc/agents/00-orchestrator.md:238, platform/engine/flows.yaml:323)
- Status: ⚪ PHANTOM

AGENT: 38 Architecture Compliance Reviewer

- Defined in: platform/schema/agents.json:1390
- Prompt/Instructions: templates/sdlc/agents/38-architecture-compliance-reviewer.md:1
- Invoked by: PHASE_5_EXECUTING assignment (platform/engine/flows.yaml:389)
- Status: 🟡 FRAGILE

## Direct Answers (Area 1)

- Role delineation clarity: moderate. Prompts are role-specific, but many agents have overlapping review/checklist behavior, especially across Critic/Risk/Test/Compliance.
- Orphaned/never-invoked agents: 23, 24, 36, 37 are defined but not assigned in runtime flow.
- Missing agents: no dedicated evaluator that scores longitudinal task success by agent with golden-task baselines.
- New-developer comprehensibility: partial. Templates are verbose and explicit, but runtime invocation reality diverges from template claims for several agents.
