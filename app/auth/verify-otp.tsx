// app/auth/verify-otp.tsx

import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authService } from '@/services/authService'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { StatusBar } from 'expo-status-bar'
import { showSuccess, showError, showWarning } from '@/lib/toast'
import { safeAsync } from '@/lib/errorHandler'

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

  // Validate OTP format
  const validateOTP = (otpValue: string): boolean => {
    const trimmed = otpValue.trim()
    if (!trimmed) {
      showError('OTP Required', 'Please enter the OTP code')
      return false
    }
    
    // Check if OTP is exactly 6 digits
    if (trimmed.length < 6) {
      showError('Invalid OTP', 'OTP must be 6 digits')
      return false
    }
    
    if (trimmed.length > 6) {
      showError('Invalid OTP', 'OTP must be exactly 6 digits')
      return false
    }
    
    // Check if all characters are digits
    if (!/^\d{6}$/.test(trimmed)) {
      showError('Invalid OTP', 'OTP must contain only numbers')
      return false
    }
    
    return true
  }

  const handleVerify = async () => {
    // Validation
    if (!validateOTP(otp)) {
      return
    }

    if (!phone) {
      showError('Phone Missing', 'Phone number is missing. Please try logging in again.')
      // Navigate back to login if phone is missing
      router.back()
      return
    }

    // Prevent multiple submissions
    if (loading) return

    setLoading(true)

    // Use safeAsync for production-safe error handling
    const result = await safeAsync(async () => {
      const response = await authService.verifyOTP(phone, otp)
      if (!response) throw new Error('Invalid response from server')

      const token = response.token ?? response.data?.token ?? response.session?.token
      const user = response.user ?? response.data?.user ?? response.session?.user
      if (response.success === false || response.error) throw new Error(response.error || response.message || 'OTP verification failed')
      if (!token || typeof token !== 'string' || !token.trim()) throw new Error('Authentication token not received')
      if (!user || !user.id) throw new Error('User data not received')

      await login({ token, user })
      return { success: true, token, user }
    }, 'Failed to verify OTP')

    // Handle result
    if (result) {
      showSuccess('Verified!', 'Login successful')
      
      // Small delay to show success message before navigation
      setTimeout(() => {
        try {
          router.replace('/(tabs)/cards' as any)
        } catch (navError) {
          // Safe navigation fallback
          showError('Navigation Error', 'Please restart the app')
        }
      }, 500)
    } else {
      // Error already handled by safeAsync, but we can add specific handling here
      // The error toast is already shown by safeAsync
    }
  }

  // Enhanced error handling with specific messages
  const handleVerifyWithDetailedErrors = async () => {
    // Validate OTP format first
    if (!validateOTP(otp)) {
      return
    }

    if (!phone) {
      showError('Phone Missing', 'Phone number is missing. Please try logging in again.')
      router.back()
      return
    }

    if (loading) return

    setLoading(true)

    // Wrap in try-catch to prevent any unhandled promise rejections
    let response: any = null
    try {
      // Call authService and catch any errors immediately
      try {
        response = await authService.verifyOTP(phone, otp.trim())
      } catch (serviceError: any) {
        // Re-throw to be handled by outer catch block
        throw serviceError
      }
      
      // Validate response structure - CRITICAL: Must check before proceeding
      if (!response) {
        showError('Invalid Response', 'Server returned an invalid response. Please try again.')
        setLoading(false)
        return
      }

      if (response.success === false || response.error || response.status === 'error') {
        const errorMessage = response.error || response.message || 'OTP verification failed'
        showError('Invalid OTP', errorMessage)
        setLoading(false)
        setOtp('')
        return
      }

      const token = response.token ?? response.data?.token ?? response.session?.token
      const user = response.user ?? response.data?.user ?? response.session?.user

      if (!token || typeof token !== 'string' || token.trim() === '') {
        showError('Authentication Failed', 'Token not received. Please try again.')
        setLoading(false)
        setOtp('')
        return
      }
      if (!user || !user.id) {
        showError('Authentication Failed', 'User data not received. Please try again.')
        setLoading(false)
        setOtp('')
        return
      }

      // Have token and user – proceed with login (no need to require response.success when API returns 200)
      await login({ token, user })

      showSuccess('Verified!', 'Login successful')
      
      // Navigate after success message
      setTimeout(() => {
        router.replace('/(tabs)/cards' as any)
      }, 500)

    } catch (error: any) {
      // Prevent error from propagating to Expo Go error screen
      // All errors are handled gracefully with toast messages only
      
      // Check if error is already handled by axios interceptor
      if (error.handled) {
        // Use user-friendly message from handled error
        showError('Verification Failed', error.userMessage || 'Failed to verify OTP')
        setLoading(false)
        return
      }

      // Network errors - handle silently with toast only
      if (!error.response) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          showError('Timeout', 'Request timed out. Please check your connection and try again.')
        } else if (error.code === 'ECONNREFUSED') {
          showError('Connection Failed', 'Cannot connect to server. Please check your internet connection.')
        } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
          showError('Server Not Found', 'Cannot reach server. Please check your API configuration.')
        } else {
          showError('Network Error', 'Please check your internet connection.')
        }
        setLoading(false)
        return
      }

      // API response errors - Only show toast, no console/warn, no error screen
      const status = error.response?.status
      const data = error.response?.data as { message?: string; error?: string | { message?: string } } | undefined
      
      if (status === 400 || status === 422) {
        const err = data?.error
        const message =
          data?.message ||
          (typeof err === 'string' ? err : err?.message) ||
          'Invalid OTP or request rejected. Please try again.'
        showError('Verification Failed', message)
        // Clear OTP input on invalid OTP
        setOtp('')
      } else if (status === 401) {
        showError('Invalid OTP', 'OTP expired or invalid. Please request a new OTP.')
        setOtp('')
      } else if (status === 403) {
        const err = data?.error
        const msg = data?.message || (typeof err === 'string' ? err : err?.message)
        showError('Too Many Attempts', msg || 'Too many wrong tries. Please request a new OTP.')
        setOtp('')
      } else if (status === 404) {
        showError('Not Found', 'API endpoint not found. Please contact support.')
      } else if (status === 429) {
        showWarning('Too Many Requests', 'Please wait a moment before trying again.')
      } else if (status === 500) {
        showError('Server Error', 'Server error occurred. Please try again later.')
      } else {
        const err = data?.error
        const message =
          data?.message ||
          (typeof err === 'string' ? err : err?.message) ||
          'An error occurred. Please try again.'
        showError('Error', message)
      }
      
      // Ensure loading state is reset and prevent navigation
      setLoading(false)
      // DO NOT navigate - stay on verify screen
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
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold, fontSize: 32 }]}>
          Verify OTP
        </Text>
        
        <Text style={[
          { 
            color: colors.textSecondary, 
            fontSize: 14, 
            marginBottom: 20,
            textAlign: 'center',
            fontFamily: fonts.regular 
          }
        ]}>
          Enter the code sent to {phone ? `${phone.slice(0, 3)}****${phone.slice(-2)}` : 'your phone'}
        </Text>

        <TextInput
          placeholder="Enter 6-digit OTP"
          placeholderTextColor={colors.placeholder}
          value={otp}
          onChangeText={(text) => {
            // Only allow numbers and limit to 6 digits
            const numericOnly = text.replace(/[^0-9]/g, '')
            if (numericOnly.length <= 6) {
              setOtp(numericOnly)
            }
          }}
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
              textAlign: 'center',
              letterSpacing: 8,
            }
          ]}
          keyboardType="number-pad"
          keyboardAppearance={isDark ? 'dark' : 'light'}
          editable={!loading}
          maxLength={6}
          autoFocus
        />
        
        {otp.length > 0 && otp.length < 6 && (
          <Text style={{
            color: colors.primary,
            fontSize: 12,
            marginTop: -15,
            marginBottom: 10,
            textAlign: 'center',
            fontFamily: fonts.regular,
          }}>
            {6 - otp.length} more digit{6 - otp.length > 1 ? 's' : ''} needed
          </Text>
        )}
        
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
              marginTop: 10,
            }
          ]}
          onPress={handleVerifyWithDetailedErrors}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <Text style={{ 
              color: colors.buttonPrimaryText, 
              fontSize: 16, 
              fontWeight: '600', 
              fontFamily: fonts.medium 
            }}>
              Verify OTP
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            {
              marginTop: 20,
              paddingVertical: 12,
              alignItems: 'center',
            }
          ]}
          onPress={() => {
            // Navigate back to login page
            router.replace('/auth/login')
          }}
          disabled={loading}
        >
          <Text style={{ 
            color: colors.primary, 
            fontSize: 14, 
            fontFamily: fonts.regular 
          }}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  )
}

export default VerifyOTP