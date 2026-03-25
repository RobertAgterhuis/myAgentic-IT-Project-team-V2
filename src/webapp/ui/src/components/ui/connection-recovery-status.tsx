import * as React from 'react';
import { Badge } from './badge';
import type { ConnectionStatus, ConnectionRecoveryState } from '@/stores/ui-store';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

function formatRemainingSeconds(nextRetryAt: number, now: number): number {
  return Math.max(0, Math.ceil((nextRetryAt - now) / 1000));
}

interface ConnectionRecoveryStatusProps {
  connectionStatus: ConnectionStatus;
  recovery?: ConnectionRecoveryState;
}

export function ConnectionRecoveryStatus({
  connectionStatus,
  recovery,
}: ConnectionRecoveryStatusProps) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!recovery?.nextRetryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [recovery?.nextRetryAt]);

  if (connectionStatus === 'connected') {
    return (
      <Badge variant="success" className="gap-1" dot={false} title="Real-time connection active">
        <Wifi className="size-3.5" />
        <span className="hidden sm:inline">Live</span>
      </Badge>
    );
  }

  const attempt = recovery?.attempt ?? 0;
  const hasCountdown = typeof recovery?.nextRetryAt === 'number' && recovery.nextRetryAt > now;
  const seconds = hasCountdown ? formatRemainingSeconds(recovery.nextRetryAt!, now) : 0;

  if (connectionStatus === 'connecting') {
    const text = hasCountdown
      ? `Reconnecting in ${seconds}s`
      : attempt > 0
        ? `Reconnecting (attempt ${attempt})`
        : 'Connecting…';
    return (
      <Badge
        variant="warning"
        className="gap-1"
        dot={false}
        title={`Network recovery in progress${attempt > 0 ? ` (attempt ${attempt})` : ''}`}
      >
        <Loader2 className="size-3.5 animate-spin" />
        <span className="hidden sm:inline">{text}</span>
      </Badge>
    );
  }

  const disconnectedText = hasCountdown
    ? `Offline · retry in ${seconds}s`
    : attempt > 0
      ? `Offline · retrying (attempt ${attempt})`
      : 'Offline';

  return (
    <Badge
      variant="error"
      className="gap-1"
      dot={false}
      title={attempt > 0 ? `Disconnected (reconnect attempt ${attempt})` : 'Disconnected'}
    >
      <WifiOff className="size-3.5" />
      <span className="hidden sm:inline">{disconnectedText}</span>
    </Badge>
  );
}
