'use client';

import { useEffect } from 'react';
import { getSettings, applyTheme } from '../lib/settings';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // Initialize theme immediately on mount
    const settings = getSettings();
    applyTheme(settings.theme);
  }, []);

  return <>{children}</>;
}
