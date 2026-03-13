import * as React from 'react';
import { cn } from '@/lib/utils';
import { Switch } from './switch';
import { Label } from './label';

export interface SwitchFieldProps {
  label: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
  id?: string;
  className?: string;
}

function SwitchField({
  label,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  size = 'default',
  id: idProp,
  className,
}: SwitchFieldProps) {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Switch
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        size={size}
        aria-describedby={descriptionId}
      />
      <div className="grid gap-0.5">
        <Label htmlFor={id} className={cn(disabled && 'text-muted-foreground cursor-not-allowed')}>
          {label}
        </Label>
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export { SwitchField };
