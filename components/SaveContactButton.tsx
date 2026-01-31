import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface SaveContactButtonProps {
  onPress: () => void
  loading: boolean
  isSaved: boolean
  cardColor: string
}

export const SaveContactButton: React.FC<SaveContactButtonProps> = ({
  onPress,
  loading,
  isSaved,
  cardColor,
}) => {
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  return (
    <View style={[styles.container, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isSaved ? '#34C759' : cardColor,
          },
          loading && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={loading || isSaved}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
        ) : isSaved ? (
          <>
            <MaterialCommunityIcons name="check" size={22} color={colors.buttonPrimaryText} />
            <Text style={[styles.buttonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>Already Saved</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="content-save" size={22} color={colors.buttonPrimaryText} />
            <Text style={[styles.buttonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>Save Contact</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})

