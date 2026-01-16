'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUser, handleApiError } from '../../lib/api';
import {
  Navbar,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  DatePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui';
import { NAVIGATION } from '../../constants';
import { TEAM_COLORS } from '../../constants/teamColors';
import {
  getSettings,
  getDefaultAppSettings,
  saveSettings,
  updateTheme,
  updateAccentColor,
  updateThresholds,
  updateGraphThresholds,
  updateBaselineSettings,
  DEFAULT_ACCENT_COLOR,
  type Theme,
  type BeamThresholds,
  type AppSettings,
  type BaselineMode,
  type BaselineManualValues,
} from '../../lib/settings';

const BEAM_NAMES = {
  'beam-2.5x': 'Beam Check (2.5x)',
  'beam-6x': 'Beam Check (6x)',
  'beam-6xfff': 'Beam Check (6xFFF)',
  'beam-10x': 'Beam Check (10x)',
} as const;

const METRIC_NAMES = {
  outputChange: 'Output Change (%)',
  uniformityChange: 'Uniformity Change (%)',
  centerShift: 'Center Shift',
} as const;

const MANUAL_BASELINE_FIELDS: Array<{ key: keyof BaselineManualValues; label: string; helper?: string }> = [
  {
    key: 'outputChange',
    label: 'Output Change (%)',
    helper: 'Baseline output delta for MPC comparisons.',
  },
  {
    key: 'uniformityChange',
    label: 'Uniformity Change (%)',
    helper: 'Baseline uniformity delta to compare day-to-day changes.',
  },
  {
    key: 'centerShift',
    label: 'Center Shift',
    helper: 'Baseline couch/beam center shift reference.',
  },
];

const SETTINGS_SECTIONS = [
  { id: 'theme-settings', label: 'Theme & Accent' },
  { id: 'beam-threshold-settings', label: 'Beam Thresholds' },
  { id: 'graph-threshold-settings', label: 'Graph Threshold' },
  { id: 'baseline-settings', label: 'Baseline' },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name?: string; role?: string } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setError(null);
        const userData = await fetchUser();
        setUser(userData);
      } catch (error) {
        const errorMessage = handleApiError(error);
        setError(errorMessage);
        console.error('Error loading user:', error);
      } finally {

      }
    };

    loadUser();
  }, []);

  // Handle browser back button to navigate to calendar (results) page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      // Only navigate to calendar if we're not just changing the hash
      // If the state has fromSettings, it means we're going back from settings
      if (event.state?.fromSettings && !window.location.hash) {
        router.replace(NAVIGATION.ROUTES.MPC_RESULT);
      }
    };

    // Add a history entry so we can intercept the back button
    // Only if we don't already have a hash in the URL
    if (!window.location.hash) {
      window.history.pushState({ fromSettings: true }, '', window.location.href);
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router]);

  const handleThemeChange = (theme: Theme) => {
    updateTheme(theme);
    setSettings((prev) => ({ ...prev, theme }));
  };

  const handleAccentChange = (color: string) => {
    updateAccentColor(color);
    setSettings((prev) => ({ ...prev, accentColor: color }));
  };

  const handleThresholdChange = (
    beamId: keyof BeamThresholds,
    metric: 'outputChange' | 'uniformityChange' | 'centerShift',
    field: 'min' | 'max',
    value: number
  ) => {
    const newThresholds = {
      ...settings.thresholds,
      [beamId]: {
        ...settings.thresholds[beamId],
        [metric]: {
          ...settings.thresholds[beamId][metric],
          [field]: value,
        },
      },
    };
    setSettings((prev) => ({ ...prev, thresholds: newThresholds }));
    updateThresholds(newThresholds);
  };

  const handleGraphThresholdChange = (
    topPercent?: number,
    bottomPercent?: number,
    color?: string
  ) => {
    const newSettings = { ...settings };
    if (topPercent !== undefined) newSettings.graphThresholdTopPercent = topPercent;
    if (bottomPercent !== undefined) newSettings.graphThresholdBottomPercent = bottomPercent;
    if (color !== undefined) newSettings.graphThresholdColor = color;
    setSettings(newSettings);
    updateGraphThresholds(topPercent, bottomPercent, color);
  };

  const ensureIsoDate = (date: Date) => date.toISOString().split('T')[0];

  const handleBaselineModeChange = (mode: BaselineMode) => {
    const nextDate = settings.baseline.date ?? ensureIsoDate(new Date());
    const updatedBaseline = {
      ...settings.baseline,
      mode,
      date: mode === 'date' ? nextDate : settings.baseline.date,
    };

    setSettings((prev) => ({ ...prev, baseline: updatedBaseline }));
    updateBaselineSettings({
      mode,
      ...(mode === 'date' ? { date: nextDate } : {}),
    });
  };

  const handleBaselineDateChange = (dateString: string) => {
    const normalizedDate = dateString || undefined;
    setSettings((prev) => ({
      ...prev,
      baseline: {
        ...prev.baseline,
        date: normalizedDate,
        mode: 'date',
      },
    }));
    updateBaselineSettings({ date: normalizedDate, mode: 'date' });
  };

  const handleManualBaselineChange = (field: keyof BaselineManualValues, value: number) => {
    const updatedManualValues: BaselineManualValues = {
      ...settings.baseline.manualValues,
      [field]: value,
    };
    setSettings((prev) => ({
      ...prev,
      baseline: {
        ...prev.baseline,
        manualValues: updatedManualValues,
      },
    }));
    updateBaselineSettings({ manualValues: updatedManualValues });
  };

  const handleBaselineUseToday = () => {
    const today = ensureIsoDate(new Date());
    setSettings((prev) => ({
      ...prev,
      baseline: {
        ...prev.baseline,
        mode: 'date',
        date: today,
      },
    }));
    updateBaselineSettings({ mode: 'date', date: today });
  };

  const handleReset = () => {
    const defaultSettings = getDefaultAppSettings();
    saveSettings(defaultSettings);
    setSettings(defaultSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <Navbar user={user} />

      <main className="p-6 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

        <nav
          aria-label="Settings sections"
          className="mb-8 flex flex-wrap gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
        >
          {SETTINGS_SECTIONS.map((section) => (
            <Button
              key={section.id}
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(section.id);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary-foreground border-gray-200 dark:border-gray-700"
            >
              {section.label}
            </Button>
          ))}
        </nav>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">Error loading user: {error}</p>
          </div>
        )}

        {/* Theme Settings */}
        <section
          id="theme-settings"
          className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 scroll-mt-24"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Theme</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Choose your preferred theme for the application.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => handleThemeChange('light')}
              variant={settings.theme === 'light' ? 'default' : 'outline'}
              className="w-32"
            >
              Light
            </Button>
            <Button
              onClick={() => handleThemeChange('dark')}
              variant={settings.theme === 'dark' ? 'default' : 'outline'}
              className="w-32"
            >
              Dark
            </Button>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Accent Color
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Select your favorite team color as the accent for the application.
            </p>
            <div className="max-w-md">
              <Select
                value={settings.accentColor}
                onValueChange={handleAccentChange}
              >
                <SelectTrigger className="w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 h-12">
                  <SelectValue placeholder="Select a team color" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TEAM_COLORS.map((team) => (
                    <SelectItem key={team.color} value={team.color}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-200 shadow-sm shrink-0"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="truncate">{team.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Beam Threshold Settings */}
        <section
          id="beam-threshold-settings"
          className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 scroll-mt-24"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Beam Threshold Values
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Configure threshold values for each beam type. These values determine when checks pass,
            fail, or show warnings.
          </p>

          <div className="space-y-8">
            {(Object.keys(settings.thresholds) as Array<keyof BeamThresholds>).map((beamId) => (
              <div
                key={beamId}
                className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {BEAM_NAMES[beamId]}
                </h3>
                <div className="space-y-4">
                  {(Object.keys(settings.thresholds[beamId]) as Array<
                    'outputChange' | 'uniformityChange' | 'centerShift'
                  >).map((metric) => (
                    <div key={metric} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[180px]">
                          {METRIC_NAMES[metric]}:
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Min:</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={settings.thresholds[beamId][metric].min}
                          onChange={(e) =>
                            handleThresholdChange(
                              beamId,
                              metric,
                              'min',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Max:</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={settings.thresholds[beamId][metric].max}
                          onChange={(e) =>
                            handleThresholdChange(
                              beamId,
                              metric,
                              'max',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Graph Threshold Settings */}
        <section
          id="graph-threshold-settings"
          className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 scroll-mt-24"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Graph Threshold Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Configure the threshold visualization for graphs in the result detail page.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top Threshold (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.graphThresholdTopPercent}
                  onChange={(e) =>
                    handleGraphThresholdChange(parseFloat(e.target.value) || 0, undefined, undefined)
                  }
                  className="bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bottom Threshold (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.graphThresholdBottomPercent}
                  onChange={(e) =>
                    handleGraphThresholdChange(undefined, parseFloat(e.target.value) || 0, undefined)
                  }
                  className="bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Threshold Color
              </label>
              <div className="flex gap-4 items-center">
                <Input
                  type="color"
                  value={settings.graphThresholdColor}
                  onChange={(e) => handleGraphThresholdChange(undefined, undefined, e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings.graphThresholdColor}
                  onChange={(e) => handleGraphThresholdChange(undefined, undefined, e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-900"
                  placeholder="#fef3c7"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Baseline Settings */}
        <section
          id="baseline-settings"
          className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 scroll-mt-24"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Baseline Settings</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Choose how graph baselines are defined. Baselines appear as a horizontal line on result graphs, and metric
            values are plotted as their change relative to this baseline.
          </p>

          <div className="space-y-6">
            <RadioGroup
              value={settings.baseline.mode}
              onValueChange={(val) => handleBaselineModeChange(val as BaselineMode)}
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date" id="mode-date" />
                <Label htmlFor="mode-date">Use values from a specific date</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="mode-manual" />
                <Label htmlFor="mode-manual">Set manual baseline values</Label>
              </div>
            </RadioGroup>

            {settings.baseline.mode === 'date' && (
              <div className="w-full md:w-auto">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Baseline Date
                </label>
                <div className="flex flex-row flex-wrap gap-3 items-center">
                  <DatePicker
                    date={settings.baseline.date ? new Date(settings.baseline.date) : undefined}
                    setDate={(date) => {
                      if (date) {
                        // Adjust for timezone offset to ensure YYYY-MM-DD matches local selection
                        const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                        const isoDate = offsetDate.toISOString().split('T')[0];
                        handleBaselineDateChange(isoDate);
                      }
                    }}
                    className="w-64"
                  />
                  <Button onClick={handleBaselineUseToday} className="flex-shrink-0">
                    Use Today
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Graph values will show the difference from measurements captured on this date.
                </p>
              </div>
            )}

            {settings.baseline.mode === 'manual' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MANUAL_BASELINE_FIELDS.map(({ key, label, helper }) => (
                  <div key={key} className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.baseline.manualValues[key]}
                      onChange={(e) => handleManualBaselineChange(key, parseFloat(e.target.value) || 0)}
                      className="bg-white dark:bg-gray-900"
                    />
                    {helper && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{helper}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            Reset to Defaults
          </Button>
          {saved && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <span className="text-sm font-medium">Settings saved!</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
