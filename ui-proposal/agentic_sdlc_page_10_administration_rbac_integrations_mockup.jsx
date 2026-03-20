export default function AgenticSDLCAdministrationRBACIntegrationsMockup() {
  const metrics = [
    {
      label: 'Active Roles',
      value: '14',
      detail: 'Platform, workspace, approval, audit, and runtime authority roles',
    },
    {
      label: 'Connected Integrations',
      value: '09',
      detail: 'Source control, pipelines, MCP, identity, notifications, telemetry',
    },
    {
      label: 'Privileged Scopes',
      value: '06',
      detail: 'Scopes requiring explicit governance review and periodic recertification',
    },
    {
      label: 'Pending Access Reviews',
      value: '03',
      detail: 'Role recertification and connector permission renewals',
    },
  ];

  const roles = [
    {
      name: 'Platform Administrator',
      scope: 'Global',
      members: 2,
      privileges: 'Full platform configuration, connectors, policy lifecycle',
      status: 'High Privilege',
    },
    {
      name: 'Workspace Governor',
      scope: 'Workspace',
      members: 6,
      privileges: 'Workspace policy, approvals, runtime boundaries, evidence retention',
      status: 'Privileged',
    },
    {
      name: 'Release Approver',
      scope: 'Workspace',
      members: 4,
      privileges: 'Production promotion approvals and deployment gating',
      status: 'Privileged',
    },
    {
      name: 'Audit Reviewer',
      scope: 'Read-only',
      members: 8,
      privileges: 'Audit, evidence, traceability, export access',
      status: 'Controlled',
    },
    {
      name: 'Agent Maintainer',
      scope: 'Platform',
      members: 3,
      privileges: 'Agent definitions, prompts, contracts, validation workflows',
      status: 'Privileged',
    },
  ];

  const selectedRolePermissions = [
    {
      label: 'Policy Management',
      value: 'Allowed',
      detail: 'Can create, modify, stage, and submit policy changes for approval.',
    },
    {
      label: 'Approval Override',
      value: 'Constrained',
      detail: 'Emergency override requires justification and dual-control logging.',
    },
    {
      label: 'Connector Administration',
      value: 'Denied',
      detail: 'Global integration settings remain limited to Platform Administrators.',
    },
    {
      label: 'Evidence Export',
      value: 'Allowed',
      detail: 'Workspace-bounded export with retention and disclosure policy enforcement.',
    },
  ];

  const integrations = [
    {
      name: 'GitHub Enterprise',
      type: 'Source Control',
      trust: 'Trusted',
      scope: 'Workspace repos',
      status: 'Connected',
    },
    {
      name: 'Azure DevOps Pipelines',
      type: 'CI/CD',
      trust: 'Trusted',
      scope: 'Build and release orchestration',
      status: 'Connected',
    },
    {
      name: 'Microsoft Entra ID',
      type: 'Identity',
      trust: 'Critical',
      scope: 'Authentication, RBAC, approval identity',
      status: 'Connected',
    },
    {
      name: 'External MCP Connector Hub',
      type: 'Tooling',
      trust: 'High Risk',
      scope: 'Runtime tool expansion',
      status: 'Restricted',
    },
    {
      name: 'Datadog',
      type: 'Telemetry',
      trust: 'Trusted',
      scope: 'Operational metrics and alerting',
      status: 'Connected',
    },
  ];

  const accessReviews = [
    {
      id: 'AR-301',
      title: 'Quarterly recertification for Workspace Governors',
      owner: 'IAM Administrator',
      due: '2026-03-22',
      state: 'Pending',
    },
    {
      id: 'AR-298',
      title: 'Review privileged connector scopes for External MCP Hub',
      owner: 'Security Officer',
      due: '2026-03-21',
      state: 'Urgent',
    },
    {
      id: 'AR-294',
      title: 'Validate audit export permissions for compliance workspace',
      owner: 'Compliance Lead',
      due: '2026-03-24',
      state: 'Scheduled',
    },
  ];

  const adminGuidance = [
    'RBAC must be understandable in operational terms, not only in raw permission names.',
    'Every integration must clearly show trust level, scope, and blast radius.',
    'Privileged actions require recertification, traceability, and justification.',
    'Administration should expose boundaries, not hide them in nested settings.',
  ];

  const tabs = [
    'Overview',
    'Roles',
    'Permissions',
    'Integrations',
    'Access Reviews',
    'Tenancy',
    'Security',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1680px] p-6">
        <header className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Administration / RBAC / Integrations
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Authority, Trust Boundaries, and Platform Control
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-400">
                This page should make enterprise control explicit. Users must be able to see who has
                authority, what each role can do, which integrations are connected, where privilege
                is concentrated, and which trust boundaries require review before the platform can
                safely scale.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                3 access reviews need action
              </div>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/30">
                Open Security Administration
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
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Role Model</div>
                <h2 className="mt-2 text-xl font-semibold">Administrative roles</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Filter by scope
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {roles.map((role, index) => (
                <div
                  key={role.name}
                  className={`rounded-3xl border p-4 ${
                    index === 1
                      ? 'border-cyan-400/30 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{role.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {role.scope} scope · {role.members} members
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        role.status === 'High Privilege'
                          ? 'bg-rose-400/10 text-rose-200'
                          : role.status === 'Privileged'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-cyan-400/10 text-cyan-200'
                      }`}
                    >
                      {role.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">{role.privileges}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Selected Role
                </div>
                <h2 className="mt-2 text-xl font-semibold">Workspace Governor</h2>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
                Privileged
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                ['Role Scope', 'Workspace'],
                ['Members', '6 assigned'],
                ['Primary Domain', 'Governance and approvals'],
                ['Recertification', 'Quarterly'],
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
                Workspace Governors control policy application, approval routing, evidence retention
                posture, and workspace runtime boundaries, but do not own global integration trust
                settings or platform-wide identity configuration.
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {selectedRolePermissions.map((item) => (
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
              <div className="text-sm font-medium text-amber-200">
                Administration page design principle
              </div>
              <div className="mt-2 text-sm text-amber-100/80">
                Admin UX must make privilege understandable in business and operational language.
                Users should be able to see not only what is allowed, but why the boundary exists
                and what the blast radius would be if misused.
              </div>
            </div>
          </div>

          <div className="col-span-3 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Administrative Guidance
              </div>
              <h2 className="mt-2 text-xl font-semibold">Control expectations</h2>
            </div>

            <div className="mt-4 space-y-3">
              {adminGuidance.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-7 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Integrations</div>
                <h2 className="mt-2 text-xl font-semibold">Connected systems and trust posture</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Add integration
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{integration.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{integration.type}</div>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          integration.trust === 'Critical'
                            ? 'bg-rose-400/10 text-rose-200'
                            : integration.trust === 'High Risk'
                              ? 'bg-amber-400/10 text-amber-200'
                              : 'bg-cyan-400/10 text-cyan-200'
                        }`}
                      >
                        {integration.trust}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          integration.status === 'Connected'
                            ? 'bg-emerald-400/10 text-emerald-200'
                            : 'bg-rose-400/10 text-rose-200'
                        }`}
                      >
                        {integration.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                    <div className="text-xs text-slate-500">Operational Scope</div>
                    <div className="mt-1 text-sm text-slate-300">{integration.scope}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Access Reviews
                </div>
                <h2 className="mt-2 text-xl font-semibold">Recertification queue</h2>
              </div>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                Open review workflow
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {accessReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                        {review.id}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">{review.title}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        review.state === 'Urgent'
                          ? 'bg-rose-400/10 text-rose-200'
                          : review.state === 'Pending'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-cyan-400/10 text-cyan-200'
                      }`}
                    >
                      {review.state}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">Owner: {review.owner}</div>
                  <div className="mt-1 text-xs text-slate-500">Due: {review.due}</div>
                  <div className="mt-4 flex gap-2">
                    <button className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-950">
                      Review
                    </button>
                    <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                      Escalate
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
