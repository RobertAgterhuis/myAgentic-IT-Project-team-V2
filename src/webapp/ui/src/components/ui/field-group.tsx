import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldGroupProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function FieldGroup({ title, description, className, children }: FieldGroupProps) {
  return (
    <fieldset
      className={cn('grid gap-3 rounded-2xl border border-border/70 bg-card/65 p-4', className)}
    >
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {children}
    </fieldset>
  );
}
