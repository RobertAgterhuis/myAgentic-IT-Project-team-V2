export default function AgenticSDLCRunDetailMockup() {
  const timeline = [
    {
      step: 'Run Created',
      actor: 'Product Owner',
      time: '08:42',
      state: 'Complete',
      detail: 'Scope, success criteria, and repo bindings were approved at intake.',
    },
    {
      step: 'Plan Generated',
      actor: 'Planner Agent',
      time: '08:47',
      state: 'Complete',
      detail: 'Execution plan v12 created with delivery phases, dependencies, and checkpoints.',
    },
    {
      step: 'Architecture Review',
      actor: 'Architect Agent + Human Reviewer',
      time: '09:05',
      state: 'Complete',
      detail: 'API contract delta accepted with a condition on retry semantics.',
    },
    {
      step: 'Build Execution',
      actor: 'Builder Agent',
      time: '09:24',
      state: 'Blocked',
      detail:
        'Patch set generated, but pipeline promotion stopped by missing approval for elevated connector use.',
    },
    {
      step: 'Test Gate',
      actor: 'Tester Agent',
      time: 'Pending',
      state: 'Waiting',
      detail: 'Execution cannot proceed until governance decision is resolved.',
    },
  ];

  const artifacts = [
    {
      type: 'Plan',
      name: 'implementation-plan-v12.md',
      status: 'Approved',
      owner: 'Planner Agent',
    },
    {
      type: 'Contract',
      name: 'retry-policy-contract.diff',
      status: 'Accepted with conditions',
      owner: 'Architect Review',
    },
    {
      type: 'Code Patch',
      name: 'builder-patchset-2421.patch',
      status: 'Generated',
      owner: 'Builder Agent',
    },
    {
      type: 'Evidence',
      name: 'policy-evaluation-connector.json',
      status: 'Requires human decision',
      owner: 'Policy Engine',
    },
  ];

  const agents = [
    {
      name: 'Planner',
      role: 'Planning',
      toolScope: 'Read docs + issue tracker',
      result: 'Produced execution plan',
      state: 'Complete',
    },
    {
      name: 'Architect',
      role: 'Design review',
      toolScope: 'Read code + contracts',
      result: 'Requested retry semantics constraint',
      state: 'Complete',
    },
    {
      name: 'Builder',
      role: 'Scoped code generation',
      toolScope: 'Write limited to claims-api',
      result: 'Generated patch but promotion blocked',
      state: 'Blocked',
    },
    {
      name: 'Policy Engine',
      role: 'Governance',
      toolScope: 'Evaluate permissions + controls',
      result: 'Escalated elevated connector use',
      state: 'Needs approval',
    },
  ];

  const decisions = [
    {
      title: 'Approve elevated external connector usage',
      owner: 'Security Officer',
      impact: 'Unblocks build and test progression',
      urgency: 'Critical',
    },
    {
      title: 'Accept architecture condition on retry backoff',
      owner: 'Principal Architect',
      impact: 'Finalizes contract baseline for implementation',
      urgency: 'High',
    },
  ];

  const logs = [
    '09:24:11 · Builder Agent opened patch proposal against claims-api',
    '09:24:26 · Policy Engine detected non-standard connector permission request',
    '09:24:29 · Automatic promotion to test was stopped by governance control GOV-214',
    '09:25:02 · Security Officer notified through approval workflow',
    '09:25:19 · Run state changed from Executing to Blocked',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1650px] p-6">
        <header className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Run Detail</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                RUN-2421 · API Retry Resiliency Patch
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                A governed run should read like a complete case file: objective, scope, current
                state, evidence, blockers, and the exact human decisions needed to continue.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                Current State: Blocked
              </div>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Open Full Audit
              </button>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Review Blocker
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-5 gap-4">
            {[
              ['Workspace', 'Customer Experience Platform', 'Governed workspace boundary'],
              ['Phase', 'Build', 'Promotion to test is paused'],
              ['Risk', 'Critical', 'Elevated permission request detected'],
              ['Owner', 'Security Officer', 'Current human decision owner'],
              ['Repositories', 'claims-api', 'Write scope limited to one repo'],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
                <div className="mt-3 text-lg font-medium text-slate-100">{value}</div>
                <div className="mt-2 text-sm text-slate-500">{detail}</div>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Execution Timeline
                </div>
                <h2 className="mt-2 text-xl font-semibold">Governed phase progression</h2>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
                Started 08:42 · Last event 09:25
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {timeline.map((item, index) => (
                <div
                  key={item.step}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                        item.state === 'Complete'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : item.state === 'Blocked'
                            ? 'bg-rose-400/10 text-rose-200'
                            : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index !== timeline.length - 1 && (
                      <div className="mt-2 h-16 w-px bg-white/10" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-medium">{item.step}</div>
                        <div className="mt-1 text-sm text-slate-400">{item.actor}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-300">{item.time}</div>
                        <div
                          className={`mt-2 rounded-full px-3 py-1 text-xs ${
                            item.state === 'Complete'
                              ? 'bg-emerald-400/10 text-emerald-200'
                              : item.state === 'Blocked'
                                ? 'bg-rose-400/10 text-rose-200'
                                : 'bg-amber-400/10 text-amber-200'
                          }`}
                        >
                          {item.state}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-slate-500">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
              <div className="text-sm font-medium text-amber-200">Run page design principle</div>
              <div className="mt-2 text-sm text-amber-100/80">
                The user should never need to reconstruct the story of the run from logs alone. The
                page itself must narrate what happened, why it stopped, and what comes next.
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Required Human Action
              </div>
              <h2 className="mt-2 text-xl font-semibold">Decision queue</h2>
              <div className="mt-4 space-y-3">
                {decisions.map((decision) => (
                  <div
                    key={decision.title}
                    className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-100">{decision.title}</div>
                      <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-rose-200">
                        {decision.urgency}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">Owner: {decision.owner}</div>
                    <div className="mt-1 text-xs text-slate-500">{decision.impact}</div>
                    <div className="mt-4 flex gap-2">
                      <button className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-950">
                        Approve / Reject
                      </button>
                      <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                        Inspect evidence
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Live Event Feed
              </div>
              <h2 className="mt-2 text-xl font-semibold">Recent run logs</h2>
              <div className="mt-4 space-y-3">
                {logs.map((log) => (
                  <div
                    key={log}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-300"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-7 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Artifacts & Evidence
                </div>
                <h2 className="mt-2 text-xl font-semibold">Attached run outputs</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open evidence explorer
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {artifacts.map((artifact) => (
                <div
                  key={artifact.name}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                        {artifact.type}
                      </div>
                      <div className="mt-2 text-base font-medium text-slate-100">
                        {artifact.name}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {artifact.status}
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-500">Owner: {artifact.owner}</div>
                  <div className="mt-4 h-2 rounded-full bg-white/10">
                    <div className="h-2 w-3/4 rounded-full bg-cyan-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Agent Participation
                </div>
                <h2 className="mt-2 text-xl font-semibold">Who did what</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open permissions
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{agent.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{agent.role}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        agent.state === 'Complete'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : agent.state === 'Blocked'
                            ? 'bg-rose-400/10 text-rose-200'
                            : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {agent.state}
                    </span>
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                    <div className="text-xs text-slate-500">Tool Scope</div>
                    <div className="mt-1 text-sm text-slate-300">{agent.toolScope}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-500">{agent.result}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
