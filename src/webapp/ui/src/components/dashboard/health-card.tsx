import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { HealthIndicator } from '@/lib/api-types';
import { Heart, ShieldCheck, Hammer, Rocket } from 'lucide-react';

const healthBadge: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  healthy: 'success',
  good: 'success',
  degraded: 'warning',
  critical: 'error',
};

const healthIcons: Record<string, React.ReactNode> = {
  quality: <Heart className="size-4" />,
  coverage: <ShieldCheck className="size-4" />,
  builds: <Hammer className="size-4" />,
  deployment: <Rocket className="size-4" />,
};

export function HealthCard({ name, indicator }: { name: string; indicator: HealthIndicator }) {
  return (
    <Card elevation="flat" className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-md bg-muted">{healthIcons[name]}</span>
          <span className="text-sm font-medium capitalize">{indicator.label}</span>
        </div>
        <Badge variant={healthBadge[indicator.status] ?? 'info'} className="text-xs">
          {indicator.status}
        </Badge>
      </div>
      <p className="text-2xl font-bold">{indicator.value}</p>
      <p className="text-xs text-muted-foreground mt-1">{indicator.details}</p>
    </Card>
  );
}
