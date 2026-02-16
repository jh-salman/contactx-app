import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { moderateScale, verticalScale } from 'react-native-size-matters'
import { useThemeColors } from '@/context/ThemeContext'


const MS = moderateScale
const VS = verticalScale

export type InputRestrict = 'numeric' | 'email' | 'url' | 'alphanumeric' | 'none'

export const restrictInputByMode = (text: string, mode: InputRestrict): string => {
  if (mode === 'none' || !mode) return text
  if (mode === 'numeric') return text.replace(/[^\d+\-\s()]/g, '') // phone: digits, +, -, space, ()
  if (mode === 'email') return text.replace(/[^\w@.\-+]/g, '') // email: alphanumeric, @, ., -, +
  if (mode === 'url') return text.replace(/[^\w\-._~:/?#[\]@!$&'()*+,;=%]/gi, '') // URL-safe
  if (mode === 'alphanumeric') return text.replace(/[^\w@.$#:]/g, '') // letters, numbers, _, @, ., $, #, : (usernames, Discord, Skype)
  return text
}

type Props = {
  label: string
  value: string
  onChangeText: (t: string) => void

  /** Restrict input: numeric (phone), email, url, alphanumeric */
  restrictInput?: InputRestrict

  /** Right side icon (e.g., trash). Pass a ReactNode */
  rightIcon?: React.ReactNode
  onPressRightIcon?: () => void
  /** When true, right icon is only visible when input is focused */
  showRightIconOnlyWhenFocused?: boolean

  containerStyle?: StyleProp<ViewStyle>
  inputStyle?: TextInputProps['style']

  /** Optional colors (default from theme) */
  borderColor?: string
  focusBorderColor?: string
  labelBgColor?: string
  error?: string

  disabled?: boolean
  multiline?: boolean
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'editable'>

export function FloatingOutlinedInput({
  label,
  value,
  onChangeText,
  restrictInput: restrictMode = 'none',
  rightIcon,
  onPressRightIcon,
  showRightIconOnlyWhenFocused = false,
  containerStyle,
  inputStyle,
  borderColor: borderColorProp,
  focusBorderColor: focusBorderColorProp,
  labelBgColor: labelBgColorProp,
  error,
  disabled = false,
  multiline = false,
  ...textInputProps
}: Props) {
  const handleChangeText = (text: string) => {
    onChangeText(restrictInputByMode(text, restrictMode))
  }
  const colors = useThemeColors()
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const borderColor = borderColorProp ?? colors.border
  const focusBorderColor = focusBorderColorProp ?? colors.primary
  const labelBgColor = labelBgColorProp ?? colors.background

  const hasText = value?.length > 0
  const float = useRef(new Animated.Value(hasText ? 1 : 0)).current

  useEffect(() => {
    const toValue = focused || hasText ? 1 : 0
    Animated.timing(float, {
      toValue,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [focused, hasText, float])

  const labelStyle = useMemo(() => {
    const translateY = float.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -VS(26)],
    })
    const scale = float.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.92],
    })
    return {
      transform: [{ translateY }, { scale }],
    }
  }, [float])

  const isActive = focused && !disabled
  const currentBorder = disabled ? colors.borderLight : isActive ? focusBorderColor : borderColor
  const borderWidth = isActive ? 2 : 1
  const labelColor = disabled ? colors.placeholder : isActive ? colors.primary : colors.textTertiary

  return (
    <Pressable
      onPress={() => !disabled && inputRef.current?.focus()}
      style={[styles.wrap, containerStyle]}
    >
      <View
        style={[
          styles.box,
          { borderColor: currentBorder, borderWidth },
          multiline && styles.boxMultiline,
          disabled && { backgroundColor: colors.inputBackground, opacity: 0.9 },
        ]}
      >
        <Animated.View
          style={[
            styles.labelWrap,
            labelStyle,
            {
              backgroundColor: colors.backgroundSecondary,
              zIndex: 10,
              // elevation: 10,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.labelText, { color: labelColor }]}>{label}</Text>
        </Animated.View>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder=""
          editable={!disabled}
          multiline={multiline}
          style={[
            styles.input,
            { color: colors.text, paddingRight: rightIcon ? MS(44) : MS(14) },
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          placeholderTextColor={colors.placeholder}
          {...textInputProps}
        />

        {rightIcon && (!showRightIconOnlyWhenFocused || focused) ? (
          Platform.OS === 'android' ? (
            <TouchableOpacity
              onPress={disabled ? undefined : onPressRightIcon}
              hitSlop={{ top: MS(10), bottom: MS(10), left: MS(10), right: MS(10) }}
              style={styles.rightIconBtn}
              activeOpacity={0.7}
            >
              {rightIcon}
            </TouchableOpacity>
          ) : (
            <Pressable
              onPress={disabled ? undefined : onPressRightIcon}
              hitSlop={MS(10)}
              style={styles.rightIconBtn}
            >
              {rightIcon}
            </Pressable>
          )
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  box: {
    borderRadius: MS(14),
    minHeight: MS(56),
    justifyContent: 'center',
    overflow: 'visible',
  },
  boxMultiline: {
    minHeight: MS(56),
    alignItems: 'flex-start',
  },
  labelWrap: {
    position: 'absolute',
    left: MS(14),
    top: MS(14),
    paddingHorizontal: MS(8),
    paddingVertical: VS(2),
    borderRadius: MS(6),
  },
  labelText: {
    fontSize: MS(14),
    fontWeight: '600',
  },
  input: {
    fontSize: MS(16),
    paddingHorizontal: MS(14),
    paddingVertical: MS(14),
    minHeight: MS(24),
  },
  inputMultiline: {
    minHeight: MS(24),
    paddingTop: VS(20),
    paddingBottom: MS(14),
  },
  rightIconBtn: {
    position: 'absolute',
    right: MS(10),
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: MS(44),
    zIndex: 20,
    elevation: 20,
  },
  errorText: {
    marginTop: VS(6),
    fontSize: MS(12),
    fontWeight: '500',
  },
})

export default FloatingOutlinedInput
