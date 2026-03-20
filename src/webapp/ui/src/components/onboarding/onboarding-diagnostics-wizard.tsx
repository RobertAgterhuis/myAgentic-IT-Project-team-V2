/**
 * OnboardingDiagnosticsWizard — guided first-run diagnostics for setup readiness.
 */
import { useCallback, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading, Text } from '@/components/ui/typography';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Spinner } from '@/components/ui/spinner';
import { useGateDiagnostics, useOnboardingDiagnostics } from '@/hooks';
import type { OnboardingDiagnosticsResponse } from '@/lib/api-types';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Download,
  X,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';

interface WizardStep {
  title: string;
  description: string;
}

const STEPS: WizardStep[] = [
  {
    title: 'Detect your runtime profile',
    description: 'Confirm the environment profile and its startup behavior before you run.',
  },
  {
    title: 'Validate setup requirements',
    description: 'Review the profile-specific checklist and resolve any blockers.',
  },
  {
    title: 'Troubleshoot and export',
    description: 'Collect errors, remediation hints, and an exportable diagnostics report.',
  },
];

const STATUS_BADGE: Record<
  'ok' | 'warning' | 'error',
  { label: string; variant: 'success' | 'warning' | 'error' }
> = {
  ok: { label: 'Ready', variant: 'success' },
  warning: { label: 'Review', variant: 'warning' },
  error: { label: 'Blocked', variant: 'error' },
};

function isTrustProxyExplicit(value: OnboardingDiagnosticsResponse['environment']['trustProxy']) {
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower !== 'true' && lower !== 'false' && value.trim().length > 0;
  }
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function buildChecklist(data: OnboardingDiagnosticsResponse) {
  const { contract, environment } = data;
  const storageAllowed = contract.storageProvider.allowedValues.includes(
    environment.storageProvider
  );
  const queueAllowed = contract.queueProvider.allowedValues.includes(environment.queueProvider);
  const sessionAllowed = contract.sessionStore.allowedValues.includes(environment.sessionStore);

  const storageStatus = storageAllowed ? 'ok' : 'error';
  const queueStatus = queueAllowed ? 'ok' : contract.queueProvider.required ? 'error' : 'warning';
  const sessionStatus = sessionAllowed
    ? 'ok'
    : contract.sessionStore.required
      ? 'error'
      : 'warning';
  const redisStatus = contract.redis.required
    ? environment.redisConfigured
      ? 'ok'
      : 'error'
    : environment.redisConfigured
      ? 'ok'
      : 'warning';
  const authStatus = contract.auth.required
    ? environment.authConfigured
      ? 'ok'
      : 'error'
    : environment.authConfigured
      ? 'ok'
      : 'warning';
  const trustProxyStatus = contract.trustProxy.required
    ? isTrustProxyExplicit(environment.trustProxy)
      ? 'ok'
      : 'error'
    : 'ok';

  return [
    {
      id: 'storage-provider',
      label: 'Storage provider',
      detail: `Using ${environment.storageProvider}. Recommended: ${contract.storageProvider.recommended}.`,
      hint: `Allowed: ${contract.storageProvider.allowedValues.join(', ')}.`,
      status: storageStatus,
    },
    {
      id: 'queue-provider',
      label: 'Queue provider',
      detail: `Using ${environment.queueProvider}. Recommended: ${contract.queueProvider.recommended}.`,
      hint: `Allowed: ${contract.queueProvider.allowedValues.join(', ')}.`,
      status: queueStatus,
    },
    {
      id: 'session-store',
      label: 'Session store',
      detail: `Using ${environment.sessionStore}. Recommended: ${contract.sessionStore.recommended}.`,
      hint: `Allowed: ${contract.sessionStore.allowedValues.join(', ')}.`,
      status: sessionStatus,
    },
    {
      id: 'redis',
      label: 'Redis connectivity',
      detail: contract.redis.description,
      hint: environment.redisConfigured
        ? 'REDIS_URL is configured.'
        : 'REDIS_URL is not configured.',
      status: redisStatus,
    },
    {
      id: 'auth',
      label: 'Authentication',
      detail: contract.auth.description,
      hint: environment.authConfigured
        ? 'Auth credentials are configured.'
        : 'No auth credentials detected.',
      status: authStatus,
    },
    {
      id: 'trust-proxy',
      label: 'Trust proxy',
      detail: contract.trustProxy.description,
      hint: `TRUST_PROXY=${String(environment.trustProxy)}.`,
      status: trustProxyStatus,
    },
  ];
}

function getRemediationHints(data: OnboardingDiagnosticsResponse) {
  const { validation } = data;
  const hints: string[] = [];

  for (const err of validation.errors) {
    if (err.includes('STORAGE_PROVIDER')) {
      hints.push('Set STORAGE_PROVIDER to an allowed value and verify STORAGE_PATH for sqlite.');
    }
    if (err.includes('QUEUE_PROVIDER')) {
      hints.push('Align QUEUE_PROVIDER with the profile (memory, persistent, or bullmq).');
    }
    if (err.includes('SESSION_STORE')) {
      hints.push('Set SESSION_STORE to sqlite or redis based on the target profile.');
    }
    if (err.includes('REDIS_URL')) {
      hints.push('Set REDIS_URL and confirm Redis is reachable from the host.');
    }
    if (err.includes('authentication')) {
      hints.push('Provide GITHUB_CLIENT_ID/SECRET or an API_KEY (24+ chars).');
    }
    if (err.includes('TRUST_PROXY')) {
      hints.push('Set TRUST_PROXY to a hop count or explicit proxy IP list (never true).');
    }
    if (err.includes('Partial distributed config')) {
      hints.push('Keep QUEUE_PROVIDER=bullmq, SESSION_STORE=redis, and REDIS_URL together.');
    }
  }

  return Array.from(new Set(hints));
}

