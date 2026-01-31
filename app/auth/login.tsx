import { API_BASE_URL } from '@/config/api'
import { useAuth } from '@/context/AuthContext'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { testConnection } from '@/lib/testConnection'
import { authService } from '@/services/authService'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const login = () => {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const router = useRouter()
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  // Redirect to tabs if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // User is already logged in, but they're on login page
      // Don't auto-redirect, let them see logout option
    }
  }, [isAuthenticated, authLoading])

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number')
      return
    }

    const phoneNumber = phone.trim()

    setLoading(true)
    try {
      const result = await authService.login(phoneNumber);
      router.push({
        pathname: '/auth/verify-otp',
        params: { phone: phoneNumber },
      })
    } catch (error: any) {
      // Log errors (dev only)
      if (__DEV__) {
        if (!error.response) {
          console.warn('⚠️ Login network error:', error?.code || error?.message);
        } else {
          console.error('❌ Login API error:', error.response.status, error.response.data);
        }
      }
      
      let errorMessage = 'Failed to send OTP.';
      let errorTitle = 'Error';
      
      // Network errors (no response from server)
      if (!error.response) {
        errorTitle = 'Connection Error';
        
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          errorMessage = 'Request timeout.\n\nThe server is not responding. Please check:\n\n• Backend server is running\n• Device and server on same WiFi network\n• Firewall allows port 3004\n• Try again in a moment';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Connection refused.\n\nThe server is not accepting connections. Please check if backend server is running on port 3004.';
        } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
          errorMessage = 'Server not found.\n\nCannot resolve the server address. Please check your API configuration.';
        } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
          errorMessage = `Cannot connect to server.\n\nServer: ${API_BASE_URL.replace('/api', '')}\n\nTroubleshooting:\n• Verify server is running\n• Check if device and server are on same WiFi\n• Try opening server URL in phone browser\n• Verify IP address (run 'ifconfig' or 'ipconfig')\n• Check firewall settings for port 3004\n• Ensure server listens on 0.0.0.0, not just localhost`;
        } else if (error.message) {
          errorMessage = `Network error: ${error.message}\n\nPlease check your internet connection and try again.`;
        } else {
          errorMessage = 'Network error occurred. Please check your connection and try again.';
        }
      } 
      // API response errors (server responded with error)
      else if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400 || status === 422) {
          errorTitle = 'Invalid Request';
          errorMessage = data?.message || data?.error || 'Invalid phone number format. Please check and try again.';
        } else if (status === 404) {
          errorTitle = 'Not Found';
          errorMessage = data?.message || 'API endpoint not found. Please check backend configuration.';
        } else if (status === 403) {
          errorTitle = 'Access Denied';
          errorMessage = data?.message || 'Access denied. Please check your configuration.';
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

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      console.log('🔍 Testing connection to server...')
      const result = await testConnection()
      
      if (result.success) {
        Alert.alert(
          '✅ Connection Successful',
          `Server is reachable!\n\nServer: ${API_BASE_URL.replace('/api', '')}\nStatus: ${result.details?.status} ${result.details?.statusText}`
        )
      } else {
        const serverUrl = API_BASE_URL.replace('/api', '')
        const suggestions = result.details?.suggestions || []
        const suggestionText = suggestions.slice(0, 5).join('\n\n')
        
        Alert.alert(
          '❌ Connection Failed',
          `Cannot connect to server.\n\nServer: ${serverUrl}\n\nError: ${result.error}\n\nTroubleshooting:\n${suggestionText}\n\nWould you like to open server URL in browser?`,
          [
            {
              text: 'Open in Browser',
              onPress: () => {
                Linking.openURL(serverUrl).catch(() => {
                  Alert.alert('Error', 'Could not open browser')
                })
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        )
        console.warn('🔍 Connection test failed:', result.details)
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to test connection: ' + (error?.message || 'Unknown error'))
      console.error('Connection test error:', error)
    } finally {
      setTestingConnection(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true)
            try {
              await logout()
              // Stay on login page after logout
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.')
            } finally {
              setLogoutLoading(false)
            }
          },
        },
      ]
    )
  }

  // Create styles with theme colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 16,
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
      marginBottom: 20,
      textAlign: 'center',
    },
    userInfo: {
      fontSize: 16,
      marginBottom: 10,
      textAlign: 'center',
    },
    input: {
      marginBottom: 20,
    },
    buttonContainer: {
      marginTop: 30,
      width: '100%',
    },
    spacer: {
      height: 15,
    },
  })

  // Dynamic styles that use theme colors
  const dynamicStyles = {
    appNameText: {
      color: colors.primary,
    },
    loadingIndicator: {
      color: colors.primary,
    },
  }

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={dynamicStyles.loadingIndicator.color} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // If user is already logged in, show logout option
  if (isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.centerContent}>
            <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold, fontSize: 32 }]}>Already Logged In</Text>
            {user?.phoneNumber && (
              <Text style={[styles.userInfo, { color: colors.text, fontFamily: fonts.regular, fontSize: 16 }]}>Phone: {user.phoneNumber}</Text>
            )}
            {user?.email && (
              <Text style={[styles.userInfo, { color: colors.text, fontFamily: fonts.regular, fontSize: 16 }]}>Email: {user.email}</Text>
            )}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  {
                    backgroundColor: colors.primaryDark,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 44,
                    width: '100%',
                    opacity: logoutLoading ? 0.6 : 1,
                  }
                ]}
                onPress={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                ) : (
                  <Text style={{ color: colors.buttonPrimaryText, fontSize: 16, fontWeight: '600', fontFamily: fonts.medium }}>Logout</Text>
                )}
              </TouchableOpacity>
              <View style={styles.spacer} />
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
                  }
                ]}
                onPress={() => router.replace('/(tabs)/cards')}
              >
                <Text style={{ color: colors.buttonPrimaryText, fontSize: 16, fontWeight: '600', fontFamily: fonts.medium }}>Go to App</Text>
              </TouchableOpacity>
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, dynamicStyles.appNameText, { fontFamily: fonts.bold, fontSize: 32 }]}>SalonX</Text>
          <Text style={[styles.tagline, { color: colors.placeholder, fontFamily: fonts.regular, fontSize: 12 }]}>Digital Solutions</Text>
        </View>
        
        <View style={styles.formSection}>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold, fontSize: 32 }]}>Login</Text>
          <TextInput
            placeholder="Enter Phone Number"
            placeholderTextColor={colors.placeholder}
            value={phone}
            onChangeText={setPhone}
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                fontFamily: fonts.regular,
              }
            ]}
            keyboardType="phone-pad"
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
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
            ) : (
              <Text style={{ color: colors.buttonPrimaryText, fontSize: 16, fontWeight: '600', fontFamily: fonts.medium }}>Send OTP</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              {
                backgroundColor: colors.input,
                borderColor: colors.primary,
                borderWidth: 1,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                width: '100%',
                marginTop: 12,
                opacity: testingConnection ? 0.6 : 1,
              }
            ]}
            onPress={handleTestConnection}
            disabled={testingConnection}
          >
            {testingConnection ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', fontFamily: fonts.medium }}>🔍 Test Server Connection</Text>
            )}
          </TouchableOpacity>
          
          <Text style={{ 
            color: colors.placeholder, 
            fontSize: 11, 
            textAlign: 'center', 
            marginTop: 8,
            fontFamily: fonts.regular 
          }}>
            Server: {API_BASE_URL.replace('/api', '')}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

export default login