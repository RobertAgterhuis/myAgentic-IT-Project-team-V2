/**
 * Storybook stories for TraceabilityExplorerPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import TraceabilityExplorerPage from './traceability-explorer-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/TraceabilityExplorer',
  component: TraceabilityExplorerPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TraceabilityExplorerPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const googleFontsHandler = http.get(
  'https://fonts.googleapis.com/*',
  () =>
    new HttpResponse('body { --storybook-fonts-mocked: 1; }', {
      status: 200,
      headers: { 'content-type': 'text/css' },
    })
);

const traceData = {
  entities: [
    {
      id: 'REQ-001',
      type: 'requirement',
      label: 'User login flow',
      links_to: ['DES-001', 'CODE-001'],
    },
    { id: 'DES-001', type: 'design', label: 'Login screen wireframe', links_to: ['CODE-001'] },
    { id: 'CODE-001', type: 'code', label: 'auth-controller.ts', links_to: ['TEST-001'] },
    { id: 'TEST-001', type: 'test', label: 'auth.spec.ts', links_to: [] },
  ],
  gaps: [
    {
      entity_id: 'REQ-002',
      type: 'requirement',
      label: 'Password reset',
      missing: ['design', 'code', 'test'],
      severity: 'critical',
    },
  ],
  coverage: { requirement: 0.85, design: 0.75, code: 0.9, test: 0.65, overall: 0.79 },
};

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        googleFontsHandler,
        http.get('/api/traceability', () => HttpResponse.json(traceData)),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        googleFontsHandler,
        http.get('/api/traceability', () =>
          HttpResponse.json({
            entities: [],
            gaps: [],
            coverage: { requirement: 0, design: 0, code: 0, test: 0, overall: 0 },
          })
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        googleFontsHandler,
        http.get('/api/traceability', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        googleFontsHandler,
        http.get('/api/traceability', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
      ],
    },
  },
};
