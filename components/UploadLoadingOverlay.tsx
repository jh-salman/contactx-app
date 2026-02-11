import React, { useEffect } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated'
import { useThemeColors } from '@/context/ThemeContext'
import { SalonXLogo } from '@/components/SalonXLogo'
import { moderateScale } from 'react-native-size-matters'

const MS = moderateScale

interface UploadLoadingOverlayProps {
  visible: boolean
  fullScreen?: boolean
  style?: ViewStyle
  logoSize?: number
}

export const UploadLoadingOverlay = ({
  visible,
  fullScreen = true,
  style,
  logoSize = MS(80),
}: UploadLoadingOverlayProps) => {
  const colors = useThemeColors()
  const uploadPulse = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      uploadPulse.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      )
    } else {
      uploadPulse.value = withTiming(0, { duration: 200 })
    }
  }, [visible])

  const uploadLogoAnimatedStyle = useAnimatedStyle(() => {
    'worklet'
    const t = uploadPulse.value
    const pulse = Math.sin(t * Math.PI)
    return {
      opacity: 0.5 + 0.5 * pulse,
      transform: [{ scale: 0.9 + 0.1 * pulse }],
    }
  })

  if (!visible) return null

  return (
    <View
      style={[
        fullScreen && StyleSheet.absoluteFill,
        {
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        },
        style,
      ]}
    >
      <Animated.View style={uploadLogoAnimatedStyle}>
        <SalonXLogo width={logoSize} height={logoSize} />
      </Animated.View>
    </View>
  )
}
