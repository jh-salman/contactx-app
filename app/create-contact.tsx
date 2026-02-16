import { FloatingOutlinedInput } from '@/components/FloatingOutlinedInput'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { logger } from '@/lib/logger'
import { showError, showSuccess, showWarning } from '@/lib/toast'
import { apiService } from '@/services/apiService'
import { uploadImageToCloudinary } from '@/services/imageUploadService'
import { convertImageToBase64 } from '@/utils/imageUtils'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { moderateScale, verticalScale } from 'react-native-size-matters'
import { SafeAreaView } from 'react-native-safe-area-context'

const MS = moderateScale
const VS = verticalScale

type WhereMetStep = 'popup' | 'input' | 'none'

export default function CreateContact() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
    company?: string
    jobTitle?: string
    city?: string
    country?: string
  }>()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    jobTitle: '',
    note: '',
    city: '',
    country: '',
    profile_img: '',
  })
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [whereMetStep, setWhereMetStep] = useState<WhereMetStep>('none')
  const [whereMetInput, setWhereMetInput] = useState('')
  const [locationData, setLocationData] = useState<{
    latitude?: number
    longitude?: number
    city?: string
    country?: string
  } | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [profileImageModalVisible, setProfileImageModalVisible] = useState(false)

  useEffect(() => {
    if (params.firstName) setFormData((p) => ({ ...p, firstName: String(params.firstName ?? '') }))
    if (params.lastName) setFormData((p) => ({ ...p, lastName: String(params.lastName ?? '') }))
    if (params.phone) setFormData((p) => ({ ...p, phone: String(params.phone ?? '') }))
    if (params.email) setFormData((p) => ({ ...p, email: String(params.email ?? '') }))
    if (params.company) setFormData((p) => ({ ...p, company: String(params.company ?? '') }))
    if (params.jobTitle) setFormData((p) => ({ ...p, jobTitle: String(params.jobTitle ?? '') }))
    if (params.city) setFormData((p) => ({ ...p, city: String(params.city ?? '') }))
    if (params.country) setFormData((p) => ({ ...p, country: String(params.country ?? '') }))
  }, [params])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim() && !formData.lastName.trim()) {
      showError('Validation', 'Please enter at least first name or last name')
      return false
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      showError('Validation', 'Please enter at least phone number or email')
      return false
    }
    return true
  }

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return null
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      let city: string | undefined
      let country: string | undefined
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
        city = (address?.city ?? address?.district) ?? undefined
        country = address?.country ?? undefined
      } catch {
        //
      }
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city,
        country,
      }
    } catch (e) {
      logger.error('getCurrentLocation error', e)
      return null
    }
  }

  const uploadProfileImage = async (asset: { uri?: string; base64?: string | null }) => {
    if (!asset?.uri && !asset?.base64) {
      showError('Invalid image', 'No image data.')
      return false
    }
    setUploadingImage(true)
    try {
      let base64Image: string | null = null
      if (asset.base64) {
        const uri = (asset.uri ?? '').toLowerCase()
        const isPng = uri.endsWith('.png') || uri.includes('.png')
        base64Image = `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${asset.base64}`
      } else if (asset.uri) {
        base64Image = await convertImageToBase64(asset.uri)
      }
      if (!base64Image) {
        showError('Upload failed', 'Could not read image. Try again.')
        return false
      }
      const url = await uploadImageToCloudinary(base64Image, 'profile')
      if (url) {
        handleInputChange('profile_img', url)
        showSuccess('Uploaded', 'Profile photo added')
        return true
      }
      showError('Upload failed', 'No URL returned. Try again.')
      return false
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Could not upload image.'
      showError('Upload failed', msg)
      return false
    } finally {
      setUploadingImage(false)
    }
  }

  const openProfileImagePicker = () => {
    setProfileImageModalVisible(true)
  }

  const pickProfileFromGallery = async () => {
    setProfileImageModalVisible(false)
    // Small delay so modal can close before picker opens (fixes iOS)
    await new Promise((r) => setTimeout(r, 300))
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        showWarning('Permission required', 'Please grant access to your photos.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })
      if (!result.canceled && result.assets?.[0]) {
        await uploadProfileImage(result.assets[0])
      }
    } catch (e: any) {
      showError('Error', e?.message ?? 'Failed to pick image.')
    }
  }

  const pickProfileFromCamera = async () => {
    setProfileImageModalVisible(false)
    await new Promise((r) => setTimeout(r, 300))
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        showWarning('Permission required', 'Please grant camera access.')
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })
      if (!result.canceled && result.assets?.[0]) {
        await uploadProfileImage(result.assets[0])
      }
    } catch (e: any) {
      showError('Error', e?.message ?? 'Failed to capture photo.')
    }
  }

  const doCreateContact = async (extra: {
    whereMet?: string
    city?: string | null
    country?: string | null
    latitude?: number | null
    longitude?: number | null
  }) => {
    try {
      setLoading(true)
      const payload = {
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        jobTitle: formData.jobTitle.trim() || undefined,
        note: formData.note.trim() || undefined,
        whereMet: extra.whereMet?.trim() || undefined,
        profile_img: formData.profile_img.trim() || undefined,
        city: extra.city ?? (formData.city.trim() || null),
        country: extra.country ?? (formData.country.trim() || null),
        latitude: extra.latitude ?? null,
        longitude: extra.longitude ?? null,
      }
      const res = await apiService.createContact(payload)
      const contact = res?.data ?? res
      showSuccess('Contact created', 'Successfully added to contacts')
      router.replace(`/contact/${contact?.id}` as never)
    } catch (error: any) {
      logger.error('Create contact error', error)
      showError(
        'Error',
        error?.response?.data?.message ?? error?.message ?? 'Failed to create contact'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAllowLocation = async () => {
    setGettingLocation(true)
    const loc = await getCurrentLocation()
    setGettingLocation(false)
    setWhereMetStep('none')
    if (loc) {
      setLocationData(loc)
      setFormData((p) => ({
        ...p,
        city: loc.city ?? p.city,
        country: loc.country ?? p.country,
      }))
      await doCreateContact({
        city: loc.city ?? null,
        country: loc.country ?? null,
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
      })
    } else {
      setWhereMetStep('input')
    }
  }

  const handleSkipLocation = () => {
    setWhereMetStep('input')
  }

  const handleWhereMetContinue = () => {
    setWhereMetStep('none')
    doCreateContact({ whereMet: whereMetInput.trim() || undefined })
  }

  const handleWhereMetSkip = () => {
    setWhereMetStep('none')
    doCreateContact({})
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    setWhereMetStep('popup')
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: MS(16),
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: MS(18), fontWeight: '600', color: colors.text },
    content: { flex: 1 },
    contentContainer: { padding: MS(20), paddingBottom: VS(40) },
    section: {
      marginBottom: MS(24),
    },
    sectionTitle: {
      fontSize: MS(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: MS(12),
    },
    inputGroup: { marginBottom: MS(16) },
    avatarSection: {
      alignItems: 'center',
      marginBottom: MS(24),
    },
    avatarOuter: {
      width: VS(120),
      height: VS(120),
      borderRadius: VS(60),
      backgroundColor: colors.inputBackground,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarAddBtn: {
      marginTop: MS(12),
      flexDirection: 'row',
      alignItems: 'center',
      gap: MS(8),
      paddingVertical: MS(10),
      paddingHorizontal: MS(16),
      borderRadius: MS(10),
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarRemoveBtn: {
      marginTop: MS(8),
      paddingVertical: MS(6),
      paddingHorizontal: MS(12),
    },
    submitButton: {
      backgroundColor: colors.primary,
      padding: MS(16),
      borderRadius: MS(14),
      alignItems: 'center',
      marginTop: MS(16),
      marginBottom: VS(20),
    },
    submitButtonDisabled: { opacity: 0.6 },
    submitButtonText: { color: colors.buttonPrimaryText, fontSize: MS(16), fontWeight: '600' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: MS(24),
    },
    modalBox: {
      width: '100%',
      maxWidth: MS(320),
      backgroundColor: colors.card,
      borderRadius: MS(16),
      padding: MS(24),
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: { fontSize: MS(18), fontWeight: '600', color: colors.text, marginBottom: MS(8), textAlign: 'center' },
    modalSubtitle: { fontSize: MS(14), color: colors.textSecondary, marginBottom: MS(20), textAlign: 'center' },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: MS(8),
      padding: MS(12),
      fontSize: MS(16),
      color: colors.text,
      backgroundColor: colors.inputBackground,
      marginBottom: MS(16),
    },
    modalButton: { padding: MS(14), borderRadius: MS(10), alignItems: 'center', marginBottom: MS(10) },
    modalButtonSkip: {
      padding: MS(10),
      borderWidth: 1,
      borderRadius: MS(10),
      alignItems: 'center',
      borderColor: colors.border,
    },
    profileImageModalActions: {
      flexDirection: 'row',
      gap: MS(12),
      marginTop: MS(8),
    },
    profileImageModalBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: MS(8),
      padding: MS(14),
      borderRadius: MS(10),
      borderWidth: 1,
      borderColor: colors.border,
    },
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: fonts.medium, color: colors.text }]}>Create Contact</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Profile photo */}
          <View style={[styles.avatarSection, { backgroundColor: colors.card, padding: MS(20), borderRadius: MS(14), borderWidth: 1, borderColor: colors.borderLight }]}>
            <TouchableOpacity
              style={[styles.avatarOuter, { borderColor: colors.border }]}
              onPress={openProfileImagePicker}
              activeOpacity={formData.profile_img ? 1 : 0.7}
            >
              {formData.profile_img ? (
                <Image source={{ uri: formData.profile_img }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialCommunityIcons name="account-circle-outline" size={VS(56)} color={colors.placeholder} />
                  )}
                  <Text style={{ fontSize: MS(12), color: colors.placeholder, marginTop: MS(4) }}>Tap to add</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.avatarAddBtn, { borderColor: colors.border }]}
              onPress={openProfileImagePicker}
              disabled={uploadingImage}
            >
              {formData.profile_img ? (
                <>
                  <MaterialCommunityIcons name="camera" size={MS(18)} color={colors.primary} />
                  <Text style={{ fontSize: MS(14), color: colors.primary, fontFamily: fonts.medium }}>Change photo</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="image-plus" size={MS(18)} color={colors.primary} />
                  <Text style={{ fontSize: MS(14), color: colors.primary, fontFamily: fonts.medium }}>Add profile photo</Text>
                </>
              )}
            </TouchableOpacity>
            {formData.profile_img && (
              <TouchableOpacity style={styles.avatarRemoveBtn} onPress={() => handleInputChange('profile_img', '')}>
                <Text style={{ fontSize: MS(13), color: colors.error, fontFamily: fonts.medium }}>Remove photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Personal Information</Text>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="First Name"
                value={formData.firstName}
                onChangeText={(v) => handleInputChange('firstName', v)}
                containerStyle={{ marginBottom: MS(12) }}
              />
            </View>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Last Name"
                value={formData.lastName}
                onChangeText={(v) => handleInputChange('lastName', v)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Contact Information</Text>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Phone"
                value={formData.phone}
                onChangeText={(v) => handleInputChange('phone', v)}
                keyboardType="phone-pad"
                restrictInput="numeric"
                containerStyle={{ marginBottom: MS(12) }}
              />
            </View>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Email"
                value={formData.email}
                onChangeText={(v) => handleInputChange('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                restrictInput="email"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Professional Information</Text>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Company"
                value={formData.company}
                onChangeText={(v) => handleInputChange('company', v)}
                containerStyle={{ marginBottom: MS(12) }}
              />
            </View>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Job Title"
                value={formData.jobTitle}
                onChangeText={(v) => handleInputChange('jobTitle', v)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Location</Text>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="City (optional)"
                value={formData.city}
                onChangeText={(v) => handleInputChange('city', v)}
                containerStyle={{ marginBottom: MS(12) }}
              />
            </View>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Country (optional)"
                value={formData.country}
                onChangeText={(v) => handleInputChange('country', v)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Notes</Text>
            <FloatingOutlinedInput
              label="Add notes about this contact"
              value={formData.note}
              onChangeText={(v) => handleInputChange('note', v)}
              multiline
              numberOfLines={4}
              inputStyle={{ minHeight: VS(100), textAlignVertical: 'top' }}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonPrimaryText} />
            ) : (
              <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>
                Create Contact
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={profileImageModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { fontFamily: fonts.bold, color: colors.text }]}>Add profile photo</Text>
            <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
              Choose how to add a photo
            </Text>
            <View style={styles.profileImageModalActions}>
              <TouchableOpacity
                style={[styles.profileImageModalBtn, { borderColor: colors.border }]}
                onPress={pickProfileFromCamera}
              >
                <MaterialCommunityIcons name="camera" size={MS(22)} color={colors.primary} />
                <Text style={{ fontSize: MS(14), color: colors.text, fontFamily: fonts.medium }}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.profileImageModalBtn, { borderColor: colors.border }]}
                onPress={pickProfileFromGallery}
              >
                <MaterialCommunityIcons name="image" size={MS(22)} color={colors.primary} />
                <Text style={{ fontSize: MS(14), color: colors.text, fontFamily: fonts.medium }}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalButtonSkip, { borderColor: colors.border, marginTop: MS(12) }]}
              onPress={() => setProfileImageModalVisible(false)}
            >
              <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={whereMetStep === 'popup'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { fontFamily: fonts.bold, color: colors.text }]}>Where we met?</Text>
            <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
              Add location to remember where you met this contact
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleAllowLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator color={colors.buttonPrimaryText} />
              ) : (
                <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>
                  Allow Location
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButtonSkip, { borderColor: colors.border }]} onPress={handleSkipLocation}>
              <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={whereMetStep === 'input'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { fontFamily: fonts.bold, color: colors.text }]}>Where did you meet?</Text>
            <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
              e.g. Conference, Wedding, LinkedIn event, Café
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter where you met"
              placeholderTextColor={colors.placeholder}
              value={whereMetInput}
              onChangeText={setWhereMetInput}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleWhereMetContinue}
            >
              <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButtonSkip, { borderColor: colors.border }]} onPress={handleWhereMetSkip}>
              <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
