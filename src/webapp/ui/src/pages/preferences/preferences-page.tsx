/**
 * PreferencesPage — dedicated user preferences surface.
 * Extends beyond the theme toggle with notification, display, and timezone settings.
 * Issue #1569
 */
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heading, Text } from '@/components/ui/typography';
import { useTheme } from '@/components/ui/use-theme';
import type { ThemePreference } from '@/components/ui/theme-context';
import { Check, Monitor, Moon, Sun, Bell, Layout, Clock, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'user-preferences';

interface UserPreferences {
  notifyApprovals: boolean;
  notifyFailures: boolean;
  notifyEscalations: boolean;
  displayDensity: 'comfortable' | 'compact';
  timezone: 'local' | 'utc';
  heroCollapsed: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  notifyApprovals: true,
  notifyFailures: true,
  notifyEscalations: true,
  displayDensity: 'comfortable',
  timezone: 'local',
  heroCollapsed: false,
};

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable
  }
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-sm ring-0 transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);
  const [saved, setSaved] = useState(false);

  const update = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
    setSaved(false);
  }, []);

  const handleReset = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    savePreferences(DEFAULT_PREFS);
    setTheme('system');
    setSaved(false);
  }, [setTheme]);

  const handleSave = useCallback(() => {
    savePreferences(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [prefs]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <Heading level={1}>Preferences</Heading>
        <Text muted className="mt-1">
          Customize your platform experience. Changes are saved locally.
        </Text>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="size-4 text-amber-500" />
            <Heading level={3}>Appearance</Heading>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Text muted className="text-sm">
            Choose your preferred color theme.
          </Text>
          <div className="flex gap-2">
            {(
              [
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const selected = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value as ThemePreference)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="size-4" />
                  {option.label}
                  {selected && <Check className="size-3" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-blue-500" />
            <Heading level={3}>Notifications</Heading>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Text muted className="text-sm">
            Control which events appear in your notification center.
          </Text>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">Approval requests</span>
              <ToggleSwitch
                checked={prefs.notifyApprovals}
                onChange={(v) => update({ notifyApprovals: v })}
                label="Toggle approval notifications"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Pipeline failures</span>
              <ToggleSwitch
                checked={prefs.notifyFailures}
                onChange={(v) => update({ notifyFailures: v })}
                label="Toggle failure notifications"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Escalations</span>
              <ToggleSwitch
                checked={prefs.notifyEscalations}
                onChange={(v) => update({ notifyEscalations: v })}
                label="Toggle escalation notifications"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layout className="size-4 text-purple-500" />
            <Heading level={3}>Display</Heading>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Text className="text-sm font-medium mb-2">Density</Text>
            <div className="flex gap-2">
              {(['comfortable', 'compact'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update({ displayDensity: d })}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    prefs.displayDensity === d
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between">
            <span className="text-sm">Collapse hero on dashboard by default</span>
            <ToggleSwitch
              checked={prefs.heroCollapsed}
              onChange={(v) => update({ heroCollapsed: v })}
              label="Toggle hero collapse default"
            />
          </label>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-teal-500" />
            <Heading level={3}>Timezone</Heading>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['local', 'utc'] as const).map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => update({ timezone: tz })}
                className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                  prefs.timezone === tz
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {tz === 'local' ? 'Local time' : 'UTC'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
          <RotateCcw className="size-3" /> Reset to defaults
        </Button>
        <Button size="sm" onClick={handleSave}>
          {saved ? (
            <>
              <Check className="size-3 mr-1" /> Saved
            </>
          ) : (
            'Save preferences'
          )}
        </Button>
      </div>
    </div>
  );
}
