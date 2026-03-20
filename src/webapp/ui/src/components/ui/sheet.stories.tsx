import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';
import { Button } from './button';

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  tags: ['autodocs'],
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button>Open Sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Operational context</SheetTitle>
            <SheetDescription>
              Use sheets for quick context without leaving the page.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 text-sm">This is the sheet content body.</div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
};
