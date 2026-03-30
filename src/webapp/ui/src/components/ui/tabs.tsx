import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TabsItem<TTab extends string> {
  id: TTab;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsListProps<TTab extends string> {
  items: readonly TabsItem<TTab>[];
  activeTab: TTab;
  onChange: (tab: TTab) => void;
  ariaLabel: string;
  idPrefix: string;
  className?: string;
  tabClassName?: string;
  variant?: 'pill' | 'underline';
}

function getEnabledTabs<TTab extends string>(items: readonly TabsItem<TTab>[]) {
  return items.filter((item) => !item.disabled);
}

function getNextEnabledTab<TTab extends string>(
  items: readonly TabsItem<TTab>[],
  activeTab: TTab,
  direction: 1 | -1
) {
  const enabled = getEnabledTabs(items);
  if (!enabled.length) return null;

  const currentIndex = Math.max(
    enabled.findIndex((item) => item.id === activeTab),
    0
  );
  const nextIndex = (currentIndex + direction + enabled.length) % enabled.length;
  return enabled[nextIndex]?.id ?? null;
}

function TabsList<TTab extends string>({
  items,
  activeTab,
  onChange,
  ariaLabel,
  idPrefix,
  className,
  tabClassName,
  variant = 'pill',
}: TabsListProps<TTab>) {
  const buttonRefs = React.useRef(new Map<string, HTMLButtonElement>());

  const focusTab = React.useCallback((tabId: TTab) => {
    const button = buttonRefs.current.get(String(tabId));
    button?.focus();
  }, []);

  const activateAndFocus = React.useCallback(
    (tabId: TTab | null) => {
      if (!tabId) return;
      onChange(tabId);
      focusTab(tabId);
    },
    [focusTab, onChange]
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          event.preventDefault();
          activateAndFocus(getNextEnabledTab(items, activeTab, 1));
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          event.preventDefault();
          activateAndFocus(getNextEnabledTab(items, activeTab, -1));
          break;
        }
        case 'Home': {
          event.preventDefault();
          const first = getEnabledTabs(items)[0]?.id ?? null;
          activateAndFocus(first);
          break;
        }
        case 'End': {
          event.preventDefault();
          const enabled = getEnabledTabs(items);
          const last = enabled[enabled.length - 1]?.id ?? null;
          activateAndFocus(last);
          break;
        }
        default:
          break;
      }
    },
    [activateAndFocus, activeTab, items]
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        variant === 'pill'
          ? 'flex items-center gap-1 rounded-2xl border border-border/70 bg-card/72 p-1.5 shadow-sm backdrop-blur-sm'
          : 'flex items-center gap-1 border-b',
        className
      )}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        const tabButtonClassName = cn(
          variant === 'pill'
            ? [
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-background/80 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
              ]
            : [
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
              ],
          tab.disabled && 'pointer-events-none opacity-60',
          tabClassName
        );

        if (isActive) {
          return (
            <button
              key={tab.id}
              ref={(element) => {
                if (element) {
                  buttonRefs.current.set(String(tab.id), element);
                  return;
                }
                buttonRefs.current.delete(String(tab.id));
              }}
              role="tab"
              type="button"
              disabled={tab.disabled}
              aria-selected="true"
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              id={`${idPrefix}-tab-${tab.id}`}
              tabIndex={0}
              onClick={() => onChange(tab.id)}
              onKeyDown={onKeyDown}
              className={tabButtonClassName}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) {
                buttonRefs.current.set(String(tab.id), element);
                return;
              }
              buttonRefs.current.delete(String(tab.id));
            }}
            role="tab"
            type="button"
            disabled={tab.disabled}
            aria-selected="false"
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            id={`${idPrefix}-tab-${tab.id}`}
            tabIndex={-1}
            onClick={() => onChange(tab.id)}
            onKeyDown={onKeyDown}
            className={tabButtonClassName}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export { TabsList };
