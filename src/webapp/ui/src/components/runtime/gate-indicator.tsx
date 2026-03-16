import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';

export function GateIndicator({ status }: { status: 'passed' | 'pending' | 'blocked' }) {
  if (status === 'passed')
    return <ShieldCheck className="size-4 text-green-600" aria-label="Gate passed" />;
  if (status === 'blocked')
    return <ShieldAlert className="size-4 text-red-600" aria-label="Gate blocked" />;
  return <Clock className="size-4 text-muted-foreground" aria-label="Gate pending" />;
}
