export default function AgenticSDLCPromptContractManagementMockup() {
  const assets = [
    {
      name: 'planner-system-prompt',
      type: 'System Prompt',
      version: 'v12.4',
      scope: 'Planner Agent',
      state: 'Approved',
      lastChanged: '2026-03-18 15:42',
    },
    {
      name: 'build-run-contract',
      type: 'Execution Contract',
      version: 'v7.1',
      scope: 'Builder Agent',
      state: 'Review Required',
      lastChanged: '2026-03-20 08:11',
    },
    {
      name: 'architecture-review-schema',
      type: 'Validation Schema',
      version: 'v3.8',
      scope: 'Architect Agent',
      state: 'Approved',
      lastChanged: '2026-03-19 11:06',
    },
    {
      name: 'release-gate-policy-template',
      type: 'Policy Template',
      version: 'v5.0',
      scope: 'Release Governance',
      state: 'Drift Detected',
      lastChanged: '2026-03-20 07:49',
    },
    {
      name: 'tool-scope-manifest',
      type: 'Permission Manifest',
      version: 'v4.2',
      scope: 'Runtime Agents',
      state: 'Approved',
      lastChanged: '2026-03-17 16:22',
    },
  ];

  const versions = [
    {
      version: 'v7.1',
      author: 'Builder Agent Maintainer',
      time: '08:11',
      change: 'Added connector metadata request field to execution contract',
      state: 'Pending Review',
    },
    {
      version: 'v7.0',
      author: 'Platform Governance',
      time: 'Yesterday',
      change: 'Restricted cross-repo write clauses and added explicit expiry semantics',
      state: 'Approved',
    },
    {
      version: 'v6.9',
      author: 'Architecture Office',
      time: '2 days ago',
      change: 'Introduced contract validation for retry semantics and idempotency rules',
      state: 'Superseded',
    },
  ];

  const contractRules = [
    {
      label: 'Required Inputs',
      value: 'Run ID, repo scope, success criteria, approval context',
    },
    {
      label: 'Allowed Outputs',
      value: 'Patch proposal, evidence bundle, test request, escalation request',
    },
    {
      label: 'Forbidden Behavior',
      value: 'Cross-repo writes, unstamped prompt overrides, undeclared tool usage',
    },
    {
      label: 'Escalation Conditions',
      value: 'Permission expansion, contract-breaking changes, unknown external connector',
    },
  ];

  const validationChecks = [
    {
      title: 'Schema conformance',
      result: 'Pass',
      detail: 'All required fields are present and correctly typed.',
    },
    {
      title: 'Policy compatibility',
      result: 'Warning',
      detail: 'Connector request field introduces a new approval dependency under GOV-214.',
    },
    {
      title: 'Backward compatibility',
      result: 'Pass',
      detail: 'Existing consumers remain valid under additive contract semantics.',
    },
    {
      title: 'Prompt drift detection',
      result: 'Fail',
      detail: 'Release template differs from approved baseline in 2 governance clauses.',
    },
  ];

  const changeRequests = [
    {
      id: 'PCR-118',
      title: 'Approve connector metadata field in build contract',
      owner: 'Security Officer',
      status: 'Pending',
      impact: 'Affects Builder Agent execution path for high-risk runs',
    },
    {
      id: 'PCR-114',
      title: 'Standardize release template with shadow-ring wording',
      owner: 'Release Manager',
      status: 'In Review',
      impact: 'Removes policy ambiguity for canary and shadow promotion',
    },
  ];

  const metrics = [
    {
      label: 'Governed Assets',
      value: '47',
      detail: 'Prompts, contracts, schemas, policy templates, and permission manifests',
    },
    {
      label: 'Assets Pending Review',
      value: '05',
      detail: 'Changes cannot become active until the approval workflow completes',
    },
    {
      label: 'Drift Findings',
      value: '03',
      detail: 'Differences between active runtime state and approved baseline',
    },
    {
      label: 'Validation Failures',
      value: '01',
      detail: 'One release template currently violates the approved control baseline',
    },
  ];

  const tabs = [
    'Asset Registry',
    'Selected Asset',
    'Versions',
    'Validation',
    'Change Requests',
    'Drift',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1680px] p-6">
        <header className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Prompt & Contract Management
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Governed Behavioral Definitions and Interface Contracts
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                This page should make the agent system feel deterministic and reviewable. Prompts,
                contracts, schemas, templates, and tool manifests are not implementation details;
                they are controlled runtime assets that define how the platform behaves.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                5 assets are awaiting governance review
              </div>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Submit Change Request
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
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Asset Registry
                </div>
                <h2 className="mt-2 text-xl font-semibold">Controlled definitions</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Filter by type
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {assets.map((asset, index) => (
                <div
                  key={asset.name}
                  className={`rounded-3xl border p-4 ${
                    index === 1
                      ? 'border-cyan-400/30 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{asset.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {asset.type} · {asset.version}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        asset.state === 'Approved'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : asset.state === 'Review Required'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-rose-400/10 text-rose-200'
                      }`}
                    >
                      {asset.state}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">Scope: {asset.scope}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Last changed: {asset.lastChanged}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Selected Asset
                </div>
                <h2 className="mt-2 text-xl font-semibold">build-run-contract</h2>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
                Review Required
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                ['Asset Type', 'Execution Contract'],
                ['Current Version', 'v7.1'],
                ['Primary Scope', 'Builder Agent'],
                ['Owner', 'Platform Governance'],
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
                This contract defines the admissible shape of a Builder Agent run: which inputs are
                mandatory, what outputs are allowed, what behaviors are forbidden, and which
                conditions require escalation into human governance workflows.
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {contractRules.map((rule) => (
                <div
                  key={rule.label}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    {rule.label}
                  </div>
                  <div className="mt-2 text-sm text-slate-300">{rule.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
              <div className="text-sm font-medium text-amber-200">
                Prompt / contract page design principle
              </div>
              <div className="mt-2 text-sm text-amber-100/80">
                The platform should not treat prompts as hidden strings. They are runtime control
                assets and must be versioned, reviewed, validated, and diffable like code or policy.
              </div>
            </div>
          </div>

          <div className="col-span-3 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Validation</div>
              <h2 className="mt-2 text-xl font-semibold">Safety and integrity checks</h2>
            </div>

            <div className="mt-4 space-y-3">
              {validationChecks.map((check) => (
                <div
                  key={check.title}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-slate-100">{check.title}</div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        check.result === 'Pass'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : check.result === 'Warning'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-rose-400/10 text-rose-200'
                      }`}
                    >
                      {check.result}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{check.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-6 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Version History
                </div>
                <h2 className="mt-2 text-xl font-semibold">Change lineage</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open diff view
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {versions.map((item, index) => (
                <div
                  key={item.version}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm text-cyan-200">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{item.version}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {item.author} · {item.time}
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
                        {item.state}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">{item.change}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-6 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Change Requests
                </div>
                <h2 className="mt-2 text-xl font-semibold">Governed updates awaiting decision</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open full queue
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {changeRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                        {request.id}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">{request.title}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        request.status === 'Pending'
                          ? 'bg-amber-400/10 text-amber-200'
                          : 'bg-cyan-400/10 text-cyan-200'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">Owner: {request.owner}</div>
                  <div className="mt-1 text-xs text-slate-500">{request.impact}</div>
                  <div className="mt-4 flex gap-2">
                    <button className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-950">
                      Review
                    </button>
                    <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                      Open diff
                    </button>
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
