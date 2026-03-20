export default function AgenticSDLCApprovalCenterMockup() {
  const approvals = [
    {
      id: 'APR-9001',
      title: 'Approve elevated external connector usage',
      category: 'Security Exception',
      workspace: 'Customer Experience Platform',
      run: 'RUN-2421',
      owner: 'Security Officer',
      risk: 'Critical',
      due: 'Today · 14:00',
      state: 'Pending Review',
      rationale:
        'Builder Agent requested temporary use of a non-standard connector to retrieve dependency metadata during build execution.',
      impact:
        'Approval will unblock Build → Test progression for one governed run and one repository scope.',
    },
    {
      id: 'APR-9002',
      title: 'Approve production deployment',
      category: 'Release Gate',
      workspace: 'Insurance API Platform',
      run: 'RUN-2415',
      owner: 'Release Manager',
      risk: 'High',
      due: 'Today · 16:30',
      state: 'Awaiting Decision',
      rationale:
        'All automated checks passed, but manual release approval is required by workspace policy for production promotion.',
      impact:
        'Approval will allow deployment to production shadow ring and initiate post-release monitoring.',
    },
    {
      id: 'APR-9003',
      title: 'Accept contract-breaking API change',
      category: 'Architecture Review',
      workspace: 'Governance & Compliance Suite',
      run: 'RUN-2409',
      owner: 'Principal Architect',
      risk: 'High',
      due: 'Tomorrow · 09:00',
      state: 'Needs Evidence',
      rationale:
        'Architect Agent detected a contract delta that affects downstream consumers and requires explicit human acceptance.',
      impact: 'Decision determines whether implementation may continue or must return to design.',
    },
  ];

  const evidence = [
    {
      label: 'Policy ID',
      value: 'GOV-214',
      detail: 'External connector use requires explicit sign-off for non-default tool scope.',
    },
    {
      label: 'Affected Repo Scope',
      value: 'claims-api',
      detail: 'No broader workspace write access requested.',
    },
    {
      label: 'Requested Duration',
      value: 'Single Run',
      detail: 'Permission expires automatically after run completion.',
    },
    {
      label: 'Blast Radius',
      value: 'Contained',
      detail: 'One run, one repo, no persistent permission expansion.',
    },
  ];

  const decisionOptions = [
    {
      action: 'Approve with policy constraints',
      description:
        'Allow execution to continue with automatic expiry, audit capture, and narrowed runtime scope.',
    },
    {
      action: 'Reject and send back',
      description:
        'Stop progression and require a different technical approach inside existing allowed boundaries.',
    },
    {
      action: 'Delegate for specialist review',
      description:
        'Reassign decision ownership while preserving due time and full decision history.',
    },
    {
      action: 'Request more evidence',
      description:
        'Pause the decision and ask the run owner or agent to provide missing justification or telemetry.',
    },
  ];

  const recentDecisions = [
    {
      title: 'Production deploy approved with canary restriction',
      by: 'Release Manager',
      time: '11:42',
      outcome: 'Approved with conditions',
    },
    {
      title: 'Architecture delta rejected due to missing rollback plan',
      by: 'Principal Architect',
      time: '10:18',
      outcome: 'Rejected',
    },
    {
      title: 'Prompt override delegated to Security Officer',
      by: 'Workspace Admin',
      time: '09:53',
      outcome: 'Delegated',
    },
  ];

  const filters = ['All', 'Critical', 'High', 'My Decisions', 'Awaiting Evidence', 'Delegated'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1680px] p-6">
        <header className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Approval Center
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Human Decision Control Plane
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                This page should let decision owners act fast without losing context. Every approval
                must show rationale, impact, scope, risk, policy basis, and the exact consequences
                of approval or rejection.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                3 critical approvals pending
              </div>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Export decision log
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {filters.map((filter, index) => (
              <button
                key={filter}
                className={`rounded-2xl px-4 py-2 text-sm ${
                  index === 0
                    ? 'bg-white text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                {filter}
              </button>
            ))}
            <div className="ml-auto rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-400">
              Search approvals, runs, policies, owners
            </div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-4 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Queue</div>
                <h2 className="mt-2 text-xl font-semibold">Pending approvals</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Sort by risk
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {approvals.map((approval, index) => (
                <div
                  key={approval.id}
                  className={`rounded-3xl border p-4 ${
                    index === 0
                      ? 'border-cyan-400/30 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                        {approval.id}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">
                        {approval.title}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        approval.risk === 'Critical'
                          ? 'bg-rose-400/10 text-rose-200'
                          : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {approval.risk}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">{approval.category}</div>
                  <div className="mt-1 text-xs text-slate-500">{approval.workspace}</div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Owner: {approval.owner}</span>
                    <span className="text-slate-500">{approval.due}</span>
                  </div>
                  <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                    {approval.state}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Selected Decision
                </div>
                <h2 className="mt-2 text-xl font-semibold">
                  Approve elevated external connector usage
                </h2>
              </div>
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100">
                Critical
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                ['Workspace', 'Customer Experience Platform'],
                ['Run', 'RUN-2421'],
                ['Decision Owner', 'Security Officer'],
                ['Current Phase', 'Build Blocked'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</div>
                  <div className="mt-2 text-sm font-medium text-slate-100">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Rationale</div>
              <div className="mt-3 text-sm text-slate-300">{approvals[0].rationale}</div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Operational impact
              </div>
              <div className="mt-3 text-sm text-slate-300">{approvals[0].impact}</div>
            </div>

            <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
              <div className="text-sm font-medium text-amber-200">
                Approval page design principle
              </div>
              <div className="mt-2 text-sm text-amber-100/80">
                The user should never approve a high-risk action from a thin card alone. The center
                panel must provide enough operational context to decide responsibly without opening
                five more pages.
              </div>
            </div>
          </div>

          <div className="col-span-3 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Decision Actions
              </div>
              <h2 className="mt-2 text-xl font-semibold">Choose an outcome</h2>
            </div>

            <div className="mt-4 space-y-3">
              {decisionOptions.map((option, index) => (
                <div
                  key={option.action}
                  className={`rounded-3xl border p-4 ${
                    index === 0
                      ? 'border-cyan-400/30 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-900/70'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-100">{option.action}</div>
                  <div className="mt-2 text-xs text-slate-500">{option.description}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              <button className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
                Submit Decision
              </button>
              <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Save as Draft
              </button>
              <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Delegate
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-7 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Decision Evidence
                </div>
                <h2 className="mt-2 text-xl font-semibold">Why this request exists</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open full evidence pack
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {evidence.map((item) => (
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

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    Supporting artifacts
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-100">
                    Policy evaluation, run log, permission diff, repo scope manifest
                  </div>
                </div>
                <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                  Inspect files
                </button>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div className="h-2 w-4/5 rounded-full bg-cyan-400" />
              </div>
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Recent Outcomes
                </div>
                <h2 className="mt-2 text-xl font-semibold">Decision history</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open audit history
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentDecisions.map((item, index) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm text-cyan-200">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-100">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      By {item.by} · {item.time}
                    </div>
                    <div className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300 inline-block">
                      {item.outcome}
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
