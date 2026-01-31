import { StyleSheet, View, Alert, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authService } from '@/services/authService'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { StatusBar } from 'expo-status-bar'

const VerifyOTP = () => {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()
  const params = useLocalSearchParams()
  const phone = params.phone as string || ''
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  const handleVerify = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP')
      return
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number is missing')
      return
    }

    setLoading(true)
    try {
      // Call your backend API to verify OTP
      const response = await authService.verifyOTP(phone, otp)
      
      // Store auth data in context
      await login({
        token: response.token || response.data?.token,
        user: response.user || response.data?.user,
      })
      
      // Navigate to tabs after successful login
      router.replace('/(tabs)/cards' as any)
    } catch (error: any) {
      let errorMessage = 'Invalid OTP. Please try again.';
      let errorTitle = 'Error';
      
      // Network errors
      if (!error.response) {
        errorTitle = 'Connection Error';
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to server. Please check if backend server is running.';
        } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
          errorMessage = 'Server not found. Please check your API configuration.';
        } else if (error.message) {
          errorMessage = `Network error: ${error.message}`;
        }
      } 
      // API response errors
      else if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400 || status === 422) {
          errorTitle = 'Invalid Request';
          errorMessage = data?.message || data?.error || 'Invalid OTP. Please check and try again.';
        } else if (status === 404) {
          errorTitle = 'Not Found';
          errorMessage = data?.message || 'API endpoint not found.';
        } else if (status === 403) {
          errorTitle = 'Access Denied';
          errorMessage = data?.message || 'Access denied.';
        } else if (status === 500) {
          errorTitle = 'Server Error';
          errorMessage = 'Server error occurred. Please try again later.';
        } else {
          errorTitle = `Error ${status}`;
          errorMessage = data?.message || data?.error || error.response.statusText || 'An error occurred.';
        }
      }
      
      Alert.alert(errorTitle, errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      marginBottom: 20,
    },
  })

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold, fontSize: 32 }]}>Verify OTP</Text>
        <TextInput
          placeholder="Enter OTP"
          placeholderTextColor={colors.placeholder}
          value={otp}
          onChangeText={setOtp}
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              color: colors.text,
              fontFamily: fonts.regular,
            }
          ]}
          keyboardType="number-pad"
          editable={!loading}
        />
        <TouchableOpacity
          style={[
            {
              backgroundColor: colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              width: '100%',
              opacity: loading ? 0.6 : 1,
            }
          ]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <Text style={{ color: colors.buttonPrimaryText, fontSize: 16, fontWeight: '600', fontFamily: fonts.medium }}>Verify OTP</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  )
}

export default VerifyOTP