/**
 * MSW server setup for Vitest (Node environment).
 */
import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';

export const server = setupServer(...handlers);
