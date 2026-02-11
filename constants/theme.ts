import { Platform } from 'react-native';

// Font Configuration
export const Fonts = {
  // Default fonts
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
  // Custom fonts (you can add your own fonts here)
  custom: {
    sans: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      default: 'System',
    }),
    serif: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      web: "Georgia, 'Times New Roman', serif",
      default: 'serif',
    }),
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      web: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      default: 'monospace',
    }),
  },
};



// Light: white background, black text (simple)
export const LightColors = {
  primary: '#000000',
  primaryDark: '#000000',
  primaryLight: '#374151',
  brand: '#C94DB2',

  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  text: '#000000',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  input: '#FFFFFF',
  inputBackground: '#FFFFFF',
  inputText: '#000000',
  placeholder: '#9CA3AF',

  card: '#FFFFFF',
  textSecondary: '#374151',
  textTertiary: '#6B7280',

  buttonPrimaryText: '#FFFFFF',
  error: '#DC2626',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabIconSelected: '#000000',
  tabIconDefault: '#6B7280',
};

// Dark: black background, white text (light এর বিপরীত)
export const DarkColors = {
  primary: '#FFFFFF',
  primaryDark: '#FFFFFF',
  primaryLight: '#D1D5DB',
  brand: '#C94DB2',

  background: '#000000',
  backgroundSecondary: '#111111',
  text: '#FFFFFF',

  border: '#374151',
  borderLight: '#1F2937',
  input: '#171717',
  inputBackground: '#171717',
  inputText: '#FFFFFF',
  placeholder: '#6B7280',

  card: '#171717',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',

  buttonPrimaryText: '#000000',
  error: '#EF4444',

  tabBar: '#000000',
  tabBarBorder: '#374151',
  tabIconSelected: '#FFFFFF',
  tabIconDefault: '#9CA3AF',
};


// Theme type
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  mode: ThemeMode;
  colors: typeof LightColors;
  fonts: typeof Fonts;
}

// Default theme
export const defaultTheme: Theme = {
  mode: 'auto',
  colors: LightColors,
  fonts: Fonts,
};

