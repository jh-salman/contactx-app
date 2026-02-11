// app/auth/verify-otp.tsx

import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authService } from '@/services/authService'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { StatusBar } from 'expo-status-bar'
import { showSuccess, showError, showWarning } from '@/lib/toast'
import { safeAsync } from '@/lib/errorHandler'

const RESEND_COOLDOWN_SECONDS = 60

const VerifyOTP = () => {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendSecondsLeft, setResendSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS)
  const [resendLoading, setResendLoading] = useState(false)
  const otpRefs = useRef<(TextInput | null)[]>([])
  const router = useRouter()
  const { login } = useAuth()
  const params = useLocalSearchParams()
  const phone = params.phone as string || ''
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  useEffect(() => {
    if (resendSecondsLeft <= 0) return
    const timer = setInterval(() => setResendSecondsLeft((s) => (s <= 0 ? 0 : s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendSecondsLeft])

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

  const handleOtpChange = (index: number, value: string) => {
    const num = value.replace(/[^0-9]/g, '')
    if (num.length > 1) {
      const pasted = num.slice(0, 6)
      setOtp(pasted)
      otpRefs.current[Math.min(pasted.length, 5)]?.focus()
      return
    }
    const digit = num.slice(-1)
    if (digit) {
      const next = (otp.slice(0, index) + digit + otp.slice(index + 1)).slice(0, 6)
      setOtp(next)
      if (index < 5) otpRefs.current[index + 1]?.focus()
    } else {
      const next = otp.slice(0, index) + otp.slice(index + 1)
      setOtp(next)
      if (index > 0) otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleResendOtp = async () => {
    if (!phone || resendSecondsLeft > 0 || resendLoading) return
    setResendLoading(true)
    try {
      await authService.login(phone)
      showSuccess('OTP Sent', 'A new code has been sent to your phone.')
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS)
    } catch {
      showError('Resend Failed', 'Could not send OTP. Please try again.')
    } finally {
      setResendLoading(false)
    }
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold, fontSize: 32 }]}>
          Verify OTP
        </Text>
        
        <Text style={[
          { 
            color: colors.textSecondary, 
            fontSize: 14, 
            marginBottom: 24,
            textAlign: 'center',
            fontFamily: fonts.regular 
          }
        ]}>
          Enter the code sent to {phone ? `${phone.slice(0, 3)}****${phone.slice(-2)}` : 'your phone'}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TextInput
              key={index}
              ref={(r) => { otpRefs.current[index] = r }}
              value={otp[index] ?? ''}
              onChangeText={(text) => handleOtpChange(index, text)}
              onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
              placeholder=""
              placeholderTextColor={colors.placeholder}
              maxLength={6}
              keyboardType="number-pad"
              keyboardAppearance={isDark ? 'dark' : 'light'}
              editable={!loading}
              selectTextOnFocus
              style={[
                {
                  width: 44,
                  height: 52,
                  backgroundColor: colors.input,
                  borderWidth: 2,
                  borderColor: otp[index] ? colors.primary : colors.border,
                  borderRadius: 12,
                  fontSize: 22,
                  fontWeight: '600',
                  color: colors.text,
                  fontFamily: fonts.medium,
                  textAlign: 'center',
                  padding: 0,
                }
              ]}
              {...(index === 0 ? { autoFocus: true } : {})}
            />
          ))}
        </View>
        
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

        <View style={{ marginTop: 16, alignItems: 'center' }}>
          {resendSecondsLeft > 0 ? (
            <Text style={{ color: colors.placeholder, fontSize: 14, fontFamily: fonts.regular }}>
              Resend OTP in 0:{String(resendSecondsLeft).padStart(2, '0')}
            </Text>
          ) : (
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={resendLoading || loading}
              style={{ paddingVertical: 12, paddingHorizontal: 24 }}
            >
              {resendLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontSize: 14, fontFamily: fonts.medium }}>
                  Resend OTP
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            {
              marginTop: 20,
              paddingVertical: 12,
              alignItems: 'center',
            }
          ]}
          onPress={() => {
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