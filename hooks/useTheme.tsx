/**
 * Theme Context Provider
 *
 * Provides theme and color values to the entire app via React Context.
 * Supports dynamic API-driven color overrides with AsyncStorage caching.
 *
 * Components use the same `useTheme()` hook regardless of whether
 * colors come from defaults or the API.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, getThemeColorsWithOverrides, ThemeType } from '@/constants/Colors';
import { RemoteThemeOverrides } from '@/constants/remoteThemeTypes';
import { loadCachedOverrides, fetchThemeOverrides, clearThemeCache } from '@/services/themeService';

interface ThemeContextType {
  theme: ThemeType;
  colors: ReturnType<typeof getThemeColors>;
  /** Re-fetch theme overrides from the API */
  refreshTheme: () => Promise<void>;
  /** Whether a background theme fetch is in progress */
  isLoadingTheme: boolean;
  /** Clear remote overrides and revert to hardcoded defaults */
  clearRemoteTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const theme = (colorScheme === 'dark' ? 'dark' : 'light') as ThemeType;

  const [overrides, setOverrides] = useState<RemoteThemeOverrides | null>(null);
  const [isLoadingTheme, setIsLoadingTheme] = useState(false);

  // Compute colors: apply overrides if available, otherwise use defaults
  const colors = overrides
    ? getThemeColorsWithOverrides(theme, overrides)
    : getThemeColors(theme);

  // On mount: load cached overrides first, then fetch fresh from API
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Step 1: Load cached overrides for instant display
      const cached = await loadCachedOverrides();
      if (mounted && cached) {
        setOverrides(cached);
      }

      // Step 2: Fetch fresh from API in background
      setIsLoadingTheme(true);
      const fresh = await fetchThemeOverrides();
      if (mounted) {
        if (fresh) {
          setOverrides(fresh);
        }
        setIsLoadingTheme(false);
      }
    };

    init();

    return () => { mounted = false; };
  }, []);

  // Manual refresh (e.g. pull-to-refresh, settings screen)
  const refreshTheme = useCallback(async () => {
    setIsLoadingTheme(true);
    const fresh = await fetchThemeOverrides();
    if (fresh) {
      setOverrides(fresh);
    }
    setIsLoadingTheme(false);
  }, []);

  // Clear remote overrides and revert to defaults
  const clearRemoteTheme = useCallback(async () => {
    await clearThemeCache();
    setOverrides(null);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, colors, refreshTheme, isLoadingTheme, clearRemoteTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme colors and current theme in any component
 *
 * Usage:
 * ```tsx
 * const { colors, theme } = useTheme();
 *
 * <Text style={{ color: colors.textPrimary }}>Hello</Text>
 * ```
 *
 * Additional API-driven features:
 * ```tsx
 * const { refreshTheme, isLoadingTheme, clearRemoteTheme } = useTheme();
 * ```
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
