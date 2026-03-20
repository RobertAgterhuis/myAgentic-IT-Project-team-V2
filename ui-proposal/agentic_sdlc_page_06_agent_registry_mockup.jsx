export default function AgenticSDLCAgentRegistryMockup() {
  const agents = [
    {
      name: 'Planner',
      type: 'Planning Agent',
      version: 'v2.8.4',
      workspace: 'Customer Experience Platform',
      status: 'Online',
      risk: 'Moderate',
      mode: 'Constrained',
      tools: 4,
      lastRun: '09:47',
    },
    {
      name: 'Architect',
      type: 'Review Agent',
      version: 'v1.9.2',
      workspace: 'Customer Experience Platform',
      status: 'Online',
      risk: 'High',
      mode: 'Review Required',
      tools: 3,
      lastRun: '09:12',
    },
    {
      name: 'Builder',
      type: 'Write Agent',
      version: 'v3.2.1',
      workspace: 'Customer Experience Platform',
      status: 'Restricted',
      risk: 'Critical',
      mode: 'Scoped Write',
      tools: 6,
      lastRun: '09:24',
    },
    {
      name: 'Tester',
      type: 'Quality Agent',
      version: 'v2.1.6',
      workspace: 'Customer Experience Platform',
      status: 'Degraded',
      risk: 'Moderate',
      mode: 'Read + Execute',
      tools: 5,
      lastRun: '08:58',
    },
    {
      name: 'Security',
      type: 'Governance Agent',
      version: 'v2.4.0',
      workspace: 'Global Governance',
      status: 'Online',
      risk: 'Critical',
      mode: 'Approval Gate',
      tools: 4,
      lastRun: '09:25',
    },
  ];

  const permissions = [
    {
      label: 'Repository Scope',
      value: 'claims-api only',
      detail: 'Write permissions are constrained to one approved repository during scoped runs.',
    },
    {
      label: 'Tool Access',
      value: '6 approved tools',
      detail:
        'Tool set includes patch generation, diff inspection, test invocation, and repo metadata retrieval.',
    },
    {
      label: 'Approval Model',
      value: 'Human escalation required',
      detail:
        'Any request outside standard tool scope or permission boundary triggers a decision workflow.',
    },
    {
      label: 'Execution Boundary',
      value: 'Run-bound',
      detail: 'Permissions automatically expire when the governed run completes or is terminated.',
    },
  ];

  const activity = [
    '09:24 · Builder Agent generated patchset for RUN-2421',
    '09:24 · Policy Engine restricted build progression pending GOV-214 review',
    '09:18 · Builder Agent requested dependency metadata connector access',
    '08:56 · Builder Agent completed diff validation for retry resilience changes',
    '08:41 · Builder Agent admitted into governed run with repo-bound write scope',
  ];

  const controls = [
    {
      title: 'Allowed Actions',
      items: [
        'Generate patch proposals',
        'Inspect repo diff',
        'Run approved test harnesses',
        'Create evidence bundles',
      ],
    },
    {
      title: 'Blocked Actions',
      items: [
        'Cross-repo writes',
        'Unapproved connector usage',
        'Direct production deployment',
        'Policy mutation',
      ],
    },
    {
      title: 'Escalation Triggers',
      items: [
        'Permission expansion',
        'New external tool request',
        'Contract-breaking changes',
        'High-risk runtime drift',
      ],
    },
  ];

  const metrics = [
    {
      label: 'Registered Agents',
      value: '11',
      detail: 'Across planning, review, build, test, governance, and observability roles',
    },
    {
      label: 'Write-Capable Agents',
      value: '03',
      detail: 'Highest governance scrutiny due to direct repository modification capability',
    },
    {
      label: 'Restricted / Degraded',
      value: '02',
      detail: 'One restricted by policy; one degraded due to runtime health',
    },
    {
      label: 'Permission Escalations Today',
      value: '05',
      detail: 'All linked to approvals, run IDs, evidence, and owners',
    },
  ];

  const tabs = ['Registry', 'Selected Agent', 'Permissions', 'Tools', 'Activity', 'Incidents'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1680px] p-6">
        <header className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Agent Registry
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Governed Agent Inventory and Runtime Accountability
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                Agents should never feel magical or hidden. This page must show what each agent is,
                what it can do, where it can operate, how risky it is, what controls constrain it,
                and what it actually did most recently.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                2 agents need operational attention
              </div>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Register New Agent
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {tabs.map((tab, index) => (
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
            ))}
          </div>
        </header>

        <section className="mt-6 grid grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20"
            >
              <div className="text-sm text-slate-400">{metric.label}</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight">{metric.value}</div>
              <div className="mt-2 text-sm text-slate-500">{metric.detail}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-4 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Registry</div>
                <h2 className="mt-2 text-xl font-semibold">Available agents</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Filter by role
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {agents.map((agent, index) => (
                <div
                  key={agent.name}
                  className={`rounded-3xl border p-4 ${
                    index === 2
                      ? 'border-cyan-400/30 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{agent.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {agent.type} · {agent.version}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        agent.status === 'Online'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : agent.status === 'Restricted'
                            ? 'bg-rose-400/10 text-rose-200'
                            : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Workspace</div>
                      <div className="mt-1 text-slate-200">{agent.workspace}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Mode</div>
                      <div className="mt-1 text-slate-200">{agent.mode}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Tools</div>
                      <div className="mt-1 text-slate-200">{agent.tools}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Last Run</div>
                      <div className="mt-1 text-slate-200">{agent.lastRun}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Selected Agent
                </div>
                <h2 className="mt-2 text-xl font-semibold">Builder Agent</h2>
              </div>
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100">
                Restricted
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                ['Agent Role', 'Scoped code generation'],
                ['Primary Workspace', 'Customer Experience Platform'],
                ['Risk Tier', 'Critical'],
                ['Current Mode', 'Scoped Write'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</div>
                  <div className="mt-2 text-sm font-medium text-slate-100">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Operational summary
              </div>
              <div className="mt-3 text-sm text-slate-300">
                The Builder Agent is allowed to generate code changes only inside explicitly
                approved repository scope, under run-bound permissions, with policy-driven
                escalation when tool, connector, or write boundaries are exceeded.
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
              <div className="text-sm font-medium text-amber-200">Agent page design principle</div>
              <div className="mt-2 text-sm text-amber-100/80">
                Users must understand an agent the same way they understand a privileged service
                account or platform component: identity, scope, controls, history, and risk.
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {permissions.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-lg font-medium text-slate-100">{item.value}</div>
                  <div className="mt-2 text-sm text-slate-500">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-3 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Control Surface
              </div>
              <h2 className="mt-2 text-xl font-semibold">Behavior constraints</h2>
            </div>

            <div className="mt-4 space-y-4">
              {controls.map((control) => (
                <div
                  key={control.title}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="text-sm font-medium text-slate-100">{control.title}</div>
                  <div className="mt-3 space-y-2">
                    {control.items.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-7 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Recent Activity
                </div>
                <h2 className="mt-2 text-xl font-semibold">Selected agent timeline</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open full activity
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {activity.map((item, index) => (
                <div
                  key={item}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm text-cyan-200">
                    {index + 1}
                  </div>
                  <div className="text-sm text-slate-300">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Runtime Integrity
                </div>
                <h2 className="mt-2 text-xl font-semibold">Health and assurance</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Inspect runtime
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {[
                ['Last Policy Evaluation', '09:24:29'],
                ['Permission Expansions', '1 pending'],
                ['Drift State', 'No unmanaged drift'],
                ['Audit Coverage', 'Complete'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</div>
                  <div className="mt-2 text-lg font-medium text-slate-100">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Why this matters
              </div>
              <div className="mt-3 text-sm text-slate-300">
                Agent pages need to collapse identity, capability, permissions, controls, and
                observed behavior into one coherent surface. Otherwise the platform will feel
                powerful, but not governable.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
