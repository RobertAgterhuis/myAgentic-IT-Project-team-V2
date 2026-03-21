import type { Meta, StoryObj } from '@storybook/react-vite';

function Chip({
  label,
  variableClass,
  variable,
}: {
  label: string;
  variableClass: string;
  variable: string;
}) {
  return (
    <div className="surface-elevated rounded-sm border border-border/70 p-3">
      <div className="text-caption-sm uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className={`size-6 rounded-full border border-border/60 ${variableClass}`} />
        <code className="text-body-sm text-foreground">{variable}</code>
      </div>
    </div>
  );
}

const meta = {
  title: 'Foundations/SemanticTokens',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatusAndRisk: Story = {
  render: () => (
    <div className="space-stack-lg">
      <section className="space-stack-sm">
        <h2 className="text-heading-md font-semibold">Status Tokens</h2>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Chip
            label="Online"
            variable="--status-online"
            variableClass="bg-[var(--status-online)]"
          />
          <Chip
            label="Running"
            variable="--status-running"
            variableClass="bg-[var(--status-running)]"
          />
          <Chip
            label="Paused"
            variable="--status-paused"
            variableClass="bg-[var(--status-paused)]"
          />
          <Chip
            label="Failed"
            variable="--status-failed"
            variableClass="bg-[var(--status-failed)]"
          />
          <Chip
            label="Pending"
            variable="--status-pending"
            variableClass="bg-[var(--status-pending)]"
          />
        </div>
      </section>

      <section className="space-stack-sm">
        <h2 className="text-heading-md font-semibold">Risk Tokens</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Chip label="Low" variable="--risk-low" variableClass="bg-[var(--risk-low)]" />
          <Chip label="Medium" variable="--risk-medium" variableClass="bg-[var(--risk-medium)]" />
          <Chip label="High" variable="--risk-high" variableClass="bg-[var(--risk-high)]" />
          <Chip
            label="Critical"
            variable="--risk-critical"
            variableClass="bg-[var(--risk-critical)]"
          />
        </div>
      </section>
    </div>
  ),
};

export const TypographyRolesAndMotion: Story = {
  render: () => (
    <div className="space-stack-lg">
      <section className="surface-elevated space-stack-md rounded-md border border-border/70 p-5">
        <h2 className="text-heading-xl font-semibold">Heading XL Role</h2>
        <p className="text-heading-lg">Heading LG Role</p>
        <p className="text-heading-md">Heading MD Role</p>
        <p className="text-body-md text-muted-foreground">
          Body MD role for primary explanatory copy.
        </p>
        <p className="text-body-sm text-muted-foreground">
          Body SM role for dense operational detail.
        </p>
        <p className="text-caption-sm uppercase tracking-[0.08em] text-muted-foreground">
          Caption SM role for labels and metadata
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="motion-fade-in surface-elevated rounded-md border border-border/70 p-4">
          <h3 className="text-heading-md font-semibold">motion-fade-in</h3>
          <p className="mt-2 text-body-sm text-muted-foreground">
            Entrance animation follows tokenized duration/easing and respects reduced-motion
            preferences.
          </p>
        </div>
        <button
          type="button"
          className="motion-transition-base rounded-sm border border-border/70 bg-card px-4 py-3 text-left hover:-translate-y-0.5 hover:border-info/50"
        >
          <h3 className="text-heading-md font-semibold">motion-transition-base</h3>
          <p className="mt-2 text-body-sm text-muted-foreground">
            Hover uses shared timing/easing tokens.
          </p>
        </button>
      </section>
    </div>
  ),
};

export const ContrastRequirements: Story = {
  render: () => (
    <div className="space-stack-lg">
      <section className="surface-elevated space-stack-sm rounded-md border border-border/70 p-5">
        <h2 className="text-heading-md font-semibold">Contrast Requirements</h2>
        <p className="text-body-sm text-muted-foreground">
          Text-on-surface and semantic badge combinations should meet WCAG AA targets: 4.5:1 for
          standard text and 3:1 for large text (18px+ or 14px+ bold).
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-elevated space-stack-sm rounded-md border border-border/70 p-4">
          <h3 className="text-body-md font-semibold">Surface Text Pairing</h3>
          <div className="rounded-sm border border-border/70 bg-card p-3 text-body-sm text-foreground">
            Foreground on Card Surface (target: AA 4.5:1)
          </div>
          <p className="text-caption-sm uppercase tracking-[0.08em] text-muted-foreground">
            Variables: --color-card + --color-foreground
          </p>
        </div>

        <div className="surface-elevated space-stack-sm rounded-md border border-border/70 p-4">
          <h3 className="text-body-md font-semibold">Muted Text Pairing</h3>
          <div className="rounded-sm border border-border/70 bg-background p-3 text-body-sm text-muted-foreground">
            Muted foreground on app background is for secondary detail only.
          </div>
          <p className="text-caption-sm uppercase tracking-[0.08em] text-muted-foreground">
            Variables: --color-background + --color-muted-foreground
          </p>
        </div>

        <div className="surface-elevated space-stack-sm rounded-md border border-border/70 p-4">
          <h3 className="text-body-md font-semibold">Semantic Status Chip</h3>
          <div className="inline-flex items-center rounded-pill bg-(--status-running) px-3 py-1 text-body-sm text-(--color-info-foreground)">
            Running
          </div>
          <p className="text-caption-sm uppercase tracking-[0.08em] text-muted-foreground">
            Variables: --status-running + --color-info-foreground
          </p>
        </div>

        <div className="surface-elevated space-stack-sm rounded-md border border-border/70 p-4">
          <h3 className="text-body-md font-semibold">Semantic Risk Chip</h3>
          <div className="inline-flex items-center rounded-pill bg-(--risk-critical) px-3 py-1 text-body-sm text-(--color-destructive-foreground)">
            Critical risk
          </div>
          <p className="text-caption-sm uppercase tracking-[0.08em] text-muted-foreground">
            Variables: --risk-critical + --color-destructive-foreground
          </p>
        </div>
      </section>
    </div>
  ),
};
