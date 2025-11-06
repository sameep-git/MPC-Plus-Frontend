'use client';

import { useState, useEffect } from 'react';
import { fetchUser, handleApiError, type User } from '../../lib/api';
import { Navbar, Button } from '../../components/ui';
import {
  getSettings,
  saveSettings,
  updateTheme,
  updateThresholds,
  updateGraphThresholds,
  type Theme,
  type BeamThresholds,
  type AppSettings,
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

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleThemeChange = (theme: Theme) => {
    updateTheme(theme);
    setSettings((prev) => ({ ...prev, theme }));
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

  const handleReset = () => {
    const defaultSettings = getSettings();
    // Reset to true defaults
    defaultSettings.theme = 'light';
    defaultSettings.graphThresholdTopPercent = 16.67;
    defaultSettings.graphThresholdBottomPercent = 16.67;
    defaultSettings.graphThresholdColor = '#fef3c7';
    defaultSettings.thresholds = {
      'beam-2.5x': {
        outputChange: { min: -3, max: 3 },
        uniformityChange: { min: -2.5, max: 2.5 },
        centerShift: { min: -2, max: 2 },
      },
      'beam-6x': {
        outputChange: { min: -3, max: 3 },
        uniformityChange: { min: -2.5, max: 2.5 },
        centerShift: { min: -2, max: 2 },
      },
      'beam-6xfff': {
        outputChange: { min: -3, max: 3 },
        uniformityChange: { min: -2.5, max: 2.5 },
        centerShift: { min: -2, max: 2 },
      },
      'beam-10x': {
        outputChange: { min: -3, max: 3 },
        uniformityChange: { min: -2.5, max: 2.5 },
        centerShift: { min: -2, max: 2 },
      },
    };
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

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">Error loading user: {error}</p>
          </div>
        )}

        {/* Theme Settings */}
        <section className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Theme</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Choose your preferred theme for the application.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => handleThemeChange('light')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                settings.theme === 'light'
                  ? 'bg-purple-900 text-white dark:bg-purple-700'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-purple-900 text-white dark:bg-purple-700'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Dark
            </button>
          </div>
        </section>

        {/* Beam Threshold Settings */}
        <section className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
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
                        <input
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
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Max:</label>
                        <input
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
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
        <section className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
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
                <input
                  type="number"
                  step="0.01"
                  value={settings.graphThresholdTopPercent}
                  onChange={(e) =>
                    handleGraphThresholdChange(parseFloat(e.target.value) || 0, undefined, undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bottom Threshold (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.graphThresholdBottomPercent}
                  onChange={(e) =>
                    handleGraphThresholdChange(undefined, parseFloat(e.target.value) || 0, undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Threshold Color
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={settings.graphThresholdColor}
                  onChange={(e) => handleGraphThresholdChange(undefined, undefined, e.target.value)}
                  className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.graphThresholdColor}
                  onChange={(e) => handleGraphThresholdChange(undefined, undefined, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#fef3c7"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Other Settings */}
        <section className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Other Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Auto-refresh Data
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Automatically refresh data every 30 seconds
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Receive email notifications for threshold alerts
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="text"
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
