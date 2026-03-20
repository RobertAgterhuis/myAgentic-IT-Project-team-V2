import * as React from 'react';

import { cn } from '@/lib/utils';

type CardElevation = 'flat' | 'raised' | 'outlined';
type CardTone = 'default' | 'info' | 'warning' | 'error' | 'success';

const elevationClasses: Record<CardElevation, string> = {
  flat: 'border-border/40 shadow-none',
  raised: 'border-border/30 shadow-lg',
  outlined: 'border border-border/60 shadow-sm',
};

const toneClasses: Record<CardTone, string> = {
  default: 'bg-gradient-to-br from-card via-card to-info/6 text-card-foreground backdrop-blur-sm',
  info: 'bg-gradient-to-br from-card via-info/8 to-info/14 border-info/25 text-card-foreground backdrop-blur-sm',
  warning:
    'bg-gradient-to-br from-card via-warning/8 to-warning/14 border-warning/30 text-card-foreground backdrop-blur-sm',
  error:
    'bg-gradient-to-br from-card via-destructive/8 to-destructive/14 border-destructive/30 text-card-foreground backdrop-blur-sm',
  success:
    'bg-gradient-to-br from-card via-success/8 to-success/14 border-success/28 text-card-foreground backdrop-blur-sm',
};

interface CardSharedProps {
  elevation?: CardElevation;
  tone?: CardTone;
  clickable?: boolean;
}

type CardProps =
  | (CardSharedProps & { clickable?: false } & React.ComponentPropsWithoutRef<'div'>)
  | (CardSharedProps & { clickable: true } & React.ComponentPropsWithoutRef<'button'>);

function Card(props: CardProps) {
  const { className, elevation = 'outlined', tone = 'default', clickable } = props;
  const cardClassName = cn(
    'relative flex flex-col gap-6 overflow-hidden rounded-[calc(var(--radius-md)+2px)] py-6',
    elevationClasses[elevation],
    toneClasses[tone],
    clickable &&
      'cursor-pointer transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    className
  );

  if (clickable) {
    const {
      className: _className,
      elevation: _elevation,
      tone: _tone,
      clickable: _clickable,
      ...buttonProps
    } = props as CardSharedProps & React.ComponentPropsWithoutRef<'button'>;
    return (
      <button
        type="button"
        data-slot="card"
        data-elevation={elevation}
        data-tone={tone}
        className={cardClassName}
        {...buttonProps}
      />
    );
  }

  const {
    className: _className,
    elevation: _elevation,
    tone: _tone,
    clickable: _clickable,
    ...divProps
  } = props as CardSharedProps & React.ComponentPropsWithoutRef<'div'>;

  return (
    <div
      data-slot="card"
      data-elevation={elevation}
      data-tone={tone}
      className={cardClassName}
      {...divProps}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
export type { CardElevation, CardTone, CardProps };
