import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Toaster } from './sonner';
import { showToast } from './toast-system';

describe('Toaster', () => {
  it('renders without crashing', () => {
    const { container } = render(<Toaster />);
    expect(container).toBeTruthy();
  });

  it('accepts position prop', () => {
    const { container } = render(<Toaster position="top-right" />);
    expect(container).toBeTruthy();
  });
});

describe('showToast', () => {
  it('exposes success, error, warning, info, loading, dismiss', () => {
    expect(typeof showToast.success).toBe('function');
    expect(typeof showToast.error).toBe('function');
    expect(typeof showToast.warning).toBe('function');
    expect(typeof showToast.info).toBe('function');
    expect(typeof showToast.loading).toBe('function');
    expect(typeof showToast.dismiss).toBe('function');
  });

  it('success returns a toast id', () => {
    const id = showToast.success('Test');
    expect(id).toBeDefined();
  });

  it('error returns a toast id', () => {
    const id = showToast.error('Oops');
    expect(id).toBeDefined();
  });
});
