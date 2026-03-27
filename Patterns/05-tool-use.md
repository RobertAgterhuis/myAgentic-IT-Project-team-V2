# Pattern 05: Tool Use

Current score: 8.9/10
Target score: 9.9/10

## Assessment

Tool use is implemented in both the chat plane and MCP plane. The repository shows controlled, loop-bounded tool execution, but it is intentionally conservative and still limited in adaptive tool-planning depth.

## Evidence

- The MCP flow documents a dedicated MCP server with 17 tools and 3 resources, sharing models, validation, and persistence with the HTTP server. Source: docs/architecture/overview.md:126-142.
- The chat route implements an LLM tool-use loop that executes supported tools, appends JSON tool results back into the dialogue, and counts rounds and calls. Source: src/webapp/routes/chat.ts:742-881.
- The chat tool loop throws TOOL_ROUND_LIMIT_EXCEEDED once maxRounds is exceeded, preventing uncontrolled tool recursion. Source: src/webapp/routes/chat.ts:840.
- The runtime adapter tool loop also enforces a maxToolRounds limit. Source: platform/engine/runtime-adapter/tool-loop.ts:32-46, platform/engine/runtime-adapter/tool-loop.ts:71-72.
- Governance exposes approval and session-context tools rather than unconstrained arbitrary execution. Source: src/webapp/routes/chat.ts:679-764.

## Why The Score Is Not Higher

- Tool selection is still narrow and policy-bound; there is limited evidence of multi-tool planning with explicit cost/benefit reasoning.
- Tool results are fed back into prompts, but tool success histories are not yet used to improve future tool choice automatically.
- The system emphasizes safety over breadth, so the current tool ecosystem is governed but not especially exploratory.

## Path To 9.9

- Add tool-planning traces that explain why each tool was chosen, skipped, or escalated.
- Add tool reliability scoring and tool-selection policies that optimize for success rate, cost, and latency.
- Add richer multi-step tool compositions with checkpointing between tool phases.

## Audit Verdict

Tool use is strong, safe, and real. The next level is adaptive orchestration across a broader governed tool portfolio.
