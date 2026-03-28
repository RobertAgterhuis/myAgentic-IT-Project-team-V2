# Pattern 05: Tool Use

Current score: 9.9/10
Target score: 9.9/10

## Assessment

Tool use is implemented in both the chat plane and MCP plane with controlled, loop-bounded execution. Tool reliability analysis now surfaces success rates, average durations, cost profiles, and composite reliability scores per tool — enabling data-driven tool selection policies and closing the gap between governed execution and adaptive orchestration.

## Evidence

- The MCP flow documents a dedicated MCP server with 17 tools and 3 resources, sharing models, validation, and persistence with the HTTP server. Source: docs/architecture/overview.md:126-142.
- The chat route implements an LLM tool-use loop that executes supported tools, appends JSON tool results back into the dialogue, and counts rounds and calls. Source: src/webapp/routes/chat.ts:742-881.
- The chat tool loop throws TOOL_ROUND_LIMIT_EXCEEDED once maxRounds is exceeded, preventing uncontrolled tool recursion. Source: src/webapp/routes/chat.ts:840.
- The runtime adapter tool loop also enforces a maxToolRounds limit. Source: platform/engine/runtime-adapter/tool-loop.ts:32-46, platform/engine/runtime-adapter/tool-loop.ts:71-72.
- Governance exposes approval and session-context tools rather than unconstrained arbitrary execution. Source: src/webapp/routes/chat.ts:679-764.
- Tool reliability analysis now groups execution traces by toolId and computes per-tool successRate, avgDurationMs, avgCostUsd, and a composite reliabilityScore, enabling tool-selection policies that optimize for success rate, cost, and latency. Source: platform/engine/proactive-discovery-optimization.ts (analyzeToolReliability, ToolReliabilityAnalysisResult), src/webapp/routes/intelligence-loop.ts (m4/tool-reliability-analysis).

## Remaining Refinements

- Tool-planning traces explaining why each tool was chosen or skipped are a future observability increment.
- Multi-step tool compositions with explicit checkpointing between phases would deepen the tool orchestration model.

## Audit Verdict

Tool use is strong, safe, and now analytically measured. The reliability analysis layer closes the tool-selection optimization gap. Target state is achieved.
