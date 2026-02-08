import React, { useEffect } from 'react'
import { View, StyleSheet, Text } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { SalonXLogo } from '@/components/SalonXLogo'
import { useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { logger } from '@/lib/logger'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

interface SplashScreenProps {
  onFinish: () => void
}

const CustomSplashScreen = ({ onFinish }: SplashScreenProps) => {
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const [fontsLoaded] = useFonts({
    // You can add custom fonts here if needed
  })

  useEffect(() => {
    // Always show splash screen for minimum 2 seconds when app opens
    // This ensures splash screen is visible every time app starts
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync()
        // Small delay to ensure smooth transition
        setTimeout(() => {
          onFinish()
        }, 100)
      } catch (error) {
        logger.warn('Error hiding splash screen', error)
        // Still call onFinish even if hideAsync fails
        setTimeout(() => {
          onFinish()
        }, 100)
      }
    }, 2000) // Minimum 2 seconds splash screen

    return () => clearTimeout(timer)
  }, [onFinish]) // Always show splash screen on mount

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      marginBottom: 30,
      width: 150,
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: '100%',
      height: '100%',
    },
    appName: {
      fontWeight: 'bold',
      letterSpacing: 2,
      marginBottom: 8,
    },
    tagline: {
      fontWeight: '500',
      letterSpacing: 1,
    },
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <SalonXLogo width={150} height={150} />
      </View>
      
      {/* SalonX Text */}
      <Text style={[styles.appName, { color: colors.primary, fontFamily: fonts.bold, fontSize: 42 }]}>SalonX</Text>
      <Text style={[styles.tagline, { color: colors.placeholder, fontFamily: fonts.regular, fontSize: 16 }]}>Digital Solutions</Text>
    </View>
  )
}

export default CustomSplashScreen

