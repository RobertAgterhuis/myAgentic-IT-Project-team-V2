import { AlertBanner } from '@/components/ui/alert-banner';

export function ValidationSummary({
  title = 'Please resolve the following issues:',
  errors,
}: {
  title?: string;
  errors: string[];
}) {
  if (errors.length === 0) return null;

  return (
    <AlertBanner variant="warning" role="alert" aria-live="assertive">
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    </AlertBanner>
  );
}
