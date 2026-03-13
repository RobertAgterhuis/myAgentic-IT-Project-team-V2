import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidePanel, type NavSection } from './side-panel';

const sections: NavSection[] = [
  {
    id: 'phase1',
    title: 'Phase 1',
    progress: 75,
    items: [
      { id: 'ba', label: 'Business Analyst' },
      { id: 'de', label: 'Domain Expert' },
    ],
  },
  {
    id: 'phase2',
    title: 'Phase 2',
    items: [{ id: 'sa', label: 'Software Architect' }],
  },
];

describe('SidePanel', () => {
  it('renders with navigation landmark', () => {
    render(<SidePanel sections={sections} />);
    expect(screen.getByRole('navigation', { name: 'Side navigation' })).toBeInTheDocument();
  });

  it('renders section titles and items', () => {
    render(<SidePanel sections={sections} />);
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    expect(screen.getByText('Domain Expert')).toBeInTheDocument();
    expect(screen.getByText('Software Architect')).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<SidePanel sections={sections} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('highlights active item with aria-current=page', () => {
    render(<SidePanel sections={sections} activeItemId="ba" />);
    expect(screen.getByText('Business Analyst').closest('button')).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('calls onItemSelect when clicking an item', async () => {
    const user = userEvent.setup();
    const onItemSelect = vi.fn();
    render(<SidePanel sections={sections} onItemSelect={onItemSelect} />);
    await user.click(screen.getByText('Domain Expert'));
    expect(onItemSelect).toHaveBeenCalledWith('de');
  });

  it('collapse toggle changes aria-label', async () => {
    const user = userEvent.setup();
    const onCollapse = vi.fn();
    render(<SidePanel sections={sections} onCollapse={onCollapse} />);
    const btn = screen.getByRole('button', { name: 'Collapse sidebar' });
    await user.click(btn);
    expect(onCollapse).toHaveBeenCalledWith(true);
  });

  it('sections can be collapsed/expanded', async () => {
    const user = userEvent.setup();
    render(<SidePanel sections={sections} />);
    const sectionBtn = screen.getByText('Phase 1').closest('button')!;
    expect(sectionBtn).toHaveAttribute('aria-expanded', 'true');
    await user.click(sectionBtn);
    expect(sectionBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Business Analyst')).not.toBeInTheDocument();
  });
});
