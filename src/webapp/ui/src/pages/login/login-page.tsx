/**
 * Login page (M29-006) — shown when user is unauthenticated.
 * Displays GitHub OAuth login with error handling and configuration info.
 */
import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Shield, AlertTriangle, Settings2, ExternalLink, Building2 } from 'lucide-react';

interface AuthStatus {
  available: boolean;
  githubEnabled: boolean;
  entraEnabled: boolean;
  error?: string;
}

interface ProviderValidation {
  configured: boolean;
  providerEnabled: boolean;
  requiredVariables: Array<{ name: string; present: boolean }>;
  callback: {
    envName: string;
    callbackUrl: string;
    effectiveBaseUrl?: string;
  };
}

interface AuthValidationResult {
  allConfigured: boolean;
  github: ProviderValidation;
  entra: ProviderValidation;
}

const AUTH_SETUP_STORAGE_KEY = 'auth-setup-assistant-hidden';

const SETUP_STEPS = [
  {
    title: 'Create OAuth apps',
    summary: 'Create GitHub OAuth app and Microsoft Entra app registration.',
  },
  {
    title: 'Copy environment values',
    summary: 'Copy required GitHub and Entra values into your server environment file.',
  },
  {
    title: 'Validate and continue',
    summary: 'Validate configuration and return to sign-in once all checks pass.',
  },
];

