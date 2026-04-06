/**
 * Theme Configuration (Maintained for backward compatibility)
 * 
 * DEPRECATED: Please use the new theme system instead:
 * - Import Colors from constants/Colors.ts for color definitions
 * - Use the useTheme() hook from hooks/useTheme.ts to access colors in components
 * 
 * This file will be kept for backward compatibility but all new code should use:
 * - constants/Colors.ts for color definitions
 * - hooks/useTheme.ts for accessing theme in components
 * 
 * See CLAUDE.md for detailed migration guide
 */

import { getThemeColors } from './Colors';

// Re-export new color system for backward compatibility
export { BrandColors, Colors as NewColors } from './Colors';

// Keep old Colors object for components that haven't been migrated yet
export const Colors = {
  light: getThemeColors('light'),
  dark: getThemeColors('dark'),
};
