import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Label } from './label';

export interface InputFieldProps extends React.ComponentProps<'input'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

function InputField({
  label,
  helperText,
  error,
  success,
  maxLength,
  showCount = false,
  className,
  id: idProp,
  ...props
}: InputFieldProps) {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  const [charCount, setCharCount] = React.useState(
    typeof props.value === 'string' ? props.value.length : (props.defaultValue?.toString().length ?? 0)
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (showCount) setCharCount(e.target.value.length);
    props.onChange?.(e);
  };

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && (
        <Label htmlFor={id} className={cn(error && 'text-destructive')}>
          {label}
        </Label>
      )}
      <Input
        id={id}
        maxLength={maxLength}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        className={cn(
          success && 'border-success focus-visible:ring-success/50',
          error && 'border-destructive focus-visible:ring-destructive/50'
        )}
        {...props}
        onChange={handleChange}
      />
      <div className="flex justify-between">
        <div>
          {error && (
            <p id={errorId} className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!error && helperText && (
            <p id={helperId} className="text-sm text-muted-foreground">
              {helperText}
            </p>
          )}
        </div>
        {showCount && maxLength && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

export { InputField };
