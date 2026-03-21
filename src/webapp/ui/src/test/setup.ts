import '@testing-library/jest-dom/vitest';
import { act } from '@testing-library/react';
import { notifyManager } from '@tanstack/react-query';
import { server } from './msw-server';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom does not implement window.matchMedia — provide a minimal stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

notifyManager.setNotifyFunction((callback) => {
  act(() => {
    callback();
  });
});
