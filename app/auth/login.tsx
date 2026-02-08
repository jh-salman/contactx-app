import { API_BASE_URL } from '@/config/api'
import { useAuth } from '@/context/AuthContext'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { SalonXLogo } from '@/components/SalonXLogo'
import { testConnection } from '@/lib/testConnection'
import { logger } from '@/lib/logger'
import { authService } from '@/services/authService'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'


function normalizePhone(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, '')
  const hasPlus = trimmed.startsWith('+')
  const digitsOnly = trimmed.replace(/[^\d]/g, '')

  // Bangladesh
  if (digitsOnly.startsWith('01') && digitsOnly.length === 11) return `+88${digitsOnly}`
  if (digitsOnly.startsWith('8801') && digitsOnly.length === 13) return `+${digitsOnly}`

  // USA (10 digits)
  if (!hasPlus && digitsOnly.length === 10) return `+1${digitsOnly}`

  // If user typed + already, keep it
  if (hasPlus) return `+${digitsOnly}`

  // Fallback (not ideal, but lets backend decide)
  return digitsOnly
}

function isValidE164(phone: string) {
  if (!phone.startsWith('+')) return false
  const d = phone.slice(1)
  return d.length >= 10 && d.length <= 15
}

function maskPhone(phone?: string) {
  if (!phone) return ''
  // keep first 3 and last 2 digits (very simple)
  const p = String(phone)
  if (p.length <= 6) return p
  return `${p.slice(0, 3)}****${p.slice(-2)}`
}

const Login = () => {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const router = useRouter()
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth()

  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  const styles = useMemo(() => createStyles(), [])

  const showSuccess = (title: string, message?: string) => {
    Toast.show({ type: 'success', text1: title, text2: message })
  }

  const showError = (title: string, message?: string) => {
    Toast.show({ type: 'error', text1: title, text2: message })
  }

  const showInfo = (title: string, message?: string) => {
    Toast.show({ type: 'info', text1: title, text2: message })
  }

  const handleLogin = async () => {
    if (loading) return

    const normalized = normalizePhone(phone)

    if (!normalized) {
      showError('Phone required', 'Please enter your phone number')
      return
    }

    // Production-safe validation (basic)
    if (!isValidE164(normalized)) {
      showError('Invalid phone', 'Use BD (01xxxxxxxxx) or US (10 digits) format')
      return
    }

    setLoading(true)
    try {
      await authService.login(normalized)

      showSuccess('OTP Sent', 'Check your phone for the code')
      router.replace({
        pathname: '/auth/verify-otp',
        params: { phone: normalized },
      })
    } catch (err: unknown) {
      const error = err as any

      // Dev-only log
      if (__DEV__) {
        const status = error?.response?.status
        const data = error?.response?.data
        logger.warn('Login error', { status, data, code: error?.code, message: error?.message })
      }

      // User-friendly production message
      showError('Login failed', 'Could not send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (testingConnection) return

    setTestingConnection(true)
    try {
      const result = await testConnection()

      if (result.success) {
        showSuccess('Connected', 'Server is reachable')
      } else {
        const serverUrl = API_BASE_URL.replace('/api', '')
        showError('Connection failed', 'Could not reach server')

        // Optional: allow open in browser (safe)
        Alert.alert(
          'Connection Failed',
          `Open server URL in browser?\n\n${serverUrl}`,
          [
            {
              text: 'Open',
              onPress: () =>
                Linking.openURL(serverUrl).catch(() => {
                  showError('Error', 'Could not open browser')
                }),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        )

        if (__DEV__) {
          logger.debug('Connection test details', result)
        }
      }
    } catch (err: unknown) {
      if (__DEV__) logger.error('Connection test error', err)
      showError('Test failed', 'Please try again.')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLogoutLoading(true)
          try {
            await logout()
            showInfo('Logged out', 'You are now logged out')
          } catch {
            showError('Logout failed', 'Please try again')
          } finally {
            setLogoutLoading(false)
          }
        },
      },
    ])
  }

  // Loading while auth state resolving
  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // Already logged in screen
  if (isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.centerContent}>
            <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold, fontSize: 30 }]}>
              Already Logged In
            </Text>

            {!!user?.phoneNumber && (
              <Text style={[styles.userInfo, { color: colors.placeholder, fontFamily: fonts.regular }]}>
                Phone: {maskPhone(String(user.phoneNumber))}
              </Text>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    opacity: logoutLoading ? 0.7 : 1,
                  },
                ]}
                onPress={() => router.replace('/(tabs)/cards')}
              >
                <Text style={{ color: colors.buttonPrimaryText, fontSize: 16, fontFamily: fonts.medium }}>
                  Go to App
                </Text>
              </TouchableOpacity>

              <View style={styles.spacer} />

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primaryDark,
                    opacity: logoutLoading ? 0.7 : 1,
                  },
                ]}
                onPress={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                ) : (
                  <Text style={{ color: colors.buttonPrimaryText, fontSize: 16, fontFamily: fonts.medium }}>
                    Logout
                  </Text>
                )}
              </TouchableOpacity>

              {__DEV__ && (
                <Text style={[styles.serverText, { color: colors.placeholder, fontFamily: fonts.regular }]}>
                  Server: {API_BASE_URL.replace('/api', '')}
                </Text>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // Normal login form
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.logoSection}>
              <SalonXLogo width={100} height={100} />
              <Text style={[styles.appName, { color: colors.primary, fontFamily: fonts.bold, fontSize: 32 }]}>
                SalonX
              </Text>
              <Text style={[styles.tagline, { color: colors.placeholder, fontFamily: fonts.regular, fontSize: 12 }]}>
                Digital Solutions
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold, fontSize: 32 }]}>Login</Text>

              <TextInput
                placeholder="Enter Phone Number (BD/USA)"
                placeholderTextColor={colors.placeholder}
                value={phone}
                onChangeText={setPhone}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.primary,
                    color: colors.text,
                    fontFamily: fonts.regular,
                  },
                ]}
                keyboardType="phone-pad"
                keyboardAppearance={isDark ? 'dark' : 'light'}
                editable={!loading}
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                blurOnSubmit={false}
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                ) : (
                  <Text style={{ color: colors.buttonPrimaryText, fontSize: 16, fontFamily: fonts.medium }}>
                    Send OTP
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.primary,
                    opacity: testingConnection ? 0.7 : 1,
                  },
                ]}
                onPress={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontSize: 14, fontFamily: fonts.medium }}>
                    🔍 Test Server Connection
                  </Text>
                )}
              </TouchableOpacity>

              {__DEV__ && (
                <Text style={[styles.serverText, { color: colors.placeholder, fontFamily: fonts.regular }]}>
                  Server: {API_BASE_URL.replace('/api', '')}
                </Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  )
}

export default Login

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
      justifyContent: 'center',
      paddingBottom: 40,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 36,
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 14,
    },
    appName: {
      letterSpacing: 2,
      marginBottom: 4,
    },
    tagline: {
      letterSpacing: 1,
    },
    formSection: {
      width: '100%',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 18,
      textAlign: 'center',
    },
    userInfo: {
      fontSize: 14,
      marginTop: 6,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      marginBottom: 14,
      minHeight: 50,
    },
    buttonContainer: {
      marginTop: 18,
      width: '100%',
    },
    spacer: {
      height: 12,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      width: '100%',
    },
    secondaryButton: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      width: '100%',
      borderWidth: 1,
    },
    serverText: {
      fontSize: 11,
      textAlign: 'center',
      marginTop: 10,
    },
  })
}
