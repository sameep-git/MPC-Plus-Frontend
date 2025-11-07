// Settings management for MPC Plus application
// Handles theme and threshold settings with localStorage persistence

export type Theme = 'light' | 'dark';

export interface BeamThresholds {
  'beam-2.5x': {
    outputChange: { min: number; max: number };
    uniformityChange: { min: number; max: number };
    centerShift: { min: number; max: number };
  };
  'beam-6x': {
    outputChange: { min: number; max: number };
    uniformityChange: { min: number; max: number };
    centerShift: { min: number; max: number };
  };
  'beam-6xfff': {
    outputChange: { min: number; max: number };
    uniformityChange: { min: number; max: number };
    centerShift: { min: number; max: number };
  };
  'beam-10x': {
    outputChange: { min: number; max: number };
    uniformityChange: { min: number; max: number };
    centerShift: { min: number; max: number };
  };
}

export interface AppSettings {
  theme: Theme;
  thresholds: BeamThresholds;
  graphThresholdTopPercent: number;
  graphThresholdBottomPercent: number;
  graphThresholdColor: string;
}

const DEFAULT_THRESHOLDS: BeamThresholds = {
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

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  thresholds: DEFAULT_THRESHOLDS,
  graphThresholdTopPercent: 16.67,
  graphThresholdBottomPercent: 16.67,
  graphThresholdColor: '#fef3c7',
};

const STORAGE_KEY = 'mpc-plus-settings';

export const getSettings = (): AppSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new settings fields
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        thresholds: {
          ...DEFAULT_THRESHOLDS,
          ...parsed.thresholds,
        },
      };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Apply theme immediately
    applyTheme(settings.theme);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const updateTheme = (theme: Theme): void => {
  const settings = getSettings();
  settings.theme = theme;
  saveSettings(settings);
  applyTheme(theme);
};

export const updateThresholds = (thresholds: Partial<BeamThresholds>): void => {
  const settings = getSettings();
  settings.thresholds = {
    ...settings.thresholds,
    ...thresholds,
  };
  saveSettings(settings);
};

export const updateGraphThresholds = (
  topPercent?: number,
  bottomPercent?: number,
  color?: string
): void => {
  const settings = getSettings();
  if (topPercent !== undefined) settings.graphThresholdTopPercent = topPercent;
  if (bottomPercent !== undefined) settings.graphThresholdBottomPercent = bottomPercent;
  if (color !== undefined) settings.graphThresholdColor = color;
  saveSettings(settings);
};

export const applyTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};
