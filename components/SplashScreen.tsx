import React, { useEffect } from 'react'
import { View, StyleSheet, Image, Text } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { useThemeColors, useThemeFonts } from '@/context/ThemeContext'

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
    // Show splash screen for 2 seconds, then hide
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync()
        onFinish()
      } catch (error) {
        console.warn('Error hiding splash screen:', error)
        // Still call onFinish even if hideAsync fails
        onFinish()
      }
    }, 2000) // Show splash for 2 seconds

    return () => clearTimeout(timer)
  }, [onFinish]) // Remove fontsLoaded dependency - always finish after 2 seconds

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
        <Image
          source={require('@/assets/images/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      {/* SalonX Text */}
      <Text style={[styles.appName, { color: colors.primary, fontFamily: fonts.bold, fontSize: 42 }]}>SalonX</Text>
      <Text style={[styles.tagline, { color: colors.placeholder, fontFamily: fonts.regular, fontSize: 16 }]}>Digital Solutions</Text>
    </View>
  )
}

export default CustomSplashScreen

