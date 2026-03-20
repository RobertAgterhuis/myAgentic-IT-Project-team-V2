export default function AgenticSDLCPolicyGovernanceCenterMockup() {
  const policySets = [
    {
      name: 'Release Governance',
      scope: 'All production-capable workspaces',
      policies: 12,
      findings: 3,
      status: 'Attention',
    },
    {
      name: 'Agent Permission Boundaries',
      scope: 'All runtime agents',
      policies: 18,
      findings: 1,
      status: 'Healthy',
    },
    {
      name: 'Contract Integrity Controls',
      scope: 'APIs, prompts, schemas, templates',
      policies: 9,
      findings: 4,
      status: 'Drift',
    },
    {
      name: 'External Connector Controls',
      scope: 'MCP and third-party integrations',
      policies: 7,
      findings: 2,
      status: 'Attention',
    },
  ];

  const activePolicies = [
    {
      id: 'GOV-214',
      title: 'External connector use requires explicit approval',
      category: 'Security',
      severity: 'Critical',
      enforcement: 'Blocking',
      scope: 'Non-default connector access during runs',
      owner: 'Security Officer',
    },
    {
      id: 'GOV-118',
      title: 'Production deployment requires human release approval',
      category: 'Release',
      severity: 'High',
      enforcement: 'Blocking',
      scope: 'Production and shadow production rings',
      owner: 'Release Manager',
    },
    {
      id: 'GOV-077',
      title: 'Contract-breaking API changes require architecture review',
      category: 'Architecture',
      severity: 'High',
      enforcement: 'Escalating',
      scope: 'API surface and downstream consumers',
      owner: 'Principal Architect',
    },
    {
      id: 'GOV-031',
      title: 'Agent write scope must remain repo-bound per run',
      category: 'Runtime',
      severity: 'Critical',
      enforcement: 'Blocking',
      scope: 'All write-capable agents',
      owner: 'Platform Governance',
    },
  ];

  const exceptions = [
    {
      id: 'EXC-401',
      title: 'Temporary connector approval for dependency metadata',
      workspace: 'Customer Experience Platform',
      linkedPolicy: 'GOV-214',
      expires: 'After run completion',
      state: 'Pending',
    },
    {
      id: 'EXC-392',
      title: 'Canary-only production release approval override',
      workspace: 'Insurance API Platform',
      linkedPolicy: 'GOV-118',
      expires: '2026-03-21 22:00',
      state: 'Active',
    },
    {
      id: 'EXC-387',
      title: 'Architecture review deferral with rollback constraint',
      workspace: 'Compliance Services',
      linkedPolicy: 'GOV-077',
      expires: '2026-03-22 09:00',
      state: 'Expiring Soon',
    },
  ];

  const evaluations = [
    {
      event: 'Build promotion stopped by GOV-214',
      target: 'RUN-2421',
      result: 'Blocked',
      time: '09:24',
    },
    {
      event: 'Production deployment paused for manual approval',
      target: 'RUN-2415',
      result: 'Escalated',
      time: '08:52',
    },
    {
      event: 'Cross-repo write attempt denied for Builder Agent',
      target: 'RUN-2402',
      result: 'Denied',
      time: '08:16',
    },
    {
      event: 'Contract delta routed to architecture review',
      target: 'RUN-2409',
      result: 'Needs Review',
      time: '07:44',
    },
  ];

  const metrics = [
    {
      label: 'Policy Evaluations Today',
      value: '1,482',
      detail: 'All automated and human-gated decisions included',
    },
    {
      label: 'Blocking Policies Triggered',
      value: '17',
      detail: 'Runs halted until evidence or approval exists',
    },
    {
      label: 'Active Exceptions',
      value: '06',
      detail: 'Time-bound and explicitly auditable',
    },
    {
      label: 'Drift Findings',
      value: '11',
      detail: 'Policies, contracts, scopes, enforcement mappings',
    },
  ];

  const tabs = ['Policy Sets', 'Rules', 'Exceptions', 'Evaluations', 'Drift', 'Ownership'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1680px] p-6">
        <header className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Policy / Governance Center
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Enforcement, Exceptions, and Control Integrity
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                This page should make governance operationally understandable. Users must be able to
                see which policies exist, what they do, where they apply, when they triggered, who
                owns them, and which exceptions are currently weakening the control posture.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                11 drift findings require attention
              </div>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Create Policy Change Request
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
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Policy Sets</div>
                <h2 className="mt-2 text-xl font-semibold">Control domains</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                View matrix
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {policySets.map((set, index) => (
                <div
                  key={set.name}
                  className={`rounded-3xl border p-4 ${
                    index === 0
                      ? 'border-cyan-400/30 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{set.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{set.scope}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        set.status === 'Healthy'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : set.status === 'Attention'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-rose-400/10 text-rose-200'
                      }`}
                    >
                      {set.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Policies</div>
                      <div className="mt-1 text-slate-200">{set.policies}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Findings</div>
                      <div className="mt-1 text-slate-200">{set.findings}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Active Rules</div>
                <h2 className="mt-2 text-xl font-semibold">Enforced governance policies</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Search rules
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {activePolicies.map((policy) => (
                <div
                  key={policy.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                        {policy.id}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">{policy.title}</div>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
                        {policy.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.15em] ${
                          policy.severity === 'Critical'
                            ? 'bg-rose-400/10 text-rose-200'
                            : 'bg-amber-400/10 text-amber-200'
                        }`}
                      >
                        {policy.severity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Enforcement</div>
                      <div className="mt-1 text-slate-200">{policy.enforcement}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Scope</div>
                      <div className="mt-1 text-slate-200">{policy.scope}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Owner</div>
                      <div className="mt-1 text-slate-200">{policy.owner}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-3 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Governance Guidance
              </div>
              <h2 className="mt-2 text-xl font-semibold">Design principles</h2>
            </div>

            <div className="mt-4 space-y-3">
              {[
                'Policies must describe operational effect, not only abstract intent.',
                'Blocking controls should always show the unblock path.',
                'Exceptions must be time-bound, scoped, owned, and auditable.',
                'Drift must be visible before it becomes a compliance incident.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4">
              <div className="text-sm font-medium text-amber-200">Critical UX point</div>
              <div className="mt-2 text-sm text-amber-100/80">
                Governance must not feel buried in administration screens. It needs first-class
                operational visibility because it actively shapes runtime behavior.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Exceptions Register
                </div>
                <h2 className="mt-2 text-xl font-semibold">Temporary weakening of controls</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Review all
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {exceptions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                        {item.id}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">{item.title}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        item.state === 'Active'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : item.state === 'Expiring Soon'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-rose-400/10 text-rose-200'
                      }`}
                    >
                      {item.state}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">Workspace: {item.workspace}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Linked Policy: {item.linkedPolicy}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Expires: {item.expires}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-7 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Evaluation Stream
                </div>
                <h2 className="mt-2 text-xl font-semibold">Recent policy outcomes</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open full event stream
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {evaluations.map((item, index) => (
                <div
                  key={item.event}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm text-cyan-200">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{item.event}</div>
                        <div className="mt-1 text-xs text-slate-500">Target: {item.target}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{item.time}</div>
                        <div className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300 inline-block">
                          {item.result}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-3/4 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
