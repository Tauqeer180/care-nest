/**
 * Theme Service
 *
 * Fetches admin-configured theme colors from `/mobile/theme`
 * and maps them to the app's RemoteThemeOverrides format.
 * Caches in AsyncStorage for instant startup.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedThemeData, RemoteThemeOverrides } from '@/constants/remoteThemeTypes';
import { apiRequest } from './api';

const THEME_CACHE_KEY = '@carenest/theme_overrides';

interface RemoteThemeResponse {
  success: boolean;
  data: {
    header_bg_color: string;
    header_text_color: string;
    sidebar_bg_color: string;
    sidebar_text_color: string;
    sidebar_hover_color: string;
    sidebar_active_color: string;
    footer_bg_color: string;
    footer_text_color: string;
    button_bg_color: string;
    button_text_color: string;
    button_hover_color: string;
    preset_theme: string;
    _id: string;
  };
}

/**
 * Map the flat API response to RemoteThemeOverrides
 */
function mapToOverrides(data: RemoteThemeResponse['data']): RemoteThemeOverrides {
  return {
    brand: {
      primary: data.button_bg_color,
      primaryLight: data.sidebar_hover_color,
      primaryDark: data.button_hover_color,
      secondary: data.sidebar_bg_color,
    },
    light: {
      background: data.header_bg_color,
      textPrimary: data.header_text_color,
      tabBar: {
        background: data.header_bg_color,
        activeTint: data.button_bg_color,
      },
      button: {
        primary: data.button_bg_color,
        primaryText: data.button_text_color,
      },
    },
    dark: {
      tabBar: {
        activeTint: data.button_bg_color,
      },
      button: {
        primary: data.button_bg_color,
        primaryText: data.button_text_color,
      },
    },
  };
}

/**
 * Load cached theme overrides from AsyncStorage.
 */
export async function loadCachedOverrides(): Promise<RemoteThemeOverrides | null> {
  try {
    const raw = await AsyncStorage.getItem(THEME_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedThemeData = JSON.parse(raw);
    return cached.overrides;
  } catch {
    await AsyncStorage.removeItem(THEME_CACHE_KEY).catch(() => {});
    return null;
  }
}

/**
 * Fetch fresh theme from the API, map and cache it.
 */
export async function fetchThemeOverrides(): Promise<RemoteThemeOverrides | null> {
  try {
    const response = await apiRequest<RemoteThemeResponse>('/mobile/theme');
    const overrides = mapToOverrides(response.data);

    const cacheEntry: CachedThemeData = {
      overrides,
      fetchedAt: Date.now(),
    };
    await AsyncStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cacheEntry));

    return overrides;
  } catch {
    return null;
  }
}

/**
 * Clear cached theme overrides.
 */
export async function clearThemeCache(): Promise<void> {
  await AsyncStorage.removeItem(THEME_CACHE_KEY).catch(() => {});
}
