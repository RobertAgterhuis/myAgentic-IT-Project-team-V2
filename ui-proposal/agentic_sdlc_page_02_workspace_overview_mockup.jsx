export default function AgenticSDLCWorkspaceOverviewMockup() {
  const repositories = [
    {
      name: 'claims-portal-web',
      type: 'Frontend',
      branch: 'main',
      status: 'Healthy',
      prs: 3,
      gates: '1 open',
    },
    {
      name: 'claims-api',
      type: 'Backend',
      branch: 'release/2026.03',
      status: 'Attention',
      prs: 5,
      gates: '2 blocked',
    },
    {
      name: 'policy-engine',
      type: 'Core Service',
      branch: 'main',
      status: 'Healthy',
      prs: 1,
      gates: '0 open',
    },
    {
      name: 'infra-platform-bicep',
      type: 'Infrastructure',
      branch: 'main',
      status: 'Drift',
      prs: 2,
      gates: 'review required',
    },
    {
      name: 'agent-contracts',
      type: 'Contracts',
      branch: 'main',
      status: 'Healthy',
      prs: 4,
      gates: '0 open',
    },
    {
      name: 'test-harness',
      type: 'Quality',
      branch: 'develop',
      status: 'Attention',
      prs: 2,
      gates: 'coverage gap',
    },
  ];

  const activeRuns = [
    {
      id: 'RUN-2418',
      title: 'Claims intake redesign',
      phase: 'Design Review',
      owner: 'Product + Architect',
      risk: 'Medium',
      state: 'Waiting for approval',
    },
    {
      id: 'RUN-2421',
      title: 'API retry resiliency patch',
      phase: 'Build',
      owner: 'Builder Agent',
      risk: 'Low',
      state: 'Executing',
    },
    {
      id: 'RUN-2427',
      title: 'Elevated connector onboarding',
      phase: 'Policy Review',
      owner: 'Security Officer',
      risk: 'Critical',
      state: 'Blocked',
    },
    {
      id: 'RUN-2432',
      title: 'Regression coverage uplift',
      phase: 'Test Gate',
      owner: 'QA Lead',
      risk: 'High',
      state: 'Needs evidence',
    },
  ];

  const agents = [
    { name: 'Planner', version: 'v2.8', mode: 'Constrained', tools: 4, status: 'Online' },
    { name: 'Architect', version: 'v1.9', mode: 'Review Required', tools: 3, status: 'Online' },
    { name: 'Builder', version: 'v3.2', mode: 'Scoped Write', tools: 6, status: 'Online' },
    { name: 'Tester', version: 'v2.1', mode: 'Read + Execute', tools: 5, status: 'Degraded' },
    { name: 'Security', version: 'v2.4', mode: 'Approval Gate', tools: 4, status: 'Online' },
  ];

  const policies = [
    'Production deploys require human release approval',
    'External MCP connectors require explicit security sign-off',
    'Contract-breaking API changes require architecture review',
    'Write access is limited to approved repo scope per run',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1600px] p-6">
        <header className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Workspace Overview
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Customer Experience Platform
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                A governed delivery workspace containing repositories, agents, contracts, pipelines,
                and approval gates for one bounded delivery domain.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                Tier: Production-Capable Workspace
              </div>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Open Workspace Settings
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {['Summary', 'Repositories', 'Runs', 'Agents', 'Policies', 'Integrations', 'Audit'].map(
              (tab, index) => (
                <button
                  key={tab}
                  className={`rounded-2xl px-4 py-2 ${
                    index === 0
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        </header>

        <section className="grid grid-cols-4 gap-4">
          {[
            ['Repositories', '06', 'All repositories are bound to this workspace governance scope'],
            ['Active Runs', '04', '2 require human intervention before advancing'],
            ['Registered Agents', '11', '1 degraded agent requires runtime inspection'],
            ['Open Governance Findings', '09', 'Policy exceptions, drift, and evidence gaps'],
          ].map(([label, value, detail]) => (
            <div
              key={label}
              className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20"
            >
              <div className="text-sm text-slate-400">{label}</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight">{value}</div>
              <div className="mt-2 text-sm text-slate-500">{detail}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Topology</div>
                <h2 className="mt-2 text-xl font-semibold">Workspace composition</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Inspect dependencies
              </button>
            </div>

            <div className="mt-6 grid grid-cols-12 gap-4">
              <div className="col-span-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">Control Node</div>
                <div className="mt-3 text-lg font-medium">Workspace Policy Boundary</div>
                <div className="mt-2 text-sm text-slate-300">
                  Defines repo scope, agent permissions, approval requirements, audit retention, and
                  escalation rules.
                </div>
              </div>

              <div className="col-span-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Execution Zone
                </div>
                <div className="mt-3 text-lg font-medium">Runs + Pipelines</div>
                <div className="mt-2 text-sm text-slate-500">
                  Agents operate only inside run scope with explicit gates between phases and
                  controlled write boundaries.
                </div>
              </div>

              <div className="col-span-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Evidence Zone
                </div>
                <div className="mt-3 text-lg font-medium">Audit + Contracts</div>
                <div className="mt-2 text-sm text-slate-500">
                  Every decision, contract mutation, exception, and approval is attached to
                  immutable evidence trails.
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="grid grid-cols-6 gap-3 text-center text-sm">
                {['Repos', 'Contracts', 'Agents', 'Runs', 'Pipelines', 'Audit Store'].map(
                  (node, index) => (
                    <div
                      key={node}
                      className="rounded-2xl border border-white/10 bg-slate-950/80 p-4"
                    >
                      <div className="text-xs text-slate-500">0{index + 1}</div>
                      <div className="mt-2 font-medium">{node}</div>
                      <div className="mt-3 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-cyan-400" />
                      </div>
                    </div>
                  )
                )}
              </div>
              <div className="mt-4 text-sm text-slate-500">
                The page should visually communicate that the workspace is a governed system
                boundary, not just a folder with repositories.
              </div>
            </div>
          </div>

          <div className="col-span-4 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Governance Posture
            </div>
            <h2 className="mt-2 text-xl font-semibold">Active policy controls</h2>
            <div className="mt-4 space-y-3">
              {policies.map((policy) => (
                <div
                  key={policy}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
                    <div className="text-sm text-slate-200">{policy}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <div className="text-sm font-medium text-amber-200">Why this panel matters</div>
              <div className="mt-1 text-sm text-amber-100/80">
                Users must immediately understand what the workspace permits, forbids, and escalates
                without opening three different settings pages.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-7 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Repository Estate
                </div>
                <h2 className="mt-2 text-xl font-semibold">Bound repositories</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Manage bindings
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {repositories.map((repo) => (
                <div
                  key={repo.name}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-medium">{repo.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {repo.type}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        repo.status === 'Healthy'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : repo.status === 'Attention'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-rose-400/10 text-rose-200'
                      }`}
                    >
                      {repo.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Branch</div>
                      <div className="mt-1 text-slate-200">{repo.branch}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">PRs</div>
                      <div className="mt-1 text-slate-200">{repo.prs}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Gates</div>
                      <div className="mt-1 text-slate-200">{repo.gates}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Run Queue</div>
                  <h2 className="mt-2 text-xl font-semibold">Active governed runs</h2>
                </div>
                <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                  View queue
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {activeRuns.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                          {run.id}
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-100">{run.title}</div>
                      </div>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
                        {run.risk}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">Phase: {run.phase}</div>
                    <div className="mt-1 text-xs text-slate-500">Owner: {run.owner}</div>
                    <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                      {run.state}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Agent Fleet</div>
              <h2 className="mt-2 text-xl font-semibold">Registered runtime agents</h2>
              <div className="mt-4 space-y-3">
                {agents.map((agent) => (
                  <div
                    key={agent.name}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {agent.version} · {agent.mode} · {agent.tools} tools
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        agent.status === 'Online'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
