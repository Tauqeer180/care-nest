/**
 * Theme Utilities
 * 
 * Helpful utility functions for working with the theme system.
 * These can be imported and used in components to handle common theming scenarios.
 */

import { useTheme } from '@/hooks/useTheme';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

/**
 * Hook for creating theme-aware button styles
 * 
 * Usage:
 * ```tsx
 * const buttonStyles = useButtonStyles();
 * <Pressable style={buttonStyles.primary}>
 *   <Text>Click me</Text>
 * </Pressable>
 * ```
 */
export const useButtonStyles = () => {
  const { colors } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        primary: {
          backgroundColor: colors.button.primary,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: 'center',
        },
        primaryText: {
          color: colors.button.primaryText,
          fontSize: 16,
          fontWeight: '600',
        },
        secondary: {
          backgroundColor: colors.button.secondary,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        secondaryText: {
          color: colors.button.secondaryText,
          fontSize: 16,
          fontWeight: '600',
        },
        disabled: {
          backgroundColor: colors.button.disabled,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: 'center',
        },
        disabledText: {
          color: colors.button.disabledText,
          fontSize: 16,
          fontWeight: '600',
        },
      }),
    [colors]
  );
};

/**
 * Hook for creating theme-aware card styles
 */
export const useCardStyles = () => {
  const { colors } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.card.background,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.card.border,
          shadowColor: colors.card.shadow,
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        title: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.textPrimary,
          marginBottom: 8,
        },
        description: {
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 20,
        },
      }),
    [colors]
  );
};

/**
 * Hook for creating theme-aware input styles
 */
export const useInputStyles = () => {
  const { colors } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        input: {
          borderWidth: 1,
          borderColor: colors.input.border,
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 16,
          fontSize: 16,
          color: colors.input.text,
          backgroundColor: colors.input.background,
        },
        inputFocused: {
          borderColor: colors.input.focused,
          borderWidth: 2,
        },
        label: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 8,
        },
        placeholder: {
          color: colors.input.placeholder,
        },
        helperText: {
          fontSize: 12,
          color: colors.textTertiary,
          marginTop: 4,
        },
        errorText: {
          fontSize: 12,
          color: colors.error,
          marginTop: 4,
        },
      }),
    [colors]
  );
};

/**
 * Utility function to blend colors with opacity
 * 
 * Usage:
 * ```tsx
 * const transparentOrange = blendColors('#FF6600', 0.5);
 * ```
 */
export const blendColors = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
};

/**
 * Check if a color has sufficient contrast for text
 * Useful for accessibility compliance
 * 
 * Usage:
 * ```tsx
 * const isContrasted = hasContrast('#FFFFFF', '#000000');
 * ```
 */
export const hasContrast = (textColor: string, backgroundColor: string): boolean => {
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.replace('#', ''), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  const l1 = getLuminance(textColor);
  const l2 = getLuminance(backgroundColor);
  const lmax = Math.max(l1, l2);
  const lmin = Math.min(l1, l2);

  const contrast = (lmax + 0.05) / (lmin + 0.05);
  return contrast >= 4.5; // WCAG AA standard
};

/**
 * Hook for accessing all theme utilities
 * 
 * Usage:
 * ```tsx
 * const { colors, theme, buttonStyles, cardStyles, blendColors } = useThemeUtils();
 * ```
 */
export const useThemeUtils = () => {
  const { colors, theme } = useTheme();
  const buttonStyles = useButtonStyles();
  const cardStyles = useCardStyles();
  const inputStyles = useInputStyles();

  return {
    colors,
    theme,
    buttonStyles,
    cardStyles,
    inputStyles,
    blendColors,
    hasContrast,
  };
};

/**
 * Common shadow presets for different elevations
 */
export const shadowPresets = {
  elevation1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  elevation2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2.0,
    elevation: 2,
  },
  elevation4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4.65,
    elevation: 4,
  },
  elevation8: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 11.0,
    elevation: 8,
  },
};

/**
 * Theme transition config for smooth animations between themes
 */
export const themeTransition = {
  duration: 300,
  backgroundColor: {
    timing: 'ease-in-out',
    useNativeDriver: false,
  },
  color: {
    timing: 'ease-in-out',
    useNativeDriver: false,
  },
};

export default {
  useButtonStyles,
  useCardStyles,
  useInputStyles,
  useThemeUtils,
  blendColors,
  hasContrast,
  shadowPresets,
  themeTransition,
};
