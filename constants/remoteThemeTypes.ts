/**
 * Remote Theme Types
 *
 * Defines the flexible contract for API-driven theme overrides.
 * Every field is optional — the API can send as little as
 * { brand: { primary: "#FF0000" } } or a full palette.
 */

export interface RemoteBrandColors {
  primary?: string;
  primaryLight?: string;
  primaryDark?: string;
  secondary?: string;
  secondaryLight?: string;
  secondaryDark?: string;
  accent?: string;
}

export interface RemoteNeutralColors {
  background?: string;
  backgroundAlt?: string;
  backgroundElevated?: string;
  textPrimary?: string;
  textSecondary?: string;
  textTertiary?: string;
  textInverse?: string;
  border?: string;
  borderLight?: string;
  divider?: string;
  disabled?: string;
  placeholder?: string;
}

export interface RemoteStatusColors {
  success?: string;
  successLight?: string;
  successDark?: string;
  error?: string;
  errorLight?: string;
  errorDark?: string;
  warning?: string;
  warningLight?: string;
  warningDark?: string;
  info?: string;
  infoLight?: string;
  infoDark?: string;
}

export interface RemoteComponentColors {
  tabBar?: Partial<{
    background: string;
    activeTint: string;
    inactiveTint: string;
  }>;
  button?: Partial<{
    primary: string;
    primaryText: string;
    secondary: string;
    secondaryText: string;
    disabled: string;
    disabledText: string;
  }>;
  input?: Partial<{
    background: string;
    border: string;
    text: string;
    placeholder: string;
    focused: string;
  }>;
  card?: Partial<{
    background: string;
    border: string;
    shadow: string;
  }>;
  link?: Partial<{
    color: string;
    colorHover: string;
    colorActive: string;
  }>;
}

/**
 * Top-level shape the API returns.
 * `light` and `dark` can independently override neutrals + component colors.
 */
export interface RemoteThemeOverrides {
  brand?: RemoteBrandColors;
  light?: RemoteNeutralColors & RemoteComponentColors;
  dark?: RemoteNeutralColors & RemoteComponentColors;
  status?: RemoteStatusColors;
}

/**
 * Wrapper stored in AsyncStorage for cache management.
 */
export interface CachedThemeData {
  overrides: RemoteThemeOverrides;
  fetchedAt: number;
  version?: string;
}
