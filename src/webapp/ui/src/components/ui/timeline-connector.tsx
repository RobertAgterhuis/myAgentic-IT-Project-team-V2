import { cn } from '@/lib/utils';

interface TimelineConnectorProps extends React.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical';
  active?: boolean;
}

export function TimelineConnector({
  orientation = 'horizontal',
  active = false,
  className,
  ...props
}: TimelineConnectorProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'shrink-0 transition-colors duration-300',
        orientation === 'horizontal' ? 'h-0.5 w-8' : 'h-8 w-0.5',
        active ? 'bg-blue-500' : 'bg-border',
        className
      )}
      {...props}
    />
  );
}
