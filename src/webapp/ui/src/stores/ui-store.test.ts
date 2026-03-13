/**
 * Tests: Zustand UI store
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useUIStore.setState({
      sidebarOpen: true,
      activePage: 'dashboard',
      helpOpen: false,
      confirmDialog: null,
    });
  });

  it('toggles sidebar', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('sets sidebar open state', () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('sets active page', () => {
    useUIStore.getState().setActivePage('milestones');
    expect(useUIStore.getState().activePage).toBe('milestones');
  });

  it('toggles help', () => {
    expect(useUIStore.getState().helpOpen).toBe(false);
    useUIStore.getState().toggleHelp();
    expect(useUIStore.getState().helpOpen).toBe(true);
  });

  it('shows and dismisses confirm dialog', () => {
    const dialog = {
      title: 'Delete?',
      description: 'Are you sure?',
      onConfirm: () => {},
      variant: 'destructive' as const,
    };
    useUIStore.getState().showConfirm(dialog);
    expect(useUIStore.getState().confirmDialog).toEqual(dialog);
    useUIStore.getState().dismissConfirm();
    expect(useUIStore.getState().confirmDialog).toBeNull();
  });
});
