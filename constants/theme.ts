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



export const LightColors = {
  // Brand
  primary: '#EC4899',        // Pink
  primaryDark: '#BE185D',    // Deep Pink
  primaryLight: '#F9A8D4',   // Soft Pink

  // Base
  background: '#FFF7FB',     // Very Light Pink White
  text: '#0F172A',           // Dark Navy

  // UI
  border: '#EC4899',         // Light Grey
  input: '#FFFFFF',          // Input / Card bg
  placeholder: '#94A3B8',    // Muted Grey

  // Additional UI Colors
  card: '#FFFFFF',           // Card background
  textSecondary: '#64748B',  // Secondary text
  textTertiary: '#94A3B8',   // Tertiary text
  backgroundSecondary: '#F8FAFC', // Secondary background
  borderLight: '#F1F5F9',    // Light border
  inputText: '#0F172A',     // Input text color
  inputBackground: '#FFFFFF', // Input background
  buttonPrimaryText: '#FFFFFF', // Button text on primary
  error: '#EF4444',          // Error color

  // Tab Bar
  tabBar: '#FFFFFF',         // Tab bar background
  tabBarBorder: '#E5E7EB',   // Tab bar border
  tabIconSelected: '#EC4899', // Selected tab icon color
  tabIconDefault: '#94A3B8', // Unselected tab icon color
};


// Theme Colors - Dark Mode
// export const DarkColors = {
//   // Brand
//   primary: '#EC4899',        // Pink
//   primaryDark: '#BE185D',    // Deep Pink
//   primaryLight: '#F9A8D4',   // Soft Pink

//   // Base
//   background: '#020617',     // Dark Navy
//   text: '#F8FAFC',           // Soft White

//   // UI
//   border: '#1E293B',         // Dark Grey
//   input: '#0F172A',          // Input / Card bg
//   placeholder: '#64748B',    // Muted text

//   // Additional UI Colors
//   card: '#0F172A',           // Card background
//   textSecondary: '#94A3B8',  // Secondary text
//   textTertiary: '#64748B',   // Tertiary text
//   backgroundSecondary: '#1E293B', // Secondary background
//   borderLight: '#334155',    // Light border
//   inputText: '#F8FAFC',      // Input text color
//   inputBackground: '#0F172A', // Input background
//   buttonPrimaryText: '#FFFFFF', // Button text on primary
//   error: '#EF4444',          // Error color

//   // Tab Bar
//   tabBar: '#0F172A',         // Tab bar background (dark)
//   tabBarBorder: '#1E293B',  // Tab bar border (dark)
//   tabIconSelected: '#EC4899', // Selected tab icon color
//   tabIconDefault: '#64748B', // Unselected tab icon color
// };

export const DarkColors = {
  // Brand / Accent (used for highlights, charts)
  primary: '#22D3EE',        // Neon Cyan (main accent)
  primaryDark: '#0EA5B7',
  primaryLight: '#67E8F9',

  success: '#4ADE80',        // Neon Green
  warning: '#FACC15',        // Yellow
  info: '#38BDF8',           // Blue
  accentPurple: '#A855F7',   // Purple (charts)

  // Base
  background: '#020617',     // Ultra dark navy (main bg)
  backgroundSecondary: '#050B1E', // Section bg
  text: '#E5E7EB',           // Soft white

  // Surface
  card: '#0B122E',           // Dashboard card bg
  input: '#0B122E',
  inputBackground: '#0B122E',

  // Borders
  border: '#111827',
  borderLight: '#1F2937',

  // Text
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  placeholder: '#64748B',
  inputText: '#F8FAFC',

  // Status
  error: '#F87171',

  // Tab Bar
  tabBar: '#050B1E',
  tabBarBorder: '#111827',
  tabIconSelected: '#22D3EE',
  tabIconDefault: '#64748B',

  // Buttons
  buttonPrimaryText: '#020617',
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

