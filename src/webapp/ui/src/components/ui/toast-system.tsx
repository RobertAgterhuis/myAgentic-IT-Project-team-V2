/**
 * Toast system — re-exports sonner's `toast` with typed helpers.
 * Usage: `showToast.success("Saved!")` or `showToast.error("Failed", { duration: 5000 })`
 * Mount `<Toaster />` once at the app root.
 */
import { toast, type ExternalToast } from 'sonner';

export { Toaster } from './sonner';

type ToastOptions = ExternalToast;

export const showToast = {
  success: (message: string, opts?: ToastOptions) => toast.success(message, opts),
  error: (message: string, opts?: ToastOptions) => toast.error(message, opts),
  warning: (message: string, opts?: ToastOptions) => toast.warning(message, opts),
  info: (message: string, opts?: ToastOptions) => toast.info(message, opts),
  loading: (message: string, opts?: ToastOptions) => toast.loading(message, opts),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
