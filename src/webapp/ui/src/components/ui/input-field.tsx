import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { FormRow } from './form-row';

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
  const [charCount, setCharCount] = React.useState(
    typeof props.value === 'string'
      ? props.value.length
      : (props.defaultValue?.toString().length ?? 0)
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (showCount) setCharCount(e.target.value.length);
    props.onChange?.(e);
  };

  return (
    <FormRow
      label={label}
      htmlFor={idProp}
      helperText={helperText}
      error={error}
      className={className}
      footer={
        showCount && maxLength ? (
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {charCount}/{maxLength}
            </p>
          </div>
        ) : undefined
      }
    >
      <Input
        maxLength={maxLength}
        className={cn(
          success && 'border-success focus-visible:ring-success/50',
          error && 'border-destructive focus-visible:ring-destructive/50'
        )}
        {...props}
        onChange={handleChange}
      />
    </FormRow>
  );
}

export { InputField };
