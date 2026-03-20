export default function AgenticSDLCAuditTrailEvidenceExplorerMockup() {
  const events = [
    {
      id: 'AUD-55021',
      type: 'Policy Evaluation',
      title: 'GOV-214 blocked build promotion',
      subject: 'RUN-2421 · Builder Agent',
      workspace: 'Customer Experience Platform',
      time: '09:24:29',
      risk: 'Critical',
      status: 'Recorded',
    },
    {
      id: 'AUD-55018',
      type: 'Approval Decision',
      title: 'Production deploy approved with canary restriction',
      subject: 'RUN-2415 · Release Manager',
      workspace: 'Insurance API Platform',
      time: '08:52:11',
      risk: 'High',
      status: 'Recorded',
    },
    {
      id: 'AUD-55007',
      type: 'Contract Change',
      title: 'Retry semantics constraint accepted',
      subject: 'RUN-2409 · Architect Review',
      workspace: 'Compliance Services',
      time: '07:44:56',
      risk: 'High',
      status: 'Recorded',
    },
    {
      id: 'AUD-54991',
      type: 'Permission Escalation',
      title: 'External connector request submitted',
      subject: 'RUN-2421 · Builder Agent',
      workspace: 'Customer Experience Platform',
      time: '07:18:43',
      risk: 'Critical',
      status: 'Pending linked decision',
    },
  ];

  const evidencePack = [
    {
      label: 'Linked Run',
      value: 'RUN-2421',
      detail: 'Full governed run record with phase timeline, agents, approvals, and artifacts.',
    },
    {
      label: 'Policy Basis',
      value: 'GOV-214',
      detail:
        'External connector usage requires explicit human authorization before execution can continue.',
    },
    {
      label: 'Affected Asset',
      value: 'claims-api',
      detail: 'Write scope remained constrained to one repository.',
    },
    {
      label: 'Decision Owner',
      value: 'Security Officer',
      detail: 'Current accountable human owner for approval or rejection.',
    },
  ];

  const artifactLinks = [
    {
      name: 'policy-evaluation-connector.json',
      kind: 'Evidence Artifact',
      state: 'Available',
    },
    {
      name: 'builder-patchset-2421.patch',
      kind: 'Generated Output',
      state: 'Available',
    },
    {
      name: 'run-log-2421.ndjson',
      kind: 'Runtime Log',
      state: 'Available',
    },
    {
      name: 'approval-request-APR-9001.json',
      kind: 'Decision Record',
      state: 'Waiting for resolution',
    },
  ];

  const filters = [
    'All Events',
    'Approvals',
    'Policy',
    'Agents',
    'Contracts',
    'Exceptions',
    'High Risk',
  ];

  const timeline = [
    {
      time: '09:24:11',
      actor: 'Builder Agent',
      event: 'Generated patch proposal against claims-api',
      category: 'Generated Output',
    },
    {
      time: '09:24:26',
      actor: 'Policy Engine',
      event: 'Detected non-standard connector permission request',
      category: 'Policy Evaluation',
    },
    {
      time: '09:24:29',
      actor: 'Governance Control GOV-214',
      event: 'Stopped promotion from Build to Test',
      category: 'Blocking Control',
    },
    {
      time: '09:25:02',
      actor: 'Approval Workflow',
      event: 'Assigned decision to Security Officer',
      category: 'Human Escalation',
    },
    {
      time: '09:25:19',
      actor: 'Run State Machine',
      event: 'Changed run state to Blocked',
      category: 'System State Change',
    },
  ];

  const chainOfCustody = [
    'Created automatically by policy engine at event time',
    'Hash-stamped and linked to run record',
    'Cross-referenced to policy definition and workspace scope',
    'Attached to approval object and immutable audit event',
    'Retained under workspace evidence policy',
  ];

  const metrics = [
    {
      label: 'Audit Events Today',
      value: '148',
      detail: 'Decisions, controls, agent actions, exceptions, and state transitions',
    },
    {
      label: 'Evidence Packs Available',
      value: '93',
      detail: 'Searchable, linked, and exportable for operational or compliance review',
    },
    {
      label: 'Unresolved Critical Events',
      value: '04',
      detail: 'Events awaiting human decision or downstream remediation',
    },
    {
      label: 'Traceability Coverage',
      value: '100%',
      detail: 'All high-risk actions are linked to actor, scope, policy, and evidence',
    },
  ];

  const tabs = [
    'Event Stream',
    'Selected Event',
    'Evidence Pack',
    'Artifacts',
    'Chain of Custody',
    'Exports',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1680px] p-6">
        <header className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Audit Trail / Evidence Explorer
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Reconstructible Decisions, Actions, and Evidence
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                This page should let users reconstruct exactly what happened, who or what acted,
                under which policy and scope, what evidence was produced, and how the event connects
                to runs, approvals, assets, and outcomes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                4 unresolved critical audit events
              </div>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Export Evidence Bundle
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
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
            <div className="ml-auto rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-400">
              Search by run, policy, agent, asset, owner, event ID
            </div>
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
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Event Stream</div>
                <h2 className="mt-2 text-xl font-semibold">Recorded audit events</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Sort by newest
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {filters.map((filter, index) => (
                <button
                  key={filter}
                  className={`rounded-full px-3 py-1 text-xs ${
                    index === 0
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className={`rounded-3xl border p-4 ${
                    index === 0
                      ? 'border-cyan-400/30 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                        {event.id}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">{event.title}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        event.risk === 'Critical'
                          ? 'bg-rose-400/10 text-rose-200'
                          : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {event.risk}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">{event.type}</div>
                  <div className="mt-1 text-xs text-slate-500">{event.subject}</div>
                  <div className="mt-1 text-xs text-slate-500">{event.workspace}</div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{event.status}</span>
                    <span className="text-slate-500">{event.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Selected Event
                </div>
                <h2 className="mt-2 text-xl font-semibold">GOV-214 blocked build promotion</h2>
              </div>
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100">
                Critical
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                ['Event ID', 'AUD-55021'],
                ['Event Type', 'Policy Evaluation'],
                ['Primary Actor', 'Policy Engine'],
                ['Occurred At', '09:24:29'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</div>
                  <div className="mt-2 text-sm font-medium text-slate-100">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Event narrative
              </div>
              <div className="mt-3 text-sm text-slate-300">
                During Build execution for RUN-2421, the policy engine detected a request for
                non-standard connector usage. Governance control GOV-214 stopped promotion to Test,
                created a high-risk audit record, attached evidence, and routed the decision to the
                responsible Security Officer.
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {evidencePack.map((item) => (
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

            <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
              <div className="text-sm font-medium text-amber-200">Audit page design principle</div>
              <div className="mt-2 text-sm text-amber-100/80">
                Audit should not mean raw log overload. The page must turn evidence into a usable
                reconstruction of events, ownership, rationale, and consequences.
              </div>
            </div>
          </div>

          <div className="col-span-3 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Artifact Links</div>
              <h2 className="mt-2 text-xl font-semibold">Attached evidence objects</h2>
            </div>

            <div className="mt-4 space-y-3">
              {artifactLinks.map((artifact) => (
                <div
                  key={artifact.name}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="text-sm font-medium text-slate-100">{artifact.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{artifact.kind}</div>
                  <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                    {artifact.state}
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
                  Event Timeline
                </div>
                <h2 className="mt-2 text-xl font-semibold">Step-by-step reconstruction</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open correlated events
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {timeline.map((item, index) => (
                <div
                  key={`${item.time}-${item.event}`}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm text-cyan-200">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{item.event}</div>
                        <div className="mt-1 text-xs text-slate-400">{item.actor}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{item.time}</div>
                        <div className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300 inline-block">
                          {item.category}
                        </div>
                      </div>
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
                  Chain of Custody
                </div>
                <h2 className="mt-2 text-xl font-semibold">Evidence integrity</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Verify integrity
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {chainOfCustody.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm text-cyan-200">
                    {index + 1}
                  </div>
                  <div className="text-sm text-slate-300">{step}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Why this matters
              </div>
              <div className="mt-3 text-sm text-slate-300">
                In a governed SDLC, evidence is not only for compliance. It is operational
                infrastructure for explaining, defending, reviewing, and improving automated
                decisions.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
