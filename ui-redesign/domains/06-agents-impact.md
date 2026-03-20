# Agents Domain Impact

## Domain Purpose

Provide a governed agent registry with permissions, tools, activity, and incidents. [ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx](ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx [ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx](ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L82-L105)

## Current State in Codebase

Agents domain exists with an Agents page and Execution History page. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L42-L45), [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx#L1-L21), [src/webapp/ui/src/pages/agents/execution-history-page.tsx](src/webapp/ui/src/pages/agents/execution-history-page.tsx#L1-L12)

## Current Components / Routes / State / Data Dependencies

- Routes: `/agents`, `/agents/executions`. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L42-L45)
- Data hooks: `useAgents` and `useExecutionHistory`. [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx#L1-L21), [src/webapp/ui/src/pages/agents/execution-history-page.tsx](src/webapp/ui/src/pages/agents/execution-history-page.tsx#L1-L12)

## Gaps vs Target Redesign

- Proposal expects explicit permissions, tool scope, and governance controls per agent; current UI focuses on execution status and outputs. [ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx](ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx#L1), [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx#L1-L21)

## Required Code Additions / Changes

- Extend agent data types to include permissions, tool scopes, and governance metadata. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120), [ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx](ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx#L1)
- Add permission/tool-scope panels as reusable components. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
- Add subroutes or tabs for permissions/tools within the agent detail flow. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L42-L45)

## Functional Risks

- Agent execution actions (execute, status) must remain intact. [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx#L1-L21)

## Technical Risks

- Additional permissions/tool data may require new API fields beyond current agent detail types. [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx#L1-L21), [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)

## UX Risks

- Without explicit permissions and tool scopes, the registry will not meet proposal’s transparency requirements. [ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx](ui-proposal/agentic_sdlc_page_06_agent_registry_mockup.jsx#L1)

## Suggested Migration Approach

- Extend agent detail panels with permissions/tools sections while preserving current list and execution flows. [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx#L1-L21)

## Suggested Component Strategy

- Build agent permission panels and tool-scope chips as shared components in Storybook. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Keep `/agents` as the registry root and add sub-tabs or subroutes for permissions/tools. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L42-L45)

## Suggested Testing Strategy

- Add tests for agent detail rendering with new permissions data. [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx#L1-L21)

## Rollout Risk Level

Medium — agents page is frequently used and includes execution actions. [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx#L1-L21)

## Recommended Sequence

After operational cards and status/risk badges are built. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
