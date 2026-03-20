export default function AgenticSDLCDashboardMockup() {
  const phases = [
    { name: 'Intake', status: 'Ready', items: 4 },
    { name: 'Plan', status: 'Review', items: 2 },
    { name: 'Design', status: 'In Progress', items: 3 },
    { name: 'Build', status: 'Blocked', items: 1 },
    { name: 'Test', status: 'Queued', items: 5 },
    { name: 'Release', status: 'Pending', items: 2 },
    { name: 'Monitor', status: 'Healthy', items: 6 },
  ];

  const approvals = [
    {
      title: 'Architecture contract change',
      project: 'Customer Claims Portal',
      owner: 'Principal Architect',
      risk: 'High',
      due: 'Today · 14:00',
    },
    {
      title: 'Deploy to production',
      project: 'Insurance API',
      owner: 'Release Manager',
      risk: 'Medium',
      due: 'Today · 16:30',
    },
    {
      title: 'Use external MCP connector',
      project: 'SDLC Workspace A',
      owner: 'Security Officer',
      risk: 'Critical',
      due: 'Tomorrow · 09:00',
    },
  ];

  const activities = [
    'Planner agent generated implementation plan v12',
    'Human reviewer rejected test gate due to missing integration coverage',
    'Security agent flagged privileged Graph scope elevation request',
    'Builder agent completed patch set for workspace/repo-billing-api',
    'Policy engine paused release because change advisory approval is missing',
  ];

  const workspaces = [
    {
      name: 'Customer Experience Platform',
      repos: 6,
      agents: 11,
      health: 'Stable',
    },
    {
      name: 'Governance & Compliance Suite',
      repos: 4,
      agents: 8,
      health: 'Attention',
    },
    {
      name: 'Platform Engineering Core',
      repos: 9,
      agents: 14,
      health: 'Stable',
    },
  ];

  const risks = [
    {
      label: 'Policy Violations',
      value: '07',
      detail: '2 critical · 3 high · 2 medium',
    },
    {
      label: 'Blocked Runs',
      value: '03',
      detail: 'Waiting for human review or dependency recovery',
    },
    {
      label: 'Drift Detected',
      value: '12',
      detail: 'Contracts, prompts, pipeline config, permissions',
    },
    {
      label: 'Audit Events',
      value: '148',
      detail: 'All decisions and overrides are recorded',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-white/10 bg-slate-950/90 p-5">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">Governed SDLC</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Control Surface</h1>
            <p className="mt-2 text-sm text-slate-400">
              Human-in-the-loop orchestration for planning, build, test, release, and governance.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-lg shadow-cyan-950/40">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Current Workspace
            </div>
            <div className="mt-2 text-lg font-medium">Customer Experience Platform</div>
            <div className="mt-1 text-sm text-slate-300">
              6 repositories · 11 agents · 3 active gates
            </div>
          </div>

          <nav className="mt-8 space-y-2 text-sm">
            {[
              'Overview',
              'Workspaces',
              'Agents',
              'Runs',
              'Approvals',
              'Policies',
              'Prompts & Contracts',
              'Audit Trail',
              'Observability',
              'Administration',
            ].map((item, idx) => (
              <div
                key={item}
                className={`rounded-xl px-4 py-3 ${
                  idx === 0
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {item}
              </div>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Operator Mode</div>
            <div className="mt-2 text-sm text-slate-200">Strict Governance</div>
            <div className="mt-1 text-xs text-slate-500">
              Manual approvals required for policy exceptions, releases, and elevated tools.
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-400">Friday, March 20, 2026</div>
              <h2 className="text-3xl font-semibold tracking-tight">Executive Control Dashboard</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                Environment: Production Shadow Mode
              </div>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Create Governed Run
              </button>
            </div>
          </header>

          <section className="grid grid-cols-4 gap-4">
            {risks.map((risk) => (
              <div
                key={risk.label}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20"
              >
                <div className="text-sm text-slate-400">{risk.label}</div>
                <div className="mt-3 text-4xl font-semibold tracking-tight">{risk.value}</div>
                <div className="mt-2 text-sm text-slate-500">{risk.detail}</div>
              </div>
            ))}
          </section>

          <section className="mt-6 grid grid-cols-12 gap-6">
            <div className="col-span-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                    Pipeline State
                  </div>
                  <h3 className="mt-2 text-xl font-semibold">
                    SDLC phase progression with explicit gate ownership
                  </h3>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
                  23 active runs
                </div>
              </div>

              <div className="mt-6 grid grid-cols-7 gap-3">
                {phases.map((phase, index) => (
                  <div
                    key={phase.name}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">0{index + 1}</div>
                      <div className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
                        {phase.status}
                      </div>
                    </div>
                    <div className="mt-6 text-lg font-medium">{phase.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{phase.items} items</div>
                    <div className="mt-6 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-2/3 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="text-sm font-medium text-amber-200">
                  Gate friction is intentional
                </div>
                <div className="mt-1 text-sm text-amber-100/80">
                  The interface should never hide why a run is blocked, who owns the decision, or
                  what evidence is required to continue.
                </div>
              </div>
            </div>

            <div className="col-span-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Human Decisions
              </div>
              <h3 className="mt-2 text-xl font-semibold">Pending approvals</h3>
              <div className="mt-4 space-y-3">
                {approvals.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.project}</div>
                      </div>
                      <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-rose-200">
                        {item.risk}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">Owner: {item.owner}</div>
                    <div className="mt-1 text-xs text-slate-500">Due: {item.due}</div>
                    <div className="mt-4 flex gap-2">
                      <button className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-950">
                        Review
                      </button>
                      <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                        Delegate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-12 gap-6">
            <div className="col-span-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                    Workspace Portfolio
                  </div>
                  <h3 className="mt-2 text-xl font-semibold">Operational scope</h3>
                </div>
                <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                  View all
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {workspaces.map((ws) => (
                  <div
                    key={ws.name}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div>
                      <div className="font-medium">{ws.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {ws.repos} repos · {ws.agents} agents
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs ${ws.health === 'Stable' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}
                    >
                      {ws.health}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-7 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                    Traceability
                  </div>
                  <h3 className="mt-2 text-xl font-semibold">Recent system decisions</h3>
                </div>
                <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                  Open audit trail
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {activities.map((activity, idx) => (
                  <div
                    key={activity}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm text-cyan-200">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm text-slate-200">{activity}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Evidence captured · linked to run record · reversible decision path
                        available
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