export default function LoginPage() {
  const loading = useAuthStore((s) => s.loading);
  const setLoading = useAuthStore((s) => s.setLoading);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    available: true,
    githubEnabled: true,
    entraEnabled: false,
  });
  const [validation, setValidation] = useState<AuthValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState(0);
  const [setupAssistantHidden, setSetupAssistantHidden] = useState(() => {
    try {
      return window.localStorage.getItem(AUTH_SETUP_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const search = new URLSearchParams(window.location.search);
  const error = search.get('error');
  const errorDetail = search.get('error_detail');
  const reason = search.get('reason');
  const reasonMessage =
    reason === 'session-expired'
      ? 'Your session has expired. Sign in again to continue where you left off.'
      : reason === 'auth-required'
        ? 'Sign in is required to access that page.'
        : null;
  const errorMessage =
    error === 'auth_failed'
      ? 'Authentication failed during the provider callback.'
      : error === 'invalid_state'
        ? 'Authentication state validation failed. Start the sign-in flow again.'
        : error === 'missing_params'
          ? 'Authentication callback was missing required parameters.'
          : null;

  const checkAuthAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.status === 200) {
        window.location.replace('/');
        return;
      }
      if (response.status === 503) {
        setAuthStatus({
          available: false,
          githubEnabled: false,
          entraEnabled: false,
          error: 'Authentication is not configured on this instance.',
        });
        return;
      } else if (response.status === 401) {
        // Auth is up — check which providers are configured
        try {
          const provRes = await fetch('/api/auth/providers', { credentials: 'include' });
          if (provRes.ok) {
            const providers = await provRes.json();
            setAuthStatus({
              available: true,
              githubEnabled: Boolean(providers.github),
              entraEnabled: Boolean(providers.entra),
            });
          } else {
            setAuthStatus({ available: true, githubEnabled: true, entraEnabled: false });
          }
        } catch {
          setAuthStatus({ available: true, githubEnabled: true, entraEnabled: false });
        }
      } else if (!response.ok) {
        setAuthStatus({
          available: false,
          githubEnabled: false,
          entraEnabled: false,
          error: 'Failed to check authentication status.',
        });
      }
    } catch {
      setAuthStatus({
        available: false,
        githubEnabled: false,
        entraEnabled: false,
        error: 'Unable to connect to authentication service.',
      });
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  useEffect(() => {
    checkAuthAvailability();
  }, [checkAuthAvailability]);

  function handleLogin() {
    if (!authStatus.available) return;
    setLoading(true);
    window.location.href = '/api/auth/login';
  }

  function handleEntraLogin() {
    if (!authStatus.available) return;
    setLoading(true);
    window.location.href = '/api/auth/entra/login';
  }

  async function handleValidateConfiguration() {
    setValidating(true);
    setValidationError(null);
    try {
      const response = await fetch('/api/auth/config/validate', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Validation failed (${response.status})`);
      }
      const body = (await response.json()) as AuthValidationResult;
      setValidation(body);
    } catch {
      setValidationError('Unable to validate configuration. Check server connectivity and retry.');
      setValidation(null);
    } finally {
      setValidating(false);
    }
  }

  async function handleCopySnippet(kind: 'github' | 'entra') {
    const origin = window.location.origin;
    const githubSnippet = [
      `GITHUB_CLIENT_ID=your_github_client_id`,
      `GITHUB_CLIENT_SECRET=your_github_client_secret`,
      `AUTH_CALLBACK_URL=${origin}`,
    ].join('\n');
    const entraSnippet = [
      `ENTRA_CLIENT_ID=your_entra_client_id`,
      `ENTRA_TENANT_ID=your_tenant_id_or_common`,
      `ENTRA_CLIENT_SECRET=your_entra_client_secret`,
      `ENTRA_REDIRECT_URI=${origin}/api/auth/entra/callback`,
    ].join('\n');
    const snippet = kind === 'github' ? githubSnippet : entraSnippet;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippet);
      } else {
        // Fallback for older browser contexts
        const textarea = document.createElement('textarea');
        textarea.value = snippet;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyStatus(kind === 'github' ? 'GitHub snippet copied.' : 'Azure snippet copied.');
    } catch {
      setCopyStatus('Copy failed. Please copy manually from the snippet above.');
    }
  }

  function handleDownloadEnvTemplate() {
    const origin = window.location.origin;
    const content = [
      '# GitHub OAuth',
      'GITHUB_CLIENT_ID=your_github_client_id',
      'GITHUB_CLIENT_SECRET=your_github_client_secret',
      `AUTH_CALLBACK_URL=${origin}`,
      '',
      '# Microsoft Entra (optional)',
      'ENTRA_CLIENT_ID=your_entra_client_id',
      'ENTRA_TENANT_ID=your_tenant_id_or_common',
      'ENTRA_CLIENT_SECRET=your_entra_client_secret',
      `ENTRA_REDIRECT_URI=${origin}/api/auth/entra/callback`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '.env.auth.template';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    setCopyStatus('Downloaded .env.auth.template');
  }

  function handleSkipSetupAssistant() {
    try {
      window.localStorage.setItem(AUTH_SETUP_STORAGE_KEY, 'true');
    } catch {
      // localStorage may be unavailable
    }
    setSetupAssistantHidden(true);
  }

  function handleResumeSetupAssistant() {
    try {
      window.localStorage.removeItem(AUTH_SETUP_STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }
    setSetupAssistantHidden(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="size-6 text-primary" />
            </div>
            <Heading level={2}>Agentic SDLC Platform</Heading>
            <Text className="text-muted-foreground text-sm">Sign in to access the platform.</Text>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {reasonMessage && (
              <AlertBanner variant="warning" icon={<AlertTriangle className="size-4" />}>
                <div className="space-y-1">
                  <Text className="font-medium">Re-authentication required</Text>
                  <Text className="text-sm">{reasonMessage}</Text>
                </div>
              </AlertBanner>
            )}

            {errorMessage && (
              <AlertBanner variant="error" icon={<AlertTriangle className="size-4" />}>
                <div className="space-y-1">
                  <Text className="font-medium">Sign-in failed</Text>
                  <Text className="text-sm">{errorMessage}</Text>
                  {errorDetail && (
                    <Text className="text-xs break-all text-muted-foreground">
                      Detail: {errorDetail}
                    </Text>
                  )}
                </div>
              </AlertBanner>
            )}

            {!authStatus.available && (
              <AlertBanner variant="error" icon={<AlertTriangle className="size-4" />}>
                <div className="space-y-1">
                  <Text className="font-medium">Authentication Not Available</Text>
                  <Text className="text-sm">{authStatus.error}</Text>
                </div>
              </AlertBanner>
            )}

            {authStatus.githubEnabled && (
              <Button
                onClick={handleLogin}
                disabled={loading || !authStatus.available}
                className="w-full gap-2"
                data-testid="github-login-button"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
                  <path
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                    0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
                    -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2
                    -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82
                    .64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08
                    2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
                    1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                  />
                </svg>
                {loading ? 'Signing in...' : 'Sign in with GitHub'}
              </Button>
            )}

            {authStatus.entraEnabled && (
              <Button
                variant="outline"
                onClick={handleEntraLogin}
                disabled={loading || !authStatus.available}
                className="w-full gap-2"
                data-testid="entra-login-button"
              >
                <Building2 className="size-4" aria-hidden="true" />
                {loading ? 'Signing in...' : 'Sign in with Microsoft'}
              </Button>
            )}
          </CardContent>
        </Card>

        {!authStatus.available && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings2 className="size-5 text-amber-600 dark:text-amber-400" />
                <Heading level={3} className="text-amber-900 dark:text-amber-100">
                  Configuration Required
                </Heading>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {setupAssistantHidden ? (
                <div className="rounded border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-slate-900/60 p-3">
                  <Text className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Setup assistant skipped
                  </Text>
                  <Text className="text-amber-800 dark:text-amber-200 text-xs mb-2">
                    You can resume the guided setup assistant any time.
                  </Text>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleResumeSetupAssistant}
                  >
                    Resume setup assistant
                  </Button>
                </div>
              ) : (
                <div className="rounded border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-slate-900/60 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Text className="font-medium text-amber-900 dark:text-amber-100">
                      Guided setup assistant
                    </Text>
                    <Text className="text-xs text-amber-800 dark:text-amber-200">
                      Step {setupStep + 1} of {SETUP_STEPS.length}
                    </Text>
                  </div>
                  <div>
                    <Text className="font-medium text-amber-900 dark:text-amber-100">
                      {SETUP_STEPS[setupStep].title}
                    </Text>
                    <Text className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                      {SETUP_STEPS[setupStep].summary}
                    </Text>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSetupStep((step) => Math.max(0, step - 1))}
                      disabled={setupStep === 0}
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        setSetupStep((step) => Math.min(SETUP_STEPS.length - 1, step + 1))
                      }
                      disabled={setupStep === SETUP_STEPS.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadEnvTemplate}>
                      Download .env template
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSkipSetupAssistant}>
                      Skip setup for now
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Text className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  GitHub OAuth Setup
                </Text>
                <Text className="text-amber-800 dark:text-amber-200">
                  Configure GitHub OAuth in your GitHub account settings and then add variables in
                  your server environment file.
                </Text>
              </div>

              <div className="space-y-2 mt-3 p-3 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800 font-mono text-xs">
                <div>
                  <span className="text-amber-600 dark:text-amber-400">GITHUB_CLIENT_ID</span>
                  <span className="text-slate-600 dark:text-slate-400">=your_github_app_id</span>
                </div>
                <div>
                  <span className="text-amber-600 dark:text-amber-400">GITHUB_CLIENT_SECRET</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    =your_github_app_secret
                  </span>
                </div>
                <div>
                  <span className="text-amber-600 dark:text-amber-400">AUTH_CALLBACK_URL</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    =https://your-domain/api/auth/callback
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <Text className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Microsoft (Entra) SSO — Optional
                </Text>
                <div className="space-y-1 p-3 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800 font-mono text-xs">
                  <div>
                    <span className="text-amber-600 dark:text-amber-400">ENTRA_CLIENT_ID</span>
                    <span className="text-slate-600 dark:text-slate-400">=your_entra_app_id</span>
                  </div>
                  <div>
                    <span className="text-amber-600 dark:text-amber-400">ENTRA_TENANT_ID</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      =your_tenant_id_or_common
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-600 dark:text-amber-400">ENTRA_CLIENT_SECRET</span>
                    <span className="text-slate-600 dark:text-slate-400">=your_entra_secret</span>
                  </div>
                </div>
              </div>

              <div>
                <Text className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  GitHub setup steps (where and what):
                </Text>
                <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-200">
                  <li>
                    Open GitHub Developer Settings: https://github.com/settings/developers and
                    create an OAuth App.
                  </li>
                  <li>
                    In the OAuth App form, set Authorization callback URL to
                    <span className="font-mono"> {window.location.origin}/api/auth/callback</span>.
                  </li>
                  <li>
                    In your server .env, set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to the values
                    from GitHub.
                  </li>
                  <li>
                    In your server .env, set AUTH_CALLBACK_URL to
                    <span className="font-mono"> {window.location.origin}</span>.
                  </li>
                  <li>Restart the backend service so the new variables are loaded.</li>
                </ol>
              </div>

              <div>
                <Text className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Azure (Microsoft Entra) setup steps (where and what):
                </Text>
                <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-200">
                  <li>
                    Open Microsoft Entra admin center: https://entra.microsoft.com and create an App
                    registration.
                  </li>
                  <li>
                    In App registration, add a Web redirect URI:
                    <span className="font-mono">
                      {' '}
                      {window.location.origin}/api/auth/entra/callback
                    </span>
                    .
                  </li>
                  <li>
                    In Certificates & secrets, create a client secret and copy the secret value.
                  </li>
                  <li>
                    In your server .env, set ENTRA_CLIENT_ID, ENTRA_TENANT_ID, ENTRA_CLIENT_SECRET,
                    and ENTRA_REDIRECT_URI.
                  </li>
                  <li>Restart the backend service so Entra provider initialization can succeed.</li>
                </ol>
              </div>

              <Button
                variant="default"
                size="sm"
                className="w-full mt-2"
                onClick={handleValidateConfiguration}
                disabled={validating}
              >
                {validating ? 'Validating...' : 'Validate Configuration'}
              </Button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopySnippet('github')}
                  className="text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700"
                >
                  Copy GitHub .env Snippet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopySnippet('entra')}
                  className="text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700"
                >
                  Copy Azure .env Snippet
                </Button>
              </div>

              {copyStatus && (
                <Text className="text-xs text-amber-800 dark:text-amber-200">{copyStatus}</Text>
              )}

              {validationError && (
                <AlertBanner variant="error" icon={<AlertTriangle className="size-4" />}>
                  <Text className="text-sm">{validationError}</Text>
                </AlertBanner>
              )}

              {validation && (
                <div className="space-y-3 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-3 text-xs">
                  <Text className="font-medium text-amber-900 dark:text-amber-100">
                    Validation result:{' '}
                    {validation.allConfigured ? 'All configured' : 'Configuration incomplete'}
                  </Text>

                  <div className="space-y-1">
                    <Text className="font-medium text-amber-900 dark:text-amber-100">GitHub</Text>
                    {validation.github.requiredVariables.map((entry) => (
                      <Text key={entry.name} className="text-amber-800 dark:text-amber-200">
                        {entry.present ? 'PASS' : 'MISSING'} - {entry.name}
                      </Text>
                    ))}
                    <Text className="text-amber-800 dark:text-amber-200">
                      Callback ({validation.github.callback.envName}):{' '}
                      {validation.github.callback.callbackUrl}
                    </Text>
                  </div>

                  <div className="space-y-1">
                    <Text className="font-medium text-amber-900 dark:text-amber-100">
                      Azure (Entra)
                    </Text>
                    {validation.entra.requiredVariables.map((entry) => (
                      <Text key={entry.name} className="text-amber-800 dark:text-amber-200">
                        {entry.present ? 'PASS' : 'MISSING'} - {entry.name}
                      </Text>
                    ))}
                    <Text className="text-amber-800 dark:text-amber-200">
                      Redirect ({validation.entra.callback.envName}):{' '}
                      {validation.entra.callback.callbackUrl}
                    </Text>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 gap-2 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700"
                onClick={() => window.open('https://github.com/settings/developers', '_blank')}
              >
                <span>
                  Create GitHub App <ExternalLink className="size-3 inline ml-1" />
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 gap-2 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700"
                onClick={() => window.open('https://entra.microsoft.com', '_blank')}
              >
                <span>
                  Open Microsoft Entra Admin Center <ExternalLink className="size-3 inline ml-1" />
                </span>
              </Button>

              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded text-amber-900 dark:text-amber-100 text-xs">
                <Text className="font-medium mb-1">For Development / Testing</Text>
                <Text className="text-amber-800 dark:text-amber-200">
                  If you're testing without OAuth configured, contact your system administrator to
                  set up GitHub OAuth or configure an alternative authentication method.
                </Text>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
