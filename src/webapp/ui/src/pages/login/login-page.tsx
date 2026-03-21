/**
 * Login page (M29-006) — shown when user is unauthenticated.
 * Displays GitHub OAuth login with error handling and configuration info.
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Shield, AlertTriangle, Settings2, ExternalLink } from 'lucide-react';

interface AuthStatus {
  available: boolean;
  error?: string;
}

export default function LoginPage() {
  const loading = useAuthStore((s) => s.loading);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ available: true });

  useEffect(() => {
    checkAuthAvailability();
  }, []);

  async function checkAuthAvailability() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.status === 503) {
        setAuthStatus({
          available: false,
          error: 'Authentication is not configured on this instance.',
        });
      } else if (response.status === 200 || response.status === 401) {
        setAuthStatus({ available: true });
      } else if (!response.ok) {
        setAuthStatus({
          available: false,
          error: 'Failed to check authentication status.',
        });
      }
    } catch {
      setAuthStatus({
        available: false,
        error: 'Unable to connect to authentication service.',
      });
    }
  }

  function handleLogin() {
    if (!authStatus.available) return;
    window.location.href = '/api/auth/login';
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
            <Text className="text-muted-foreground text-sm">
              Authenticate with your GitHub account to access the platform.
            </Text>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!authStatus.available && (
              <AlertBanner variant="error" icon={<AlertTriangle className="size-4" />}>
                <div className="space-y-1">
                  <Text className="font-medium">Authentication Not Available</Text>
                  <Text className="text-sm">{authStatus.error}</Text>
                </div>
              </AlertBanner>
            )}

            <Button
              onClick={handleLogin}
              disabled={loading || !authStatus.available}
              className="w-full gap-2"
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
              <div>
                <Text className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  GitHub OAuth Setup
                </Text>
                <Text className="text-amber-800 dark:text-amber-200">
                  This instance requires GitHub OAuth to be configured. Administrators should set
                  the following environment variables:
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
                  <span className="text-amber-600 dark:text-amber-400">OAUTH_CALLBACK_URL</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    =https://your-domain/api/auth/callback
                  </span>
                </div>
              </div>

              <div>
                <Text className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Steps to Configure:
                </Text>
                <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-200">
                  <li>Create a GitHub OAuth App at https://github.com/settings/developers</li>
                  <li>Set the Authorization callback URL to match OAUTH_CALLBACK_URL</li>
                  <li>Copy Client ID and Client Secret to environment variables</li>
                  <li>Restart the application</li>
                </ol>
              </div>

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
