import { useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { Extrapolate, interpolate, useAnimatedStyle } from 'react-native-reanimated'

const { width } = Dimensions.get("screen")

const MAX_UP = -40
const MAX_DOWN = 0

const CreateCardItem = ({ index, scrollX, translateY }: { index: number, scrollX: any, translateY: any }) => {
  const router = useRouter()
  const colors = useThemeColors()
  const fonts = useThemeFonts()

  const inputRange = [
    (index - 1) * width,
    index * width,
    (index + 1) * width,
  ]

  const cardAnimation = useAnimatedStyle(() => {
    // Horizontal carousel scale (center card bigger)
    const scaleX = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolate.CLAMP
    )

    // Vertical gesture scale (shared across all cards)
    const progress = interpolate(translateY.value, [MAX_DOWN, MAX_UP], [0, 1], Extrapolate.CLAMP)
    const scaleY = interpolate(progress, [0, 1], [0.92, 1.02], Extrapolate.CLAMP)

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolate.CLAMP
    )

    return {
      transform: [{ scale: scaleX * scaleY }],
      opacity,
    }
  })

  const handleCreateCard = () => {
    router.push('/create-card' as any)
  }

  const styles = StyleSheet.create({
    container: {
      position: "relative",
      width: width,
    },
    cardContainer: {
      width: width,
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    createCardButton: {
      width: '90%',
      height: '80%',
      backgroundColor: colors.background,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      padding: 40,
    },
    iconContainer: {
      marginBottom: 20,
    },
    createCardText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 10,
      textAlign: 'center',
    },
    createCardSubText: {
      fontSize: 16,
      color: colors.placeholder,
      textAlign: 'center',
    },
  })

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.cardContainer, cardAnimation]}>
        <TouchableOpacity 
          style={styles.createCardButton}
          onPress={handleCreateCard}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="plus-circle" size={80} color={colors.primary} />
          </View>
          <Text style={[styles.createCardText, { fontFamily: fonts.bold, fontSize: 32 }]}>Create New Card</Text>
          <Text style={[styles.createCardSubText, { fontFamily: fonts.regular, fontSize: 16 }]}>Tap to add a new business card</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

export default CreateCardItem

