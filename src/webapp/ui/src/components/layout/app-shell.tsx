import * as React from 'react';

interface AppShellProps {
  topNavigation: React.ReactNode;
  sidebar: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  children: React.ReactNode;
  helpPanel?: React.ReactNode;
  chatPanel?: React.ReactNode;
}

/**
 * Application shell primitive that composes persistent chrome around routed page content.
 */
export function AppShell({
  topNavigation,
  sidebar,
  breadcrumbs,
  children,
  helpPanel,
  chatPanel,
}: AppShellProps) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-transparent text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-border)_30%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-border)_20%,transparent)_1px,transparent_1px)] bg-size-[88px_88px] opacity-50" />
        <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-info/15 blur-3xl" />
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-secondary/12 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-accent/8 blur-3xl" />
      </div>

      {topNavigation}

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {sidebar}

        <main className="scrollbar-surface relative flex flex-1 flex-col overflow-y-auto">
          {breadcrumbs}
          {children}
        </main>
      </div>

      {helpPanel}
      {chatPanel}
    </div>
  );
}
