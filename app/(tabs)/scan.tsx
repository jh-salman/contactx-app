import CardModal from '@/components/CardModal'
import { useTabBar } from '@/context/TabBar'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import { useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const scan = () => {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [isScanning, setIsScanning] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [scannedCardId, setScannedCardId] = useState<string | null>(null)
  const [locationData, setLocationData] = useState<{
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  } | null>(null)
  const router = useRouter()
  const { hideTabBar, showTabBar } = useTabBar()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  // Get current location with permission
  const getCurrentLocation = async () => {
    try {
      // Check if permission already granted
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync()
      
      if (existingStatus !== 'granted') {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          console.log('⚠️ Location permission denied - will use IP-based location')
          return null
        }
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      // Reverse geocode to get city and country
      let city: string | undefined = undefined
      let country: string | undefined = undefined
      
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
        
        city = address?.city || address?.district || undefined
        country = address?.country || undefined
      } catch (geocodeError) {
        console.log('⚠️ Reverse geocoding failed:', geocodeError)
      }

      const locData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city,
        country,
      }

      console.log('✅ Location obtained:', locData)
      return locData
    } catch (error) {
      console.error('❌ Error getting location:', error)
      return null
    }
  }

  // Hide tab bar when screen is focused (scanning)
  useFocusEffect(
    React.useCallback(() => {
      // Hide tab bar when entering scan screen
      hideTabBar()
      
      // Return cleanup function to show tab bar when leaving
      return () => {
        showTabBar()
      }
    }, [hideTabBar, showTabBar])
  )

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return
    
    setScanned(true)
    setIsScanning(false)
    
    // Log detailed scan information
    const scanTimestamp = new Date().toISOString()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📱 QR CODE SCAN EVENT')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⏰ Timestamp:', scanTimestamp)
    console.log('📊 Scan Type:', type)
    console.log('📄 Raw Data:', data)
    console.log('📏 Data Length:', data.length)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Process the scanned data
    processScannedData(data)
  }

  const processScannedData = async (data: string) => {
    try {
      let cardId: string | null = null

      // Check if it's a URL with cardId
      if (data.startsWith('http://') || data.startsWith('https://')) {
        // Extract cardId from URL patterns:
        // http://localhost:3004/card/cmjxd54kd0000invbn723xz1y
        // http://example.com/card/123
        const urlMatch = data.match(/\/card\/([^\/\?&#]+)/i) || data.match(/cardId=([^&]+)/i)
        if (urlMatch && urlMatch[1]) {
          cardId = urlMatch[1].trim()
          console.log('📋 Extracted cardId from URL:', cardId)
        } else {
          // Regular URL, not a card
          Alert.alert(
            'QR Code Scanned',
            `URL: ${data}\n\nNo card ID found in URL.`,
            [
              {
                text: 'OK',
                style: 'cancel',
                onPress: () => resetScanner(),
              },
            ]
          )
          return
        }
      }
      // Check if it's JSON data with cardId
      else if (data.startsWith('{')) {
        try {
          const jsonData = JSON.parse(data)
          cardId = jsonData.cardId || jsonData.id || null
          if (cardId) {
            console.log('📋 Extracted cardId from JSON:', cardId)
          }
        } catch (e) {
          // Not valid JSON
        }
      }
      // Assume it's a direct cardId
      else {
        cardId = data.trim()
        console.log('📋 Using scanned data as cardId:', cardId)
      }

      // If we have a cardId, get location and show modal
      if (cardId) {
        // Get location (will request permission if needed)
        const location = await getCurrentLocation()
        setLocationData(location)
        
        // Log card ID extraction
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('✅ CARD ID EXTRACTED')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🆔 Card ID:', cardId)
        console.log('📋 Extraction Method:', 
          data.startsWith('http') ? 'URL Pattern' : 
          data.startsWith('{') ? 'JSON Parse' : 
          'Direct Card ID'
        )
        if (location) {
          console.log('📍 Location Data:', location)
        } else {
          console.log('⚠️ Location not available - backend will use IP-based detection')
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        setScannedCardId(cardId)
        setShowModal(true)
        setIsScanning(false)
      } else {
        // No cardId found
        Alert.alert(
          'QR Code Scanned',
          `Data: ${data}\n\nNo card ID found in scanned data.`,
          [
            {
              text: 'OK',
              onPress: () => resetScanner(),
            },
          ]
        )
      }
    } catch (error) {
      console.error('Error processing scanned data:', error)
      Alert.alert('Error', 'Failed to process scanned data')
      resetScanner()
    }
  }

  const resetScanner = () => {
    setScanned(false)
    setIsScanning(true)
    setShowModal(false)
    setScannedCardId(null)
    setLocationData(null)
  }

  const handleModalClose = () => {
    setShowModal(false)
    resetScanner()
    // Ensure tab bar is shown when modal closes (in case user navigates away)
    showTabBar()
  }

  const handleContactSaved = () => {
    // Contact saved successfully, can refresh contacts list if needed
    console.log('Contact saved successfully')
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    cameraContainer: {
      flex: 1,
    },
    camera: {
      flex: 1,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanArea: {
      width: 250,
      height: 250,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderColor: colors.primary,
      borderWidth: 3,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    topRight: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    instructionText: {
      fontSize: 16,
      marginTop: 30,
      textAlign: 'center',
      padding: 10,
      borderRadius: 8,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.placeholder,
    },
    permissionText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 20,
      textAlign: 'center',
    },
    permissionSubText: {
      fontSize: 14,
      color: colors.placeholder,
      marginTop: 10,
      textAlign: 'center',
      marginBottom: 30,
    },
    permissionButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 30,
      paddingVertical: 12,
      borderRadius: 8,
    },
    permissionButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    scannedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    scannedText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 20,
    },
    scanAgainButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 30,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 30,
    },
    scanAgainButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  })

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { fontFamily: fonts.regular, fontSize: 16 }]}>Requesting camera permission...</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.centerContent}>
            <MaterialCommunityIcons name="camera-off" size={64} color={colors.placeholder} />
            <Text style={[styles.permissionText, { fontFamily: fonts.medium, fontSize: 20 }]}>Camera permission is required</Text>
            <Text style={[styles.permissionSubText, { fontFamily: fonts.regular, fontSize: 14 }]}>Please allow camera access to scan QR codes</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={[styles.permissionButtonText, { fontFamily: fonts.medium, fontSize: 16, color: colors.buttonPrimaryText }]}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.cameraContainer}>
          {isScanning && (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e'],
                }}
              />
              <View style={styles.overlay}>
                <View style={styles.scanArea}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={[styles.instructionText, { 
                  fontFamily: fonts.regular, 
                  fontSize: 16,
                  color: colors.buttonPrimaryText,
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.6)'
                }]}>
                  Position QR code within the frame
                </Text>
              </View>
            </>
          )}
          
          {!isScanning && (
            <View style={styles.scannedContainer}>
              <MaterialCommunityIcons name="check-circle" size={64} color={colors.primary} />
              <Text style={[styles.scannedText, { fontFamily: fonts.bold, fontSize: 32 }]}>QR Code Scanned!</Text>
              <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
                <Text style={[styles.scanAgainButtonText, { fontFamily: fonts.medium, fontSize: 16, color: colors.buttonPrimaryText }]}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Card Modal */}
        {scannedCardId && (
          <CardModal
            visible={showModal}
            cardId={scannedCardId}
            onClose={handleModalClose}
            locationData={locationData}
          />
        )}
      </SafeAreaView>
    </View>
  )
}

export default scan