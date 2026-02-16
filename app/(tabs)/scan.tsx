import CardModal from '@/components/CardModal'
import { useTabBar } from '@/context/TabBar'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { logger } from '@/lib/logger'
import { showError, showInfo } from '@/lib/toast'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen'
import { moderateScale, verticalScale } from 'react-native-size-matters'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const MS = moderateScale
const VS = verticalScale
const ICON_HEADER = MS(24)
const ICON_MD = MS(64)
const FRAME_SIZE = Math.min(wp(70), MS(280))
const CORNER_SIZE = MS(30)
const CORNER_WIDTH = MS(3)

type ScanMode = 'smart' | 'paper' | 'qr'

type LocationData = {
  latitude?: number
  longitude?: number
  city?: string
  country?: string
  street?: string
  streetNumber?: string
  district?: string
  region?: string
  subregion?: string
  postalCode?: string
  name?: string
  formattedAddress?: string
  isoCountryCode?: string
}

const MODE_SUBTITLES: Record<ScanMode, string> = {
  smart: 'Automatically detect QR code or business card',
  paper: 'Scan a business card to extract contact info',
  qr: 'Scan any QR code, including ContactX card',
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { hideTabBar, showTabBar } = useTabBar()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  const [permission, requestPermission] = useCameraPermissions()
  const [scanMode, setScanMode] = useState<ScanMode>('qr')
  const [torchOn, setTorchOn] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [isScanning, setIsScanning] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [scannedCardId, setScannedCardId] = useState<string | null>(null)
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<
    'undetermined' | 'granted' | 'denied' | null
  >(null)
  const [capturing, setCapturing] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      hideTabBar()
      Location.getForegroundPermissionsAsync().then(({ status }) => {
        setLocationPermissionStatus(
          status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined'
        )
      })
      return () => showTabBar()
    }, [hideTabBar, showTabBar])
  )

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync()
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          showInfo('Location denied', 'Using approximate location for scan')
          return null
        }
      }
      const providerStatus = await Location.getProviderStatusAsync()
      if (providerStatus && !providerStatus.locationServicesEnabled) {
        showInfo('Location unavailable', 'Using approximate location for scan')
        return null
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      let city: string | undefined
      let country: string | undefined
      let street: string | undefined
      let streetNumber: string | undefined
      let district: string | undefined
      let region: string | undefined
      let subregion: string | undefined
      let postalCode: string | undefined
      let name: string | undefined
      let formattedAddress: string | undefined
      let isoCountryCode: string | undefined
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
        city = (address?.city ?? address?.district) ?? undefined
        country = address?.country ?? undefined
        street = address?.street ?? undefined
        streetNumber = address?.streetNumber ?? undefined
        district = address?.district ?? undefined
        region = address?.region ?? undefined
        subregion = address?.subregion ?? undefined
        postalCode = address?.postalCode ?? undefined
        name = address?.name ?? undefined
        formattedAddress = address?.formattedAddress ?? undefined
        isoCountryCode = address?.isoCountryCode ?? undefined
      } catch {
        logger.warn('Reverse geocoding failed')
      }
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city,
        country,
        street,
        streetNumber,
        district,
        region,
        subregion,
        postalCode,
        name,
        formattedAddress,
        isoCountryCode,
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('Error getting location', error)
      if (/permission|denied/i.test(msg)) {
        showInfo('Location denied', 'Using approximate location for scan')
      } else if (/timeout|timed out/i.test(msg)) {
        showInfo('Location timeout', 'Using approximate location for scan')
      } else {
        showInfo('Location unavailable', 'Using approximate location for scan')
      }
      return null
    }
  }

  const handleLocationAllow = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setLocationPermissionStatus(status === 'granted' ? 'granted' : 'denied')
      if (status === 'granted') {
        const loc = await getCurrentLocation()
        if (loc) setLocationData(loc)
      } else {
        showInfo('Location denied', 'Using approximate location when you scan')
      }
    } catch {
      showError('Error', 'Could not request location permission')
      setLocationPermissionStatus('denied')
    }
  }

  const handleLocationSkip = () => {
    setLocationPermissionStatus('denied')
    showInfo('Skipped', 'Using approximate location when you scan')
  }

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return
    setScanned(true)
    setIsScanning(false)
    processScannedData(data).catch((err) => {
      logger.error('Error processing scan', err)
      showError('Scan failed', 'Could not process QR code. Try again.')
      resetScanner()
    })
  }

  const processScannedData = async (data: string) => {
    let cardId: string | null = null
    if (data.startsWith('http://') || data.startsWith('https://')) {
      const urlMatch = data.match(/\/card\/([^/?&#]+)/i) || data.match(/cardId=([^&]+)/i)
      if (urlMatch?.[1]) cardId = urlMatch[1].trim()
      else {
        Alert.alert('QR Scanned', `No ContactX card found in URL.\n\n${data}`, [
          { text: 'OK', onPress: resetScanner },
        ])
        return
      }
    } else if (data.startsWith('{')) {
      try {
        const json = JSON.parse(data)
        cardId = json.cardId ?? json.id ?? null
      } catch {
        // ignore
      }
    } else {
      cardId = data.trim() || null
    }
    if (cardId) {
      setScannedCardId(cardId)
      setShowModal(true)
      setIsScanning(false)
      setLocationData(null)
      setLocationReady(false)
      getCurrentLocation()
        .then((loc) => {
          setLocationData(loc ?? null)
          setLocationReady(true)
        })
        .catch(() => setLocationReady(true))
    } else {
      Alert.alert('QR Scanned', 'No card ID found in scanned data.', [
        { text: 'OK', onPress: resetScanner },
      ])
    }
  }

  const resetScanner = () => {
    setScanned(false)
    setIsScanning(true)
    setShowModal(false)
    setScannedCardId(null)
    setLocationData(null)
    setLocationReady(false)
  }

  const handleModalClose = () => {
    setShowModal(false)
    resetScanner()
    showTabBar()
  }

  const handleGalleryPress = async () => {
    if (scanMode !== 'paper' && scanMode !== 'smart') return
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        showError('Permission needed', 'Allow photo library access to pick a business card image.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 2],
        quality: 0.8,
      })
      if (result.canceled) return
      // TODO: send image to backend for OCR, then navigate to create-contact with params
      showInfo('Coming soon', 'Business card extraction will open Create Contact with auto-filled details.')
      router.push('/create-contact' as never)
    } catch (error) {
      logger.error('Gallery picker error', error)
      showError('Error', 'Could not open photo library. Try again.')
    }
  }

  const handleShutterPress = async () => {
    if (scanMode === 'qr') return
    if (scanMode === 'paper' || scanMode === 'smart') {
      try {
        setCapturing(true)
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          showError('Camera needed', 'Allow camera access to capture the business card.')
          return
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [3, 2],
          quality: 0.8,
        })
        if (result.canceled) return
        // TODO: send image to backend for OCR, then navigate to create-contact with params
        showInfo('Coming soon', 'Business card extraction will open Create Contact with auto-filled details.')
        router.push('/create-contact' as never)
      } catch (error) {
        logger.error('Camera capture error', error)
        showError('Error', 'Could not capture photo. Try again.')
      } finally {
        setCapturing(false)
      }
    }
  }

  const isQRMode = scanMode === 'qr'
  const showBarcodeScanner = isQRMode && isScanning

  const renderBackButton = () => (
    <TouchableOpacity
      style={[
        styles.closeButton,
        {
          top: insets.top + (Platform.OS === 'ios' ? MS(8) : MS(12)),
          left: insets.left + MS(16),
          backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.3)',
        },
      ]}
      onPress={() => router.back()}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name="close" size={ICON_HEADER} color={colors.text} />
    </TouchableOpacity>
  )

  const renderModeOption = (mode: ScanMode, label: string, icon: string) => {
    const selected = scanMode === mode
    return (
      <TouchableOpacity
        key={mode}
        style={[
          styles.modeOption,
          {
            backgroundColor: selected ? colors.card : colors.backgroundSecondary || colors.card,
            borderColor: selected ? colors.primary : colors.border,
            borderWidth: selected ? 2 : 1,
          },
        ]}
        onPress={() => setScanMode(mode)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={MS(28)}
          color={selected ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.modeOptionLabel,
            {
              color: selected ? colors.text : colors.textSecondary,
              fontFamily: selected ? fonts.medium : fonts.regular,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderPermissionChecking = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.hintText, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
        Checking permissions...
      </Text>
    </View>
  )

  const renderLocationPrompt = () => (
    <View style={styles.centerContent}>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
        <MaterialCommunityIcons name="map-marker-radius" size={MS(56)} color={colors.primary} />
      </View>
      <Text style={[styles.titleText, { fontFamily: fonts.bold, color: colors.text }]}>
        Enable Location Access
      </Text>
      <Text style={[styles.subtitleText, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
        Allow location to save accurate address when you scan.
      </Text>
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleLocationAllow}>
        <Text style={[styles.primaryButtonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>
          Allow Location
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: colors.border }]}
        onPress={handleLocationSkip}
      >
        <Text style={[styles.secondaryButtonText, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
          Skip for now
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderCameraDenied = () => (
    <View style={styles.centerContent}>
      <MaterialCommunityIcons name="camera-off" size={ICON_MD} color={colors.placeholder} />
      <Text style={[styles.titleText, { fontFamily: fonts.medium, color: colors.text }]}>
        Camera permission required
      </Text>
      <Text style={[styles.subtitleText, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
        Allow camera access to scan QR codes and business cards.
      </Text>
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
        <Text style={[styles.primaryButtonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>
          Grant Permission
        </Text>
      </TouchableOpacity>
    </View>
  )

  if (locationPermissionStatus === null) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          {renderBackButton()}
          {renderPermissionChecking()}
        </SafeAreaView>
      </View>
    )
  }

  if (locationPermissionStatus === 'undetermined') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          {renderBackButton()}
          {renderLocationPrompt()}
        </SafeAreaView>
      </View>
    )
  }

  if (!permission) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          {renderBackButton()}
          {renderPermissionChecking()}
        </SafeAreaView>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          {renderBackButton()}
          {renderCameraDenied()}
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        {renderBackButton()}

        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + MS(8) + VS(12),
            },
          ]}
        >
          <Text style={[styles.headerTitle, { fontFamily: fonts.bold, color: colors.text }]}>
            Scan contact information
          </Text>
          <Text
            style={[styles.headerSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {MODE_SUBTITLES[scanMode]}
          </Text>
        </View>

        <View style={styles.cameraContainer}>
          {showBarcodeScanner ? (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                enableTorch={torchOn}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e'],
                }}
              />
              <View style={styles.overlay}>
                <View style={[styles.frame, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
                  <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
                </View>
                <Text
                  style={[
                    styles.instructionText,
                    {
                      fontFamily: fonts.regular,
                      color: isDark ? colors.text : colors.buttonPrimaryText,
                    },
                  ]}
                >
                  {isQRMode ? 'Position QR code within the frame' : 'Position business card in frame'}
                </Text>
              </View>
            </>
          ) : !isScanning && isQRMode ? (
            <View style={styles.centerContent}>
              <MaterialCommunityIcons name="check-circle" size={ICON_MD} color={colors.primary} />
              <Text style={[styles.titleText, { fontFamily: fonts.bold, color: colors.text }]}>QR Code Scanned!</Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: VS(24) }]}
                onPress={resetScanner}
              >
                <Text style={[styles.primaryButtonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>
                  Scan Again
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView style={styles.camera} facing="back" enableTorch={torchOn} />
              <View style={styles.overlay}>
                <View style={[styles.frame, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
                  <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
                </View>
                <Text
                  style={[
                    styles.instructionText,
                    { fontFamily: fonts.regular, color: isDark ? colors.text : colors.buttonPrimaryText },
                  ]}
                >
                  Tap capture or gallery to scan a business card
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={[styles.modeRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          {renderModeOption('smart', 'Smart capture', 'auto-fix')}
          {renderModeOption('paper', 'Paper card', 'card-account-details-outline')}
          {renderModeOption('qr', 'QR code', 'qrcode-scan')}
        </View>

        <View style={[styles.controlsRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.card }]}
            onPress={handleGalleryPress}
            disabled={scanMode === 'qr'}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="image-multiple"
              size={MS(28)}
              color={scanMode === 'qr' ? colors.placeholder : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shutterButton, { borderColor: colors.text }]}
            onPress={handleShutterPress}
            disabled={scanMode === 'qr' || capturing}
            activeOpacity={0.8}
          >
            {capturing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={[styles.shutterInner, { backgroundColor: colors.text }]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.card }]}
            onPress={() => setTorchOn((v) => !v)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={torchOn ? 'flashlight' : 'flashlight-off'}
              size={MS(28)}
              color={torchOn ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {scannedCardId && (
        <CardModal
          visible={showModal}
          cardId={scannedCardId}
          onClose={handleModalClose}
          locationData={locationData}
          locationReady={locationReady}
          autoSave
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    zIndex: 20,
    width: MS(44),
    height: MS(44),
    borderRadius: MS(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: MS(20),
    paddingTop: VS(12),
    paddingBottom: VS(8),
  },
  headerTitle: {
    fontSize: MS(20),
    marginBottom: VS(4),
  },
  headerSubtitle: {
    fontSize: MS(14),
    lineHeight: MS(20),
  },
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: MS(12),
    paddingVertical: VS(8),
    gap: MS(8),
  },
  modeOption: {
    flex: 1,
    borderRadius: MS(12),
    paddingVertical: VS(12),
    paddingHorizontal: MS(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOptionLabel: {
    fontSize: MS(11),
    marginTop: VS(4),
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderWidth: CORNER_WIDTH,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    fontSize: MS(14),
    marginTop: VS(24),
    textAlign: 'center',
    paddingHorizontal: MS(20),
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: VS(20),
    paddingHorizontal: MS(24),
    borderTopWidth: 1,
  },
  controlButton: {
    width: MS(56),
    height: MS(56),
    borderRadius: MS(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButton: {
    width: MS(72),
    height: MS(72),
    borderRadius: MS(36),
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: MS(56),
    height: MS(56),
    borderRadius: MS(28),
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MS(20),
  },
  titleText: {
    fontSize: MS(20),
    marginTop: VS(16),
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: MS(14),
    marginTop: VS(8),
    textAlign: 'center',
    paddingHorizontal: MS(24),
  },
  hintText: {
    marginTop: VS(12),
    fontSize: MS(16),
  },
  iconCircle: {
    width: MS(88),
    height: MS(88),
    borderRadius: MS(44),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: VS(20),
  },
  primaryButton: {
    paddingHorizontal: MS(32),
    paddingVertical: VS(14),
    borderRadius: MS(12),
    marginTop: VS(24),
  },
  primaryButtonText: {
    fontSize: MS(16),
  },
  secondaryButton: {
    paddingVertical: VS(12),
    paddingHorizontal: MS(24),
    borderWidth: 1,
    borderRadius: MS(10),
    marginTop: VS(12),
  },
  secondaryButtonText: {
    fontSize: MS(15),
  },
})
