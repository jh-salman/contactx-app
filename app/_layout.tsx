// import { TabBarProvider } from "@/contexts/TabBarContext";
import CustomSplashScreen from '@/components/SplashScreen';
import { AuthProvider } from "@/context/AuthContext";
import { TabBarProvider } from "@/context/TabBar";
import { ThemeProvider, useTheme, useThemeColors } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from '@/components/ErrorBoundary';
import { setupGlobalErrorHandlers } from '@/lib/errorHandler';

import Toast from 'react-native-toast-message';

// Configure LogBox to suppress error overlays - errors will be shown via toast only
// This prevents the red error screen from appearing at the bottom in Expo Go
if (__DEV__) {
  // Ignore specific warnings
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'VirtualizedLists should never be nested',
  ]);
}

function RootLayoutNav() {
  const { isDark, themeMode } = useTheme();
  const colors = useThemeColors();
  // Use key prop to force re-render on theme change (iOS fix)
  return (
    <View key={`theme-${isDark}-${themeMode}`} style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <TabBarProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="visitor-share-requests" options={{ headerShown: true }} />
          </Stack>
        </TabBarProvider>
      </AuthProvider>
      <Toast 
        config={{
          success: (props: { text1?: string; text2?: string }) => (
            <View style={{
              backgroundColor: '#10b981',
              padding: 15,
              borderRadius: 8,
              marginHorizontal: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#059669',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {props.text1}
              </Text>
              {props.text2 && (
                <Text style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>
                  {props.text2}
                </Text>
              )}
            </View>
          ),
          error: (props: { text1?: string; text2?: string }) => (
            <View style={{
              backgroundColor: '#ef4444',
              padding: 15,
              borderRadius: 8,
              marginHorizontal: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#dc2626',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {props.text1}
              </Text>
              {props.text2 && (
                <Text style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>
                  {props.text2}
                </Text>
              )}
            </View>
          ),
          info: (props: { text1?: string; text2?: string }) => (
            <View style={{
              backgroundColor: '#3b82f6',
              padding: 15,
              borderRadius: 8,
              marginHorizontal: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#2563eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {props.text1}
              </Text>
              {props.text2 && (
                <Text style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>
                  {props.text2}
                </Text>
              )}
            </View>
          ),
        }}
        topOffset={60}
      />
    </View>
  );
}

export default function RootLayout() {
  // Always start with splash screen - this ensures splash shows every time app opens
  const [isSplashReady, setIsSplashReady] = useState(false);

  useEffect(() => {
    // App initialization logic here if needed
    setupGlobalErrorHandlers();
  }, []);

  // MUST show splash screen first - always visible on app start
  // This works for both cold start and when app is reopened
  // Splash screen will show for minimum 2 seconds before showing main app
  if (!isSplashReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <CustomSplashScreen onFinish={() => setIsSplashReady(true)} />
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ErrorBoundary>
          <RootLayoutNav />
        </ErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}