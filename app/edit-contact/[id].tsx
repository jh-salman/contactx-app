import { FloatingOutlinedInput } from '@/components/FloatingOutlinedInput'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { logger } from '@/lib/logger'
import { showError, showSuccess, showWarning } from '@/lib/toast'
import { apiService } from '@/services/apiService'
import { uploadImageToCloudinary } from '@/services/imageUploadService'
import { convertImageToBase64 } from '@/utils/imageUtils'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as ImagePicker from 'expo-image-picker'
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

export default function EditContact() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [profileImageModalVisible, setProfileImageModalVisible] = useState(false)

  useEffect(() => {
    if (id) fetchContact()
  }, [id])

  const fetchContact = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAllContacts()
      const contactsData = response.data || response.contacts || response || []
      const found = Array.isArray(contactsData)
        ? contactsData.find((c: any) => c.id === id || c._id === id)
        : null

      if (found) {
        setFormData({
          firstName: found.firstName || '',
          lastName: found.lastName || '',
          phone: found.phone || '',
          email: found.email || '',
          company: found.company || '',
          jobTitle: found.jobTitle || '',
          note: found.note || '',
          city: found.city || '',
          country: found.country || '',
          profile_img: found.profile_img ?? found.profileImg ?? '',
        })
      } else {
        showError('Error', 'Contact not found')
        router.back()
      }
    } catch (e: any) {
      logger.error('Error fetching contact', e)
      showError('Error', e?.message ?? 'Failed to load contact')
      router.back()
    } finally {
      setLoading(false)
    }
  }

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
        showError('Upload failed', 'Could not read image.')
        return false
      }
      const url = await uploadImageToCloudinary(base64Image, 'profile')
      if (url) {
        handleInputChange('profile_img', url)
        showSuccess('Uploaded', 'Profile photo updated')
        return true
      }
      return false
    } catch (e: any) {
      showError('Upload failed', e?.message ?? 'Could not upload image.')
      return false
    } finally {
      setUploadingImage(false)
    }
  }

  const openProfileImagePicker = () => setProfileImageModalVisible(true)

  const pickProfileFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        setProfileImageModalVisible(false)
        showWarning('Permission required', 'Please grant access to your photos.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })
      setProfileImageModalVisible(false)
      if (!result.canceled && result.assets?.[0]) {
        await uploadProfileImage(result.assets[0])
      }
    } catch (e: any) {
      setProfileImageModalVisible(false)
      showError('Error', e?.message ?? 'Failed to pick image.')
    }
  }

  const pickProfileFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        setProfileImageModalVisible(false)
        showWarning('Permission required', 'Please grant camera access.')
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })
      setProfileImageModalVisible(false)
      if (!result.canceled && result.assets?.[0]) {
        await uploadProfileImage(result.assets[0])
      }
    } catch (e: any) {
      setProfileImageModalVisible(false)
      showError('Error', e?.message ?? 'Failed to capture photo.')
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setSaving(true)
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        company: formData.company.trim(),
        jobTitle: formData.jobTitle.trim(),
        note: formData.note.trim(),
        city: formData.city.trim() || undefined,
        country: formData.country.trim() || undefined,
        profile_img: formData.profile_img.trim(),
      }

      await apiService.updateContact(id, updateData)
      showSuccess('Updated', 'Contact updated successfully')
      router.back()
    } catch (e: any) {
      logger.error('Error updating contact', e)
      showError('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to update contact')
    } finally {
      setSaving(false)
    }
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
    section: { marginBottom: MS(24) },
    sectionTitle: { fontSize: MS(16), fontWeight: '600', color: colors.text, marginBottom: MS(12) },
    inputGroup: { marginBottom: MS(16) },
    avatarSection: { alignItems: 'center', marginBottom: MS(24) },
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
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
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
    avatarRemoveBtn: { marginTop: MS(8), paddingVertical: MS(6), paddingHorizontal: MS(12) },
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
    profileImageModalActions: { flexDirection: 'row', gap: MS(12), marginTop: MS(8) },
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontFamily: fonts.medium, color: colors.text }]}>Edit Contact</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: fonts.medium, color: colors.text }]}>Edit Contact</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Profile photo */}
          <View style={[styles.avatarSection, { backgroundColor: colors.card, padding: MS(20), borderRadius: MS(14), borderWidth: 1, borderColor: colors.borderLight }]}>
            <TouchableOpacity
              style={[styles.avatarOuter, { borderColor: colors.border }]}
              onPress={openProfileImagePicker}
              activeOpacity={0.7}
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
            <TouchableOpacity style={[styles.avatarAddBtn, { borderColor: colors.border }]} onPress={openProfileImagePicker} disabled={uploadingImage}>
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
              <FloatingOutlinedInput label="First Name" value={formData.firstName} onChangeText={(v) => handleInputChange('firstName', v)} containerStyle={{ marginBottom: MS(12) }} />
            </View>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput label="Last Name" value={formData.lastName} onChangeText={(v) => handleInputChange('lastName', v)} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Contact Information</Text>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput label="Phone" value={formData.phone} onChangeText={(v) => handleInputChange('phone', v)} keyboardType="phone-pad" restrictInput="numeric" containerStyle={{ marginBottom: MS(12) }} />
            </View>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput label="Email" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} keyboardType="email-address" autoCapitalize="none" restrictInput="email" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Professional Information</Text>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput label="Company" value={formData.company} onChangeText={(v) => handleInputChange('company', v)} containerStyle={{ marginBottom: MS(12) }} />
            </View>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput label="Job Title" value={formData.jobTitle} onChangeText={(v) => handleInputChange('jobTitle', v)} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Location</Text>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput label="City (optional)" value={formData.city} onChangeText={(v) => handleInputChange('city', v)} containerStyle={{ marginBottom: MS(12) }} />
            </View>
            <View style={styles.inputGroup}>
              <FloatingOutlinedInput label="Country (optional)" value={formData.country} onChangeText={(v) => handleInputChange('country', v)} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, color: colors.text }]}>Notes</Text>
            <FloatingOutlinedInput label="Add notes about this contact" value={formData.note} onChangeText={(v) => handleInputChange('note', v)} multiline numberOfLines={4} inputStyle={{ minHeight: VS(100), textAlignVertical: 'top' }} />
          </View>

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }, saving && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.buttonPrimaryText} /> : <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={profileImageModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { fontFamily: fonts.bold, color: colors.text }]}>Change profile photo</Text>
              <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>Choose how to add a photo</Text>
              <View style={styles.profileImageModalActions}>
                <TouchableOpacity style={[styles.profileImageModalBtn, { borderColor: colors.border }]} onPress={pickProfileFromCamera}>
                  <MaterialCommunityIcons name="camera" size={MS(22)} color={colors.primary} />
                  <Text style={{ fontSize: MS(14), color: colors.text, fontFamily: fonts.medium }}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.profileImageModalBtn, { borderColor: colors.border }]} onPress={pickProfileFromGallery}>
                  <MaterialCommunityIcons name="image" size={MS(22)} color={colors.primary} />
                  <Text style={{ fontSize: MS(14), color: colors.text, fontFamily: fonts.medium }}>Gallery</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={{ padding: MS(10), marginTop: MS(12), alignItems: 'center' }} onPress={() => setProfileImageModalVisible(false)}>
                <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  )
}
