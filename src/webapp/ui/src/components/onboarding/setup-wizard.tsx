/**
 * SetupWizard — one-time post-login wizard guiding GitHub OAuth
 * and Entra App Registration configuration with skip/resume.
 * Issue #1570 — priority:critical
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heading, Text } from '@/components/ui/typography';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Github,
  Building2,
  Rocket,
  SkipForward,
  X,
} from 'lucide-react';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface EnvSaveResponse {
  ok: boolean;
  created: boolean;
  updated: string[];
  path: string;
}

function GithubStepContent() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
      <li>
        Open{' '}
        <a
          href="https://github.com/settings/developers"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline inline-flex items-center gap-1"
        >
          GitHub Developer Settings <ExternalLink className="size-3" />
        </a>{' '}
        and create an <strong>OAuth App</strong>.
      </li>
      <li>
        Set the <strong>Authorization callback URL</strong> to:{' '}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">{origin}/api/auth/callback</code>
      </li>
      <li>
        Copy <strong>Client ID</strong> and <strong>Client Secret</strong> into your server{' '}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">.env</code> file:
      </li>
      <div className="ml-4 p-2 bg-muted rounded text-xs font-mono space-y-1">
        <div>GITHUB_CLIENT_ID=your_client_id</div>
        <div>GITHUB_CLIENT_SECRET=your_client_secret</div>
        <div>AUTH_CALLBACK_URL={origin}</div>
      </div>
      <li>Restart the backend service to load the new variables.</li>
    </ol>
  );
}

function EntraStepContent() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
      <li>
        Open{' '}
        <a
          href="https://entra.microsoft.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline inline-flex items-center gap-1"
        >
          Microsoft Entra Admin Center <ExternalLink className="size-3" />
        </a>{' '}
        and create an <strong>App Registration</strong>.
      </li>
      <li>
        Add a <strong>Web redirect URI</strong>:{' '}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">
          {origin}/api/auth/entra/callback
        </code>
      </li>
      <li>
        In <strong>Certificates & secrets</strong>, create a client secret and copy the value.
      </li>
      <li>
        Add to your server <code className="bg-muted px-1 py-0.5 rounded text-xs">.env</code> file:
      </li>
      <div className="ml-4 p-2 bg-muted rounded text-xs font-mono space-y-1">
        <div>ENTRA_CLIENT_ID=your_entra_client_id</div>
        <div>ENTRA_TENANT_ID=your_tenant_id_or_common</div>
        <div>ENTRA_CLIENT_SECRET=your_entra_secret</div>
        <div>ENTRA_REDIRECT_URI={origin}/api/auth/entra/callback</div>
      </div>
      <li>Restart the backend so the Entra provider initializes.</li>
    </ol>
  );
}

function FinishStepContent() {
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <p>Your platform setup is complete. You can always reconfigure later from Administration.</p>
      <ul className="list-disc list-inside space-y-1">
        <li>GitHub OAuth enables developer sign-in and repository access.</li>
        <li>Microsoft Entra enables enterprise SSO for your organization.</li>
        <li>
          Run <strong>Validate Configuration</strong> on the login page to confirm both providers.
        </li>
      </ul>
    </div>
  );
}

const STEPS: SetupStep[] = [
  {
    id: 'welcome',
    title: 'Platform Setup',
    description:
      'Configure authentication providers so your team can sign in. ' +
      'You can skip any step and return later.',
    icon: <Rocket className="size-8 text-blue-500" />,
    content: (
      <Text muted className="text-sm">
        This wizard walks you through setting up GitHub OAuth and Microsoft Entra (Azure AD) for
        your Agentic SDLC platform. Each step provides copy-paste instructions.
      </Text>
    ),
  },
  {
    id: 'github',
    title: 'GitHub OAuth App',
    description: 'Create and configure a GitHub OAuth application for developer sign-in.',
    icon: <Github className="size-8 text-foreground" />,
    content: <GithubStepContent />,
  },
  {
    id: 'entra',
    title: 'Microsoft Entra (Optional)',
    description: 'Set up enterprise single sign-on with Microsoft Entra ID.',
    icon: <Building2 className="size-8 text-blue-600" />,
    content: <EntraStepContent />,
  },
  {
    id: 'finish',
    title: 'All Set!',
    description: 'Your authentication providers are configured.',
    icon: <CheckCircle className="size-8 text-green-500" />,
    content: <FinishStepContent />,
  },
];

interface SetupWizardProps {
  initialStep?: number;
  onComplete: () => void;
  onSkip: () => void;
  onStepChange: (step: number) => void;
}

export function SetupWizard({
  initialStep = 0,
  onComplete,
  onSkip,
  onStepChange,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [envValues, setEnvValues] = useState({
    githubClientId: '',
    githubClientSecret: '',
    authCallbackUrl: '',
    entraClientId: '',
    entraTenantId: '',
    entraClientSecret: '',
    entraRedirectUri: '',
  });
  const [saveState, setSaveState] = useState<{
    type: 'idle' | 'saving' | 'success' | 'error';
    message: string;
  }>({
    type: 'idle',
    message: '',
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  useEffect(() => {
    triggerRef.current = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    setEnvValues((prev) => ({
      ...prev,
      authCallbackUrl: prev.authCallbackUrl || origin,
      entraRedirectUri: prev.entraRedirectUri || `${origin}/api/auth/entra/callback`,
    }));
  }, []);

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialog!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  const goTo = useCallback(
    (next: number) => {
      setCurrentStep(next);
      onStepChange(next);
    },
    [onStepChange]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      goTo(currentStep + 1);
    }
  }, [isLast, onComplete, goTo, currentStep]);

  const handleBack = useCallback(() => {
    goTo(Math.max(0, currentStep - 1));
  }, [goTo, currentStep]);

  const updateEnvValue = useCallback((key: keyof typeof envValues, value: string) => {
    setEnvValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveEnv = useCallback(
    async (kind: 'github' | 'entra') => {
      setSaveState({ type: 'saving', message: '' });

      const values =
        kind === 'github'
          ? {
              GITHUB_CLIENT_ID: envValues.githubClientId,
              GITHUB_CLIENT_SECRET: envValues.githubClientSecret,
              AUTH_CALLBACK_URL: envValues.authCallbackUrl,
            }
          : {
              ENTRA_CLIENT_ID: envValues.entraClientId,
              ENTRA_TENANT_ID: envValues.entraTenantId,
              ENTRA_CLIENT_SECRET: envValues.entraClientSecret,
              ENTRA_REDIRECT_URI: envValues.entraRedirectUri,
            };

      try {
        const response = await fetch('/api/auth/config/env', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ values }),
        });

        if (!response.ok) {
          const fallback = `Save failed (${response.status})`;
          let message = fallback;
          try {
            const body = (await response.json()) as { message?: string };
            if (body?.message) message = body.message;
          } catch {
            // Keep fallback message when no JSON body is available.
          }
          throw new Error(message);
        }

        const body = (await response.json()) as EnvSaveResponse;
        const createdLabel = body.created ? 'Created .env.' : 'Updated .env.';
        setSaveState({
          type: 'success',
          message: `${createdLabel} Saved: ${body.updated.join(', ')}. Restart backend to fully apply all changes.`,
        });
      } catch (err) {
        setSaveState({
          type: 'error',
          message: (err as Error).message || 'Unable to save configuration values.',
        });
      }
    },
    [envValues]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Platform setup wizard"
        aria-modal="true"
        tabIndex={-1}
        data-testid="setup-wizard"
      >
        <Card elevation="raised" className="p-6 max-w-lg w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Text muted className="text-xs">
              Step {currentStep + 1} of {STEPS.length}
            </Text>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Skip setup wizard"
                onClick={onSkip}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
              >
                <SkipForward className="size-3" />
                Skip
              </button>
              <button
                type="button"
                aria-label="Close setup wizard"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Step content */}
          <div className="flex flex-col items-center text-center gap-4">
            {step.icon}
            <Heading level={2}>{step.title}</Heading>
            <Text muted className="text-sm max-w-md">
              {step.description}
            </Text>
          </div>

          <div className="mt-4 text-left">{step.content}</div>

          {step.id === 'github' && (
            <div className="mt-4 rounded-lg border border-border/70 p-3 space-y-3">
              <Text className="text-sm font-medium">Save GitHub settings to .env</Text>
              <Input
                aria-label="GitHub Client ID"
                placeholder="GitHub Client ID"
                value={envValues.githubClientId}
                onChange={(e) => updateEnvValue('githubClientId', e.target.value)}
              />
              <Input
                aria-label="GitHub Client Secret"
                placeholder="GitHub Client Secret"
                type="password"
                value={envValues.githubClientSecret}
                onChange={(e) => updateEnvValue('githubClientSecret', e.target.value)}
              />
              <Input
                aria-label="Auth Callback Base URL"
                placeholder="http://127.0.0.1:3000"
                value={envValues.authCallbackUrl}
                onChange={(e) => updateEnvValue('authCallbackUrl', e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => handleSaveEnv('github')}
                disabled={saveState.type === 'saving'}
              >
                {saveState.type === 'saving' ? 'Saving...' : 'Save to .env'}
              </Button>
            </div>
          )}

          {step.id === 'entra' && (
            <div className="mt-4 rounded-lg border border-border/70 p-3 space-y-3">
              <Text className="text-sm font-medium">Save Entra settings to .env</Text>
              <Input
                aria-label="Entra Client ID"
                placeholder="Entra Client ID"
                value={envValues.entraClientId}
                onChange={(e) => updateEnvValue('entraClientId', e.target.value)}
              />
              <Input
                aria-label="Entra Tenant ID"
                placeholder="Tenant ID or common"
                value={envValues.entraTenantId}
                onChange={(e) => updateEnvValue('entraTenantId', e.target.value)}
              />
              <Input
                aria-label="Entra Client Secret"
                placeholder="Entra Client Secret"
                type="password"
                value={envValues.entraClientSecret}
                onChange={(e) => updateEnvValue('entraClientSecret', e.target.value)}
              />
              <Input
                aria-label="Entra Redirect URI"
                placeholder="http://127.0.0.1:3000/api/auth/entra/callback"
                value={envValues.entraRedirectUri}
                onChange={(e) => updateEnvValue('entraRedirectUri', e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => handleSaveEnv('entra')}
                disabled={saveState.type === 'saving'}
              >
                {saveState.type === 'saving' ? 'Saving...' : 'Save to .env'}
              </Button>
            </div>
          )}

          {saveState.message && (
            <Text
              className={`mt-3 text-xs ${saveState.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {saveState.message}
            </Text>
          )}

          {/* Step indicators */}
          <ul className="flex justify-center gap-1.5 mt-6" aria-label="Setup progress">
            {STEPS.map((s, i) => (
              <li key={s.id} aria-current={i === currentStep ? 'step' : undefined}>
                <span
                  className={`block size-2 rounded-full transition-colors ${
                    i === currentStep
                      ? 'bg-primary'
                      : i < currentStep
                        ? 'bg-primary/40'
                        : 'bg-muted'
                  }`}
                  aria-hidden="true"
                />
                <span className="sr-only">
                  Step {i + 1}
                  {i === currentStep ? ' (current)' : ''}
                </span>
              </li>
            ))}
          </ul>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button variant="ghost" size="sm" onClick={handleBack} disabled={isFirst}>
              <ArrowLeft className="size-3 mr-1" /> Back
            </Button>
            <Button size="sm" onClick={handleNext}>
              {isLast ? (
                <>
                  Finish <CheckCircle className="size-3 ml-1" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="size-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
