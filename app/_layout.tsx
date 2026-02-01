// import { TabBarProvider } from "@/contexts/TabBarContext";
import CustomSplashScreen from '@/components/SplashScreen';
import { AuthProvider } from "@/context/AuthContext";
import { TabBarProvider } from "@/context/TabBar";
import { ThemeProvider, useTheme, useThemeColors } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
    </View>
  );
}

export default function RootLayout() {
  const [isSplashReady, setIsSplashReady] = useState(false);

  useEffect(() => {
    // App initialization logic here if needed
  }, []);

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
        <RootLayoutNav />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}