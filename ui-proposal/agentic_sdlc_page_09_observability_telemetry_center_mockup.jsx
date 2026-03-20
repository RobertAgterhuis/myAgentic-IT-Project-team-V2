export default function AgenticSDLCObservabilityTelemetryCenterMockup() {
  const kpis = [
    {
      label: 'Run Success Rate',
      value: '92.4%',
      detail: 'Across all governed runs in the last 24 hours',
    },
    {
      label: 'Median Approval Latency',
      value: '18m',
      detail: 'Time between escalation and human decision',
    },
    {
      label: 'Agent Runtime Health',
      value: '9 / 11 Healthy',
      detail: '2 agents require intervention or inspection',
    },
    {
      label: 'Policy Trigger Rate',
      value: '17',
      detail: 'Blocking and escalating controls triggered today',
    },
  ];

  const runSignals = [
    {
      title: 'Runs entering blocked state',
      value: '03',
      trend: '+1 vs yesterday',
      note: 'Mostly caused by approval wait time and connector requests',
    },
    {
      title: 'Build-to-test progression time',
      value: '14m',
      trend: '-3m improvement',
      note: 'Improved after recent contract baseline cleanup',
    },
    {
      title: 'Failed validation gates',
      value: '05',
      trend: '+2 vs yesterday',
      note: 'Two failures linked to integration coverage regression',
    },
  ];

  const agentHealth = [
    {
      name: 'Planner',
      status: 'Healthy',
      latency: '1.2s',
      errors: '0',
      queue: 'Low',
    },
    {
      name: 'Architect',
      status: 'Healthy',
      latency: '2.4s',
      errors: '1',
      queue: 'Moderate',
    },
    {
      name: 'Builder',
      status: 'Restricted',
      latency: '3.1s',
      errors: '0',
      queue: 'High',
    },
    {
      name: 'Tester',
      status: 'Degraded',
      latency: '6.8s',
      errors: '4',
      queue: 'High',
    },
    {
      name: 'Security',
      status: 'Healthy',
      latency: '1.7s',
      errors: '0',
      queue: 'Low',
    },
  ];

  const alerts = [
    {
      severity: 'Critical',
      title: 'Approval backlog is increasing for high-risk runs',
      detail: 'Three critical decisions are now within breach window for response SLA.',
    },
    {
      severity: 'High',
      title: 'Tester Agent error rate exceeded normal baseline',
      detail: 'Runtime retries increased after new test harness configuration.',
    },
    {
      severity: 'Medium',
      title: 'Policy GOV-214 triggers trending upward',
      detail: 'Connector-related escalations increased after Builder contract update.',
    },
  ];

  const telemetryStreams = [
    {
      name: 'Run State Events',
      volume: '48k/day',
      retention: '90 days',
      health: 'Ingesting',
    },
    {
      name: 'Agent Runtime Metrics',
      volume: '1.2M/day',
      retention: '30 days',
      health: 'Ingesting',
    },
    {
      name: 'Policy Evaluation Logs',
      volume: '210k/day',
      retention: '180 days',
      health: 'Ingesting',
    },
    {
      name: 'Approval Workflow Events',
      volume: '12k/day',
      retention: '365 days',
      health: 'Delayed',
    },
  ];

  const tabs = ['Overview', 'Runs', 'Agents', 'Policies', 'Alerts', 'Streams', 'SLOs'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1680px] p-6">
        <header className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Observability / Telemetry Center
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Operational Health, Trends, and Runtime Signals
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                This page should show whether the governed SDLC control plane is healthy, where
                friction is accumulating, how agents behave over time, which policies are driving
                outcomes, and where operators need to intervene before reliability degrades.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                2 telemetry areas require intervention
              </div>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Open Alert Triage
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
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20"
            >
              <div className="text-sm text-slate-400">{kpi.label}</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight">{kpi.value}</div>
              <div className="mt-2 text-sm text-slate-500">{kpi.detail}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Run Health</div>
                <h2 className="mt-2 text-xl font-semibold">Operational trend board</h2>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
                Last 24 hours · auto-refresh enabled
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {runSignals.map((signal) => (
                <div
                  key={signal.title}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <div className="text-sm text-slate-400">{signal.title}</div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">
                    {signal.value}
                  </div>
                  <div className="mt-2 text-sm text-cyan-300">{signal.trend}</div>
                  <div className="mt-3 text-sm text-slate-500">{signal.note}</div>
                  <div className="mt-4 h-2 rounded-full bg-white/10">
                    <div className="h-2 w-2/3 rounded-full bg-cyan-400" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    Telemetry Story
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-100">
                    Why the platform is slowing down
                  </div>
                </div>
                <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                  Open correlation view
                </button>
              </div>
              <div className="mt-3 text-sm text-slate-300">
                The platform currently shows increasing friction around high-risk approvals and a
                degraded Tester Agent. The UI should connect these signals rather than forcing
                operators to infer causality from separate dashboards.
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
                {['Approval Latency', 'Blocked Runs', 'Agent Errors', 'Policy Triggers'].map(
                  (label) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-center text-slate-300"
                    >
                      {label}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="col-span-4 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Alert Triage</div>
                <h2 className="mt-2 text-xl font-semibold">Current alerts</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Mute rules
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-slate-100">{alert.title}</div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        alert.severity === 'Critical'
                          ? 'bg-rose-400/10 text-rose-200'
                          : alert.severity === 'High'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-cyan-400/10 text-cyan-200'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-500">{alert.detail}</div>
                  <div className="mt-4 flex gap-2">
                    <button className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-950">
                      Investigate
                    </button>
                    <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                      Route
                    </button>
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
                  Agent Runtime Health
                </div>
                <h2 className="mt-2 text-xl font-semibold">Fleet status</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                View detailed metrics
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {agentHealth.map((agent) => (
                <div
                  key={agent.name}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{agent.name}</div>
                      <div className="mt-1 text-xs text-slate-500">Runtime telemetry</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        agent.status === 'Healthy'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : agent.status === 'Restricted'
                            ? 'bg-rose-400/10 text-rose-200'
                            : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Latency</div>
                      <div className="mt-1 text-slate-200">{agent.latency}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Errors</div>
                      <div className="mt-1 text-slate-200">{agent.errors}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                      <div className="text-xs text-slate-500">Queue</div>
                      <div className="mt-1 text-slate-200">{agent.queue}</div>
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
                  Telemetry Streams
                </div>
                <h2 className="mt-2 text-xl font-semibold">Signal ingestion posture</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Inspect pipelines
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {telemetryStreams.map((stream) => (
                <div
                  key={stream.name}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{stream.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {stream.volume} · retention {stream.retention}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        stream.health === 'Ingesting'
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {stream.health}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
              <div className="text-sm font-medium text-amber-200">
                Observability page design principle
              </div>
              <div className="mt-2 text-sm text-amber-100/80">
                Observability must connect business flow, governance friction, and runtime health.
                The page should explain not just what is red, but why the platform is trending
                toward operator intervention.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
