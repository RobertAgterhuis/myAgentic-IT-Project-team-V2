import * as React from 'react';
import { ModalDialog } from './modal-dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) onCancel?.();
    onOpenChange?.(next);
  };

  // Focus cancel button for destructive actions when dialog opens
  React.useEffect(() => {
    if (open && destructive) {
      // Slight delay for Radix animation
      const timer = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open, destructive]);

  return (
    <ModalDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={message}
      size="sm"
      closeOnBackdropClick={false}
      footer={
        <>
          <Button
            ref={cancelRef}
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => {
              onConfirm();
              onOpenChange?.(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {/* Body is empty — message is in description */}
      <span />
    </ModalDialog>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
