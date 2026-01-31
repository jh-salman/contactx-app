import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';

/**
 * Helper function to create themed styles
 * Usage:
 * const styles = createThemedStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.background,
 *     padding: 16,
 *   },
 *   text: {
 *     color: colors.text,
 *   },
 * }));
 */
export function createThemedStyles<T extends Record<string, ViewStyle | TextStyle>>(
  styleFn: (colors: ReturnType<typeof useThemeColors>) => T
): T {
  // This is a type helper - actual implementation needs colors at runtime
  // Use useThemedStyles hook instead for runtime styles
  return {} as T;
}

/**
 * Hook to create themed styles dynamically
 * Usage:
 * const styles = useThemedStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.background,
 *   },
 * }));
 */
export function useThemedStyles<T extends Record<string, ViewStyle | TextStyle>>(
  styleFn: (colors: ReturnType<typeof useThemeColors>) => T
): T {
  const colors = useThemeColors();
  return StyleSheet.create(styleFn(colors));
}

