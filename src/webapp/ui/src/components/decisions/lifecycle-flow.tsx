import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

export function LifecycleFlow({ status }: { status: string }) {
  const steps = ['OPEN', 'DECIDED'];
  const currentIdx = steps.indexOf(status);

  return (
    <div className="flex items-center gap-1 text-xs" aria-label={`Lifecycle: ${status}`}>
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-1">
          <Badge variant={i <= currentIdx ? 'success' : 'secondary'} className="text-[10px] px-1.5">
            {step}
          </Badge>
          {i < steps.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}
