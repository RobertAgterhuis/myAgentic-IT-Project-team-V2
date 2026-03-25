import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { HelpPanel } from './help-panel';

const meta = {
  title: 'Help/HelpPanel',
  component: HelpPanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HelpPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          'https://fonts.googleapis.com/*',
          () =>
            new HttpResponse('body { --storybook-fonts-mocked: 1; }', {
              status: 200,
              headers: { 'content-type': 'text/css' },
            })
        ),
        http.get('/api/v1/help/page/commands', () =>
          HttpResponse.json({
            routeSlug: 'commands',
            routePath: '/commands',
            pageTitle: 'Commands',
            purpose: 'Queue and execute operational commands.',
            summary: 'Use this panel to run and monitor command workflows.',
            stateVariants: [],
            coreActions: [],
            keywords: ['commands', 'queue'],
            topicLinks: [],
            relatedTopics: [],
            lastUpdated: new Date().toISOString(),
          })
        ),
      ],
    },
  },
  args: { onClose: () => {} },
  render: () => (
    <MemoryRouter initialEntries={['/commands']}>
      <div className="min-h-screen bg-background p-6">
        <HelpPanel onClose={() => {}} />
      </div>
    </MemoryRouter>
  ),
};
