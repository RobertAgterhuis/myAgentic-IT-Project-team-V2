import * as React from 'react';
import { cn } from '@/lib/utils';
import { FormRow } from './form-row';

export interface TextareaFieldProps extends React.ComponentProps<'textarea'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

export function TextareaField({
  label,
  helperText,
  error,
  success,
  maxLength,
  showCount = false,
  className,
  id: idProp,
  rows,
  ...props
}: TextareaFieldProps) {
  const [charCount, setCharCount] = React.useState(
    typeof props.value === 'string'
      ? props.value.length
      : (props.defaultValue?.toString().length ?? 0)
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (showCount) {
      setCharCount(event.target.value.length);
    }
    props.onChange?.(event);
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
      <textarea
        maxLength={maxLength}
        rows={rows ?? 4}
        className={cn(
          'flex min-h-24 w-full resize-y rounded-xl border border-input/80 bg-background/72 px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-[color,box-shadow,border-color,background-color] outline-none placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          success && 'border-success focus-visible:ring-success/50',
          error && 'border-destructive focus-visible:ring-destructive/50',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        {...props}
        onChange={handleChange}
      />
    </FormRow>
  );
}