interface OnboardingDiagnosticsWizardProps {
  sessionId?: string | null;
  onDismiss: () => void;
}

export function OnboardingDiagnosticsWizard({
  sessionId,
  onDismiss,
}: OnboardingDiagnosticsWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { data, isLoading, error } = useOnboardingDiagnostics();
  const { data: gateDiagnostics } = useGateDiagnostics(sessionId ?? '');

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  const checklist = useMemo(() => (data ? buildChecklist(data) : []), [data]);
  const remediationHints = useMemo(() => (data ? getRemediationHints(data) : []), [data]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onDismiss();
      return;
    }
    setCurrentStep((s) => s + 1);
  }, [isLast, onDismiss]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const handleExport = useCallback(() => {
    if (!data) return;
    const report = {
      generatedAt: new Date().toISOString(),
      diagnostics: data,
      gateDiagnostics: gateDiagnostics ?? null,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `onboarding-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, gateDiagnostics]);

  if (isLoading) {
    return (
      <Card elevation="raised" className="p-6">
        <Spinner label="Loading onboarding diagnostics…" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <AlertBanner variant="error">
        Failed to load onboarding diagnostics: {(error as Error | null)?.message ?? 'Unknown error'}
      </AlertBanner>
    );
  }

  return (
    <div role="dialog" aria-label="Onboarding diagnostics wizard" aria-modal="false">
      <Card elevation="raised" className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text muted className="text-xs">
              Step {currentStep + 1} of {STEPS.length}
            </Text>
            <Heading level={2} className="mt-1">
              {step.title}
            </Heading>
            <Text muted className="text-sm mt-1">
              {step.description}
            </Text>
          </div>
          <button
            type="button"
            aria-label="Dismiss diagnostics wizard"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {currentStep === 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Profile</Badge>
                <Badge variant="info">{data.profile}</Badge>
              </div>
              <div className="mt-3 text-sm font-medium">{data.contract.name}</div>
              <Text muted className="mt-1 text-xs">
                {data.contract.description}
              </Text>
              <div className="mt-3 text-xs text-muted-foreground">
                Startup: {data.contract.startupBehavior}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2">
                <Badge variant={data.validation.valid ? 'success' : 'error'}>
                  {data.validation.valid ? 'Ready' : 'Issues detected'}
                </Badge>
                <Badge variant="outline">{data.environment.nodeEnv}</Badge>
              </div>
              <Text muted className="mt-2 text-xs">
                Host: {data.environment.host}
              </Text>
              <Text muted className="mt-1 text-xs">
                Storage: {data.environment.storageProvider} • Queue:{' '}
                {data.environment.queueProvider}
              </Text>
              <Text muted className="mt-1 text-xs">
                Session store: {data.environment.sessionStore}
              </Text>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="mt-6 space-y-3">
            {checklist.map((item) => {
              const status = STATUS_BADGE[item.status as 'ok' | 'warning' | 'error'];
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{item.label}</div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <Text muted className="mt-2 text-xs">
                    {item.detail}
                  </Text>
                  <Text muted className="mt-1 text-xs">
                    {item.hint}
                  </Text>
                </div>
              );
            })}
          </div>
        )}

        {currentStep === 2 && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="size-4 text-warning" /> Startup blockers
              </div>
              {data.validation.errors.length === 0 ? (
                <Text muted className="mt-2 text-xs">
                  No blocking errors detected.
                </Text>
              ) : (
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                  {data.validation.errors.map((errorItem) => (
                    <li key={errorItem}>{errorItem}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="size-4 text-info" /> Remediation hints
              </div>
              {remediationHints.length === 0 ? (
                <Text muted className="mt-2 text-xs">
                  No remediation hints available.
                </Text>
              ) : (
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                  {remediationHints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="size-4 text-success" /> Gate diagnostics
              </div>
              {!gateDiagnostics ? (
                <Text muted className="mt-2 text-xs">
                  No gate diagnostics available yet.
                </Text>
              ) : gateDiagnostics.totalFailures === 0 ? (
                <Text muted className="mt-2 text-xs">
                  No gate failures recorded for this session.
                </Text>
              ) : (
                <Text muted className="mt-2 text-xs">
                  {gateDiagnostics.totalFailures} gate failure(s). Latest:{' '}
                  {gateDiagnostics.latest?.description}
                </Text>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Text muted className="text-xs">
                Export a JSON report for sharing or support.
              </Text>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="size-3 mr-1.5" /> Export report
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} disabled={isFirst}>
            <ArrowLeft className="size-3 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={handleNext}>
            {isLast ? 'Finish' : 'Next'}
            <ArrowRight className="size-3 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
