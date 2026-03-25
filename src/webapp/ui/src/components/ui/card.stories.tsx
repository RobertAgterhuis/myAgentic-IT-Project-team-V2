import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const CardTemplate = (props: React.ComponentProps<typeof Card>) => (
  <Card {...props} className="w-80">
    <CardHeader>
      <CardTitle>Card Title</CardTitle>
      <CardDescription>Card description goes here.</CardDescription>
    </CardHeader>
    <CardContent>
      <p>Card body content with details.</p>
    </CardContent>
    <CardFooter>
      <Button size="sm">Action</Button>
    </CardFooter>
  </Card>
);

export const Outlined: Story = {
  render: () => <CardTemplate elevation="outlined" />,
};

export const Raised: Story = {
  render: () => <CardTemplate elevation="raised" />,
};

export const Flat: Story = {
  render: () => <CardTemplate elevation="flat" />,
};

export const InfoTone: Story = {
  render: () => <CardTemplate tone="info" />,
};

export const WarningTone: Story = {
  render: () => <CardTemplate tone="warning" />,
};

export const ErrorTone: Story = {
  render: () => <CardTemplate tone="error" />,
};

export const SuccessTone: Story = {
  render: () => <CardTemplate tone="success" />,
};

export const Clickable: Story = {
  render: () => (
    <Card clickable onClick={() => undefined} className="w-80">
      <CardHeader>
        <CardTitle>Clickable Card</CardTitle>
        <CardDescription>Card acts as a single interactive target.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Click anywhere on this card to trigger its action.</p>
      </CardContent>
      <CardFooter>
        <span className="text-sm text-muted-foreground">No nested interactive controls.</span>
      </CardFooter>
    </Card>
  ),
};

export const AllElevations: Story = {
  render: () => (
    <div className="flex gap-4">
      <CardTemplate elevation="flat" />
      <CardTemplate elevation="outlined" />
      <CardTemplate elevation="raised" />
    </div>
  ),
};
