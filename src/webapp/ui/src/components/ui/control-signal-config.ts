import type { LucideIcon } from 'lucide-react';
import { Bot, ShieldCheck, UserCheck } from 'lucide-react';

export type ControlSignal = 'governed' | 'active-agent' | 'needs-human-input';

export const controlSignalConfig: Record<
  ControlSignal,
  {
    label: string;
    description: string;
    variant: 'info' | 'secondary' | 'warning';
    icon: LucideIcon;
  }
> = {
  governed: {
    label: 'Governed',
    description: 'This surface keeps gates, approvals, and policy awareness visible.',
    variant: 'info',
    icon: ShieldCheck,
  },
  'active-agent': {
    label: 'Active agent',
    description: 'This identifies the agent currently responsible for the next runtime step.',
    variant: 'secondary',
    icon: Bot,
  },
  'needs-human-input': {
    label: 'Needs human input',
    description: 'This marks work that is paused until a person answers or decides something.',
    variant: 'warning',
    icon: UserCheck,
  },
};
