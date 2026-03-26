import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';

export interface AsyncMutationState {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: unknown;
}

interface AsyncMutationFeedbackProps {
  mutation: AsyncMutationState;
  pendingMessage?: string;
  successMessage?: string;
  errorMessagePrefix?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Please try again.';
}

export function AsyncMutationFeedback({
  mutation,
  pendingMessage = 'Saving changes... ',
  successMessage = 'Saved successfully.',
  errorMessagePrefix = 'Request failed.',
  onRetry,
  retryLabel = 'Retry',
}: AsyncMutationFeedbackProps) {
  if (mutation.isPending) {
    return <AlertBanner variant="info">{pendingMessage}</AlertBanner>;
  }

  if (mutation.isSuccess) {
    return <AlertBanner variant="success">{successMessage}</AlertBanner>;
  }

  if (mutation.isError) {
    const retryAction = onRetry ? (
      <Button size="sm" variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : undefined;

    return (
      <AlertBanner variant="error" action={retryAction}>
        {errorMessagePrefix} {toErrorMessage(mutation.error)}
      </AlertBanner>
    );
  }

  return null;
}
