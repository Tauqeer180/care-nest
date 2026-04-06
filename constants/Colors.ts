/**
 * CareNest Theme Colors Configuration
 * 
 * This is the single source of truth for all colors used in the application.
 * Colors are organized by semantic purpose and can be easily modified from this file.
 * 
 * To customize theme:
 * 1. Update color values in the appropriate palette section
 * 2. Changes automatically apply across the entire app
 * 3. No need to modify component files
 *
 * For API-driven overrides, use getThemeColorsWithOverrides() which
 * deep-merges remote partial overrides onto these defaults.
 */

import { RemoteThemeOverrides } from '@/constants/remoteThemeTypes';
import { deepMerge } from '@/utils/deepMerge';

// Primary Brand Colors (from web design)
export const BrandColors = {
  primary: '#2332dd',      // CareNest Blue
  primaryLight: 'rgba(0, 0, 0, 0.15)',  // Hover state
  primaryDark: '#1a25b8',   // Active/pressed state

  secondary: '#2332dd',     // Sidebar/accent blue
  secondaryLight: '#3d4ce3', // Lighter variant
  secondaryDark: '#1a25b8', // Darker variant

  accent: '#2332dd',        // Accent elements
};

// Neutral Colors (Light Theme)
export const NeutralLight = {
  // Background
  background: '#FFFFFF',
  backgroundAlt: '#F5F5F5',
  backgroundElevated: '#FFFFFF',
  
  // Text
  textPrimary: '#11181C',      // Main text
  textSecondary: '#666666',    // Secondary text
  textTertiary: '#999999',     // Tertiary/muted text
  textInverse: '#FFFFFF',      // Text on dark backgrounds
  
  // Borders & Dividers
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  divider: '#E0E0E0',
  
  // Interactive Elements
  disabled: '#CCCCCC',
  placeholder: '#999999',
};

// Neutral Colors (Dark Theme - Matching your web design)
export const NeutralDark = {
  // Background
  background: '#1A1A1A',       // Very dark background
  backgroundAlt: '#262626',    // Slightly lighter alt background
  backgroundElevated: '#2D2D2D', // Elevated/card background
  
  // Text
  textPrimary: '#FFFFFF',      // Main text (white)
  textSecondary: '#CCCCCC',    // Secondary text
  textTertiary: '#999999',     // Tertiary/muted text
  textInverse: '#1A1A1A',      // Text on light backgrounds
  
  // Borders & Dividers
  border: '#404040',
  borderLight: '#2D2D2D',
  divider: '#353535',
  
  // Interactive Elements
  disabled: '#555555',
  placeholder: '#888888',
};

// Status Colors (used in both themes)
export const StatusColors = {
  success: '#10B981',     // Green for success messages
  successLight: '#34D399',
  successDark: '#059669',
  
  error: '#EF4444',       // Red for errors
  errorLight: '#F87171',
  errorDark: '#DC2626',
  
  warning: '#F59E0B',     // Amber for warnings
  warningLight: '#FBBF24',
  warningDark: '#D97706',
  
  info: '#2332dd',        // Blue for info (same as brand)
  infoLight: '#3d4ce3',
  infoDark: '#1a25b8',
};

// Complete Theme Definition
export type ThemeType = 'light' | 'dark';

export const getThemeColors = (theme: ThemeType) => {
  const neutral = theme === 'dark' ? NeutralDark : NeutralLight;
  
  return {
    // Brand
    brand: BrandColors,
    primary: BrandColors.primary,
    secondary: BrandColors.secondary,
    accent: BrandColors.accent,
    
    // Neutral
    ...neutral,
    
    // Status
    ...StatusColors,
    
    // Component-specific colors
    tabBar: {
      background: neutral.background,
      activeTint: BrandColors.primary,
      inactiveTint: neutral.textTertiary,
    },
    
    button: {
      primary: BrandColors.primary,
      primaryText: '#ffffff',
      secondary: neutral.backgroundAlt,
      secondaryText: neutral.textPrimary,
      disabled: neutral.disabled,
      disabledText: neutral.textTertiary,
    },
    
    input: {
      background: neutral.backgroundElevated,
      border: neutral.border,
      text: neutral.textPrimary,
      placeholder: neutral.placeholder,
      focused: BrandColors.primary,
    },
    
    card: {
      background: neutral.backgroundElevated,
      border: neutral.border,
      shadow: theme === 'dark' ? '#000000' : '#00000010',
    },
    
    link: {
      color: BrandColors.secondary,
      colorHover: BrandColors.secondaryLight,
      colorActive: BrandColors.secondaryDark,
    },
  };
};

/**
 * Generate theme colors with remote API overrides applied.
 * Overrides are deep-merged over defaults — any provided field wins,
 * everything else stays at its default value.
 */
export const getThemeColorsWithOverrides = (
  theme: ThemeType,
  overrides: RemoteThemeOverrides | null
): ReturnType<typeof getThemeColors> => {
  if (!overrides) return getThemeColors(theme);

  // Layer 1: Brand overrides
  const brand = deepMerge(BrandColors, overrides.brand);

  // Layer 2: Neutral overrides (theme-specific)
  const baseNeutral = theme === 'dark' ? NeutralDark : NeutralLight;
  const neutralOverride = theme === 'dark' ? overrides.dark : overrides.light;
  const neutral = deepMerge(baseNeutral, neutralOverride);

  // Layer 3: Status overrides
  const status = deepMerge(StatusColors, overrides.status);

  // Layer 4: Build computed colors (same structure as getThemeColors)
  const colors = {
    brand,
    primary: brand.primary,
    secondary: brand.secondary,
    accent: brand.accent,
    ...neutral,
    ...status,
    tabBar: {
      background: neutral.background,
      activeTint: brand.primary,
      inactiveTint: neutral.textTertiary,
    },
    button: {
      primary: brand.primary,
      primaryText: '#ffffff',
      secondary: neutral.backgroundAlt,
      secondaryText: neutral.textPrimary,
      disabled: neutral.disabled,
      disabledText: neutral.textTertiary,
    },
    input: {
      background: neutral.backgroundElevated,
      border: neutral.border,
      text: neutral.textPrimary,
      placeholder: neutral.placeholder,
      focused: brand.primary,
    },
    card: {
      background: neutral.backgroundElevated,
      border: neutral.border,
      shadow: theme === 'dark' ? '#000000' : '#00000010',
    },
    link: {
      color: brand.secondary,
      colorHover: brand.secondaryLight,
      colorActive: brand.secondaryDark,
    },
  };

  // Layer 5: Component-level overrides (if API sent specific component colors)
  const themeOverride = theme === 'dark' ? overrides.dark : overrides.light;
  if (themeOverride) {
    if (themeOverride.tabBar) colors.tabBar = deepMerge(colors.tabBar, themeOverride.tabBar);
    if (themeOverride.button) colors.button = deepMerge(colors.button, themeOverride.button);
    if (themeOverride.input) colors.input = deepMerge(colors.input, themeOverride.input);
    if (themeOverride.card) colors.card = deepMerge(colors.card, themeOverride.card);
    if (themeOverride.link) colors.link = deepMerge(colors.link, themeOverride.link);
  }

  return colors;
};

// Export color schemes for easy access
export const Colors = {
  light: getThemeColors('light'),
  dark: getThemeColors('dark'),
};

export default Colors;
