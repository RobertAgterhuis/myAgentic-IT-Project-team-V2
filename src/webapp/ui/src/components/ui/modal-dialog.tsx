import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from './dialog';

type ModalSize = 'sm' | 'md' | 'lg' | 'full';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  full: 'sm:max-w-[calc(100vw-4rem)] sm:max-h-[calc(100vh-4rem)]',
};

interface ModalDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  size?: ModalSize;
  closeOnBackdropClick?: boolean;
  trigger?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

function ModalDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  closeOnBackdropClick = true,
  trigger,
  footer,
  children,
}: ModalDialogProps) {
  const handleInteractOutside = (e: Event) => {
    if (!closeOnBackdropClick) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(sizeClasses[size])}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={undefined}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export { ModalDialog };
export type { ModalDialogProps, ModalSize };
