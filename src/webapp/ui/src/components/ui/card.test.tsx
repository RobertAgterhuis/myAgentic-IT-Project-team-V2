import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card', () => {
  it('renders with header, body, footer slots', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it.each(['flat', 'raised', 'outlined'] as const)('renders elevation=%s', (elevation) => {
    render(<Card data-testid="card" elevation={elevation} />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-elevation', elevation);
  });

  it.each(['default', 'info', 'warning', 'error', 'success'] as const)(
    'renders tone=%s',
    (tone) => {
      render(<Card data-testid="card" tone={tone} />);
      expect(screen.getByTestId('card')).toHaveAttribute('data-tone', tone);
    }
  );

  it('clickable card has role=button and responds to click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card clickable onClick={onClick}>
        Click me
      </Card>
    );
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '0');
    await user.click(card);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('defaults to outlined elevation and default tone', () => {
    render(<Card data-testid="card" />);
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('data-elevation', 'outlined');
    expect(card).toHaveAttribute('data-tone', 'default');
  });
});
