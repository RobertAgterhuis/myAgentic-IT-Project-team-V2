import * as React from 'react';
import { cn } from '@/lib/utils';

/* ---------- Heading ---------- */

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const headingClasses: Record<HeadingLevel, string> = {
  1: 'text-4xl font-bold tracking-tight',
  2: 'text-3xl font-semibold tracking-tight',
  3: 'text-2xl font-semibold',
  4: 'text-xl font-semibold',
  5: 'text-lg font-medium',
  6: 'text-base font-medium',
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: HeadingLevel;
}

function Heading({ level = 2, as, className, children, ...props }: HeadingProps) {
  const Tag = `h${as ?? level}` as const;
  return React.createElement(
    Tag,
    {
      className: cn(
        '[font-family:var(--font-family-heading)] text-foreground',
        headingClasses[level],
        className
      ),
      ...props,
    },
    children
  );
}

/* ---------- Text ---------- */

type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

const textSizeClasses: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: TextSize;
  weight?: TextWeight;
  muted?: boolean;
  as?: 'p' | 'span' | 'div';
}

function Text({
  size = 'base',
  weight = 'normal',
  muted,
  as = 'p',
  className,
  children,
  ...props
}: TextProps) {
  return React.createElement(
    as,
    {
      className: cn(
        '[font-family:var(--font-family-sans)]',
        textSizeClasses[size],
        `font-${weight}`,
        muted ? 'text-muted-foreground' : 'text-foreground',
        className
      ),
      ...props,
    },
    children
  );
}

/* ---------- InlineCode / CodeBlock ---------- */

type InlineCodeProps = React.HTMLAttributes<HTMLElement>;

function InlineCode({ className, children, ...props }: InlineCodeProps) {
  return (
    <code className={cn('font-mono rounded bg-muted px-1.5 py-0.5 text-sm', className)} {...props}>
      {children}
    </code>
  );
}

type CodeBlockProps = React.HTMLAttributes<HTMLPreElement>;

function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  return (
    <pre
      className={cn('font-mono overflow-x-auto rounded-md bg-muted p-4 text-sm', className)}
      {...props}
    >
      <code>{children}</code>
    </pre>
  );
}

export { Heading, Text, InlineCode, CodeBlock };
export type { HeadingLevel, TextSize, TextWeight };
