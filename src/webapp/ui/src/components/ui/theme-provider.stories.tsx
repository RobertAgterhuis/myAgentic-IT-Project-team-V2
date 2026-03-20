import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from './theme-provider';
import { useTheme } from './use-theme';
import { Button } from './button';

const meta = {
  title: 'UI/ThemeProvider',
  component: ThemeProvider,
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

function ThemePreview() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-3">
      <div className="text-sm">Current theme: {theme}</div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setTheme('light')}>
          Light
        </Button>
        <Button variant="outline" onClick={() => setTheme('dark')}>
          Dark
        </Button>
        <Button variant="outline" onClick={() => setTheme('system')}>
          System
        </Button>
      </div>
    </div>
  );
}

export const Default: Story = {
  args: { children: null },
  render: () => (
    <ThemeProvider>
      <ThemePreview />
    </ThemeProvider>
  ),
};
