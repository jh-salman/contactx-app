import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Text, Image, Modal, Pressable, Dimensions } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { showSuccess, showError, showWarning } from '@/lib/toast'
import { StatusBar } from 'expo-status-bar'
import * as ImagePicker from 'expo-image-picker'
import { convertImageToBase64 } from '@/utils/imageUtils'
import { uploadImageToCloudinary } from '@/services/imageUploadService'
import { SalonXLogo } from '@/components/SalonXLogo'
import { UploadLoadingOverlay } from '@/components/UploadLoadingOverlay'
import { moderateScale, verticalScale } from 'react-native-size-matters'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen'

const MS = moderateScale
const VS = verticalScale
const ICON_HEADER = MS(24)
const ICON_SM = MS(20)
const ICON_MD = MS(48)

const CreateCard = () => {
  const router = useRouter()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const modalPadding = { top: Math.max(insets.top, 44), bottom: Math.max(insets.bottom, 20), left: Math.max(insets.left, 0), right: Math.max(insets.right, 0) }
  const [loading, setLoading] = useState(false)
  type ImageLayoutId = 'layout1' | 'layout2' | 'layout3' | 'layout4' | 'layout5' | 'layout6' | 'layout7'
  type ImageFieldType = 'profile' | 'logo' | 'cover'
  const [formData, setFormData] = useState({
    cardTitle: 'ContactX',
    firstName: '',
    lastName: '',
    jobTitle: '',
    phoneNumber: '',
    email: '',
    cardColor: '#000000',
    logo: '',
    profile: '',
    cover: '',
    imageLayout: null as ImageLayoutId | null,
    socialLinks: [] as Array<{ type: string; url: string }>,
  })
  const [lastUploadedField, setLastUploadedField] = useState<ImageFieldType | null>(null)

  const LAYOUT_OPTIONS: { id: ImageLayoutId; label: string }[] = [
    { id: 'layout1', label: 'Layout 1 — Profile only (cover size)' },
    { id: 'layout2', label: 'Layout 2 — Logo only (cover size)' },
    { id: 'layout3', label: 'Layout 3 — Cover only (cover size)' },
    { id: 'layout4', label: 'Layout 4 — Profile cover size, logo circle bottom-left' },
    { id: 'layout5', label: 'Layout 5 — Cover + profile' },
    { id: 'layout6', label: 'Layout 6 — Cover + logo rect bottom-right' },
    { id: 'layout7', label: 'Layout 7 — Cover + profile circle bottom-right, logo rect bottom-right' },
  ]
  const LAYOUT_REQUIREMENTS: Record<ImageLayoutId, ImageFieldType[]> = {
    layout1: ['profile'],
    layout2: ['logo'],
    layout3: ['cover'],
    layout4: ['profile', 'logo'],
    layout5: ['cover', 'profile'],
    layout6: ['cover', 'logo'],
    layout7: ['cover', 'profile', 'logo'],
  }
  const [layoutModalVisible, setLayoutModalVisible] = useState(false)
  const [intendedLayout, setIntendedLayout] = useState<ImageLayoutId | null>(null)
  const [pendingUploadQueue, setPendingUploadQueue] = useState<ImageFieldType[]>([])

  const openImageModal = (field: ImageFieldType) => {
    try {
      setImageModalType(field)
    } catch (e: any) {
      showError('Error', e?.message ?? 'Could not open.')
    }
  }
  const closeImageModal = (canceledByUser?: boolean) => {
    try {
      setImageModalType(null)
      if (canceledByUser) {
        setIntendedLayout(null)
        setPendingUploadQueue([])
        return
      }
      if (intendedLayout && pendingUploadQueue.length > 0) {
        const nextQueue = pendingUploadQueue.slice(1)
        setPendingUploadQueue(nextQueue)
        if (nextQueue.length > 0) {
          setTimeout(() => setImageModalType(nextQueue[0]), 100)
        } else {
          handleInputChange('imageLayout', intendedLayout)
          setIntendedLayout(null)
        }
      }
    } catch (e: any) {
      showError('Error', e?.message ?? 'Could not close.')
      setImageModalType(null)
      setIntendedLayout(null)
      setPendingUploadQueue([])
    }
  }

  const autoSelectLayoutFromImages = (data: { profile: string; logo: string; cover: string }) => {
    const p = !!data.profile?.trim(), l = !!data.logo?.trim(), c = !!data.cover?.trim()
    let layout: ImageLayoutId | null = null
    if (p && l && c) layout = 'layout7'
    else if (c && l) layout = 'layout6'
    else if (c && p) layout = 'layout5'
    else if (p && l) layout = 'layout4'
    else if (p) layout = 'layout1'
    else if (l) layout = 'layout2'
    else if (c) layout = 'layout3'
    if (layout) handleInputChange('imageLayout', layout)
    else setFormData(prev => ({ ...prev, imageLayout: null }))
  }
  
  const [currentSocialLink, setCurrentSocialLink] = useState({
    type: 'linkedin',
    url: '',
  })
  const [imageModalType, setImageModalType] = useState<ImageFieldType | null>(null)

  const handleInputChange = (field: string, value: string) => {
    try {
      setFormData(prev => ({ ...prev, [field]: value ?? '' }))
    } catch (e: any) {
      showError('Error', e?.message ?? 'Could not update.')
    }
  }

  const validateForm = () => {
    try {
      if (!formData.firstName?.trim()) {
        showError('Validation', 'First name is required.')
      return false
    }
      if (!formData.lastName?.trim()) {
        showError('Validation', 'Last name is required.')
      return false
    }
      if (!formData.jobTitle?.trim()) {
        showError('Validation', 'Job title is required.')
      return false
    }
      if (!formData.phoneNumber?.trim()) {
        showError('Validation', 'Phone number is required.')
      return false
    }
      if (!formData.email?.trim()) {
        showError('Validation', 'Email is required.')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
        showError('Validation', 'Please enter a valid email address.')
      return false
    }
    return true
    } catch (e: any) {
      showError('Validation', e?.message ?? 'Invalid form.')
      return false
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      
      // Images are already Cloudinary URLs (uploaded immediately when picked)
      // No need to convert - just send the URLs directly
      const cardData = {
        cardTitle: formData.cardTitle.trim() || 'ContactX',
        cardColor: formData.cardColor,
        logo: formData.logo.trim() || undefined,
        profile: formData.profile.trim() || undefined,
        cover: formData.cover.trim() || undefined,
        imagesAndLayouts: null,
        isFavorite: false,
        personalInfo: {
          firstName: formData.firstName.trim() || undefined,
          lastName: formData.lastName.trim() || undefined,
          jobTitle: formData.jobTitle.trim() || undefined,
          phoneNumber: formData.phoneNumber.trim(), // Required
          email: formData.email.trim() || undefined,
        },
        socialLinks: formData.socialLinks.length > 0 
          ? { links: formData.socialLinks }
          : undefined,
        qrCode: undefined,
        qrImage: undefined,
      }

      await apiService.createCard(cardData)
      showSuccess('Card saved', 'Card created successfully.')
            router.push({
              pathname: '/(tabs)/cards',
              params: { refresh: 'true' }
            })
    } catch (error: any) {
      const message = error?.response?.data?.message ?? error?.message ?? 'Failed to create card'
      showError('Error', message)
    } finally {
      setLoading(false)
    }
  }

  const addSocialLink = () => {
    if (currentSocialLink.url.trim()) {
      setFormData(prev => ({
        ...prev,
        socialLinks: [...prev.socialLinks, { ...currentSocialLink }]
      }))
      setCurrentSocialLink({ type: 'linkedin', url: '' })
    }
  }

  const removeSocialLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }))
  }

  const uploadAssetAndSet = async (field: 'profile' | 'logo' | 'cover', asset: { uri?: string; base64?: string | null }) => {
    if (!asset?.uri && !asset?.base64) {
      showError('Invalid image', 'No image data.')
      return false
    }
    setLoading(true)
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
      const cloudinaryUrl = await uploadImageToCloudinary(base64Image, field)
      if (cloudinaryUrl) {
        handleInputChange(field, cloudinaryUrl)
        return cloudinaryUrl
      }
      return null
    } catch (uploadError: any) {
      const msg = uploadError?.message ?? 'Failed to upload image.'
      showError('Upload failed', msg)
      return false
    } finally {
      setLoading(false)
    }
  }

  const pickFromGallery = async (field: 'profile' | 'logo' | 'cover') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        showWarning('Permission required', 'Please grant access to your photos.')
        return
      }
      const aspect = field === 'cover' ? [16, 9] as [number, number] : [1, 1] as [number, number]
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect,
        quality: 0.8,
        base64: true,
      })
      if (!result.canceled && result.assets?.[0]) {
        const url = await uploadAssetAndSet(field, result.assets[0])
        if (url) {
          setLastUploadedField(field)
          if (!intendedLayout) autoSelectLayoutFromImages({ ...formData, [field]: url })
          closeImageModal()
        } else {
          showError('Upload failed', 'Please try again.')
        }
      }
    } catch (error: any) {
      setLoading(false)
      showError('Error', error?.message ?? 'Failed to pick image.')
    }
  }

  const pickFromCamera = async (field: 'profile' | 'logo' | 'cover') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        showWarning('Permission required', 'Please grant camera access.')
        return
      }
      const aspect = field === 'cover' ? [16, 9] as [number, number] : [1, 1] as [number, number]
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect,
        quality: 0.8,
        base64: true,
      })
      if (!result.canceled && result.assets?.[0]) {
        const url = await uploadAssetAndSet(field, result.assets[0])
        if (url) {
          setLastUploadedField(field)
          if (!intendedLayout) autoSelectLayoutFromImages({ ...formData, [field]: url })
          closeImageModal()
        } else {
          showError('Upload failed', 'Please try again.')
        }
      }
    } catch (error: any) {
      setLoading(false)
      showError('Error', error?.message ?? 'Failed to take photo.')
    }
  }

  const pickAndUploadImage = async (field: 'profile' | 'logo' | 'cover') => {
    await pickFromGallery(field)
  }

  const cardColors = [
    { name: 'Green', value: '#08CB00' },
    { name: 'Black', value: '#000000' },
    { name: 'Cyan', value: '#00F7FF' },
    { name: 'Pink', value: '#FF7DB0' },
    { name: 'Orange', value: '#FFA239' },
    { name: 'Mint', value: '#4DFFBE' },
    { name: 'Lime', value: '#B6F500' },
    { name: 'Red', value: '#FF0B55' },
  ]

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: MS(8),
      paddingHorizontal: MS(16),
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: MS(18),
      fontWeight: '600',
      color: colors.text,
    },
    headerTitleInput: {
      flex: 1,
      fontSize: MS(18),
      fontWeight: '600',
      color: colors.text,
      paddingVertical: 0,
      paddingHorizontal: MS(8),
      marginHorizontal: MS(8),
      textAlign: 'center',
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: MS(2),
      width: wp('100%'),
    },
    section: {
      width: wp('100%'),
      alignSelf: 'center',
      backgroundColor: colors.card,
      borderRadius: MS(12),
      paddingHorizontal: MS(12),
      paddingVertical: MS(2),
      marginBottom: MS(4),
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sectionTitle: {
      fontSize: MS(18),
      fontWeight: '600',
      color: colors.text,
      marginBottom: MS(12),
    },
    inputGroup: {
      marginBottom: MS(16),
    },
    label: {
      fontSize: MS(14),
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: MS(8),
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: MS(8),
      padding: MS(12),
      fontSize: MS(16),
      minHeight: MS(48),
      color: colors.inputText,
      backgroundColor: colors.inputBackground,
    },
    colorOptions: {
      flexDirection: 'row',
      gap: MS(12),
      flexWrap: 'wrap',
    },
    colorOption: {
      width: MS(50),
      height: MS(50),
      borderRadius: MS(25),
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorOptionSelected: {
      borderColor: colors.primary,
      borderWidth: 3,
    },
    colorPaletteContainer: {
      marginBottom: MS(4),
    },
    colorPaletteTitle: {
      fontSize: MS(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: MS(10),
    },
    colorPaletteScrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: MS(12),
      paddingVertical: MS(1),
    },
    colorPaletteCircle: {
      width: MS(36),
      height: MS(36),
      borderRadius: MS(18),
      borderWidth: 2,
      borderColor: colors.border,
    },
    colorPaletteCircleSelected: {
      borderColor: colors.primary,
      borderWidth: 3,
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: MS(16),
      paddingHorizontal: MS(20),
      borderRadius: MS(12),
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: MS(52),
      marginTop: MS(8),
      marginBottom: MS(20),
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: colors.buttonPrimaryText,
      fontSize: MS(16),
      fontWeight: '600',
    },
    socialLinkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: MS(12),
      backgroundColor: colors.backgroundSecondary,
      borderRadius: MS(8),
      marginBottom: MS(8),
    },
    socialLinkInfo: {
      flex: 1,
      marginRight: MS(12),
    },
    socialLinkType: {
      fontSize: MS(14),
      fontWeight: '600',
      color: colors.text,
      textTransform: 'capitalize',
    },
    socialLinkUrl: {
      fontSize: MS(12),
      color: colors.textSecondary,
      marginTop: MS(4),
    },
    removeButton: {
      padding: MS(4),
    },
    addSocialLinkContainer: {
      marginTop: MS(12),
    },
    socialLinkInputs: {
      marginBottom: MS(12),
    },
    socialLinkTypeSelect: {
      marginBottom: MS(12),
    },
    socialLinkTypeButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: MS(8),
      marginTop: MS(8),
    },
    socialLinkTypeButton: {
      paddingHorizontal: MS(12),
      paddingVertical: MS(6),
      borderRadius: MS(6),
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    socialLinkTypeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    socialLinkTypeButtonText: {
      fontSize: MS(12),
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    socialLinkTypeButtonTextActive: {
      color: colors.buttonPrimaryText,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: MS(12),
      backgroundColor: colors.backgroundSecondary,
      borderRadius: MS(8),
      gap: MS(8),
    },
    addButtonText: {
      color: colors.primary,
      fontSize: MS(14),
      fontWeight: '600',
    },
    imagePreviewContainer: {
      position: 'relative',
      width: '100%',
      minHeight: VS(200),
      borderRadius: MS(12),
      overflow: 'hidden',
      marginBottom: MS(12),
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.backgroundSecondary,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    removeImageButton: {
      position: 'absolute',
      top: MS(8),
      right: MS(8),
      width: MS(32),
      height: MS(32),
      borderRadius: MS(16),
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: MS(12),
      borderRadius: MS(8),
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.background,
      gap: MS(8),
      // marginTop: MS(20),
    },
    uploadButtonText: {
      fontSize: MS(14),
      fontWeight: '600',
    },
    cardPreviewBox: {
      width: '100%',
      height: VS(135),
      borderRadius: MS(12),
      overflow: 'visible',
      marginBottom: MS(12),
      borderWidth: 1,
      borderColor: colors.borderLight,
      position: 'relative',
    },
    cardPreviewCoverArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '100%',
      borderRadius: MS(12),
      overflow: 'hidden',
    },
    cardPreviewBoxPlaceholderFullBleed: {
      width: Dimensions.get('window').width + 4,
      marginLeft: -(MS(16) + MS(2) + 2),
      marginRight: -(MS(16) + MS(2) + 2),
      borderRadius: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
    },
    cardPreviewCover: {
      ...StyleSheet.absoluteFillObject,
    },
    coverPlaceholder: {
      width: Dimensions.get('window').width + 4,
      marginLeft: -(MS(16) + MS(2) + 2),
      marginRight: -(MS(16) + MS(2) + 2),
      flex: 1,
      borderRadius: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardPreviewProfileWrap: {
      position: 'absolute',
      left: MS(12),
      bottom: MS(12),
      width: MS(64),
      height: MS(64),
      borderRadius: MS(32),
      borderWidth: 2,
      borderColor: colors.card,
      overflow: 'hidden',
    },
    cardPreviewLogoWrap: {
      position: 'absolute',
      right: MS(12),
      bottom: MS(12),
      width: MS(56),
      height: MS(40),
      borderRadius: MS(8),
      borderWidth: 2,
      borderColor: colors.card,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    cardPreviewEditBtn: {
      position: 'absolute',
      width: MS(28),
      height: MS(28),
      borderRadius: MS(14),
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      // borderWidth: 1,
      // borderColor: colors.border,
    },
    imageButtonsRow: {
      flexDirection: 'row',
      gap: MS(8),
      marginBottom: MS(8),
    },
    imageAddButton: {
      width: MS(140),
      height: MS(32),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: MS(4),
      paddingHorizontal: MS(8),
      borderRadius: MS(12),
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.background,
      gap: MS(4),
    },
    changeLayoutButton: {
      paddingVertical: MS(12),
      borderRadius: MS(8),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      marginTop: MS(14),
      marginBottom: MS(6),
    },
    layoutOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: MS(14),
      paddingHorizontal: MS(16),
      borderRadius: MS(12),
      borderWidth: 1,
      marginBottom: MS(10),
      gap: MS(12),
    },
    layoutOptionLabel: {
      flex: 1,
      fontSize: MS(15),
    },
    layoutSkeletonScroll: {
      paddingHorizontal: MS(16),
      paddingVertical: MS(16),
      paddingBottom: MS(24),
      gap: MS(12),
      flexGrow: 1,
      justifyContent: 'center',
    },
    layoutSkeletonCard: {
      width: MS(256),
      borderRadius: MS(12),
      borderWidth: 1,
      overflow: 'hidden',
      padding: MS(6),
    },
    layoutSkeletonPreview: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: MS(8),
      overflow: 'hidden',
      position: 'relative',
    },
    layoutSkeletonCover: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.placeholder + '40',
      borderRadius: MS(6),
    },
    layoutSkeletonProfileCircle: {
      position: 'absolute',
      width: MS(28),
      height: MS(28),
      borderRadius: MS(14),
      backgroundColor: colors.textSecondary + '80',
      borderWidth: 1,
      borderColor: colors.card,
    },
    layoutSkeletonLogoRect: {
      position: 'absolute',
      width: MS(32),
      height: MS(22),
      borderRadius: MS(4),
      backgroundColor: colors.textSecondary + '80',
      borderWidth: 1,
      borderColor: colors.card,
    },
    layoutSkeletonLogoCircle: {
      position: 'absolute',
      width: MS(24),
      height: MS(24),
      borderRadius: MS(12),
      backgroundColor: colors.textSecondary + '80',
      borderWidth: 1,
      borderColor: colors.card,
    },
    layoutSkeletonLabel: {
      fontSize: MS(10),
      marginTop: MS(6),
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: MS(16),
      paddingVertical: MS(12),
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: MS(18),
    },
    modalPreviewWrap: {
      flex: 1,
      padding: MS(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalPreviewImageWrap: {
      position: 'relative',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalPreviewLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: MS(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalPreviewLoadingText: {
      fontSize: MS(14),
      marginTop: MS(8),
    },
    modalPreviewSquare: {
      width: wp(80),
      maxWidth: 280,
      aspectRatio: 1,
      borderRadius: MS(12),
    },
    modalPreviewCover: {
      width: wp(90),
      maxWidth: 340,
      height: VS(200),
      borderRadius: MS(12),
    },
    modalPreviewPlaceholder: {
      width: wp(80),
      maxWidth: 280,
      aspectRatio: 1,
      borderRadius: MS(12),
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalPreviewPlaceholderText: {
      fontSize: MS(14),
      marginTop: MS(8),
    },
    modalBottomActions: {
      padding: MS(16),
      paddingBottom: MS(24),
      gap: MS(12),
    },
    modalActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: MS(14),
      paddingHorizontal: MS(16),
      borderRadius: MS(12),
      borderWidth: 1,
      gap: MS(8),
    },
    modalActionText: {
      fontSize: MS(16),
    },
  })

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={ICON_HEADER} color={colors.text} />
          </TouchableOpacity>
          <TextInput
            style={[styles.headerTitleInput, { fontFamily: fonts.medium }]}
            value={formData.cardTitle}
            onChangeText={(value) => handleInputChange('cardTitle', value)}
            placeholder="Title"
            placeholderTextColor={colors.placeholder}
            editable
            multiline={false}
            underlineColorAndroid="transparent"
          />
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: MS(18), color: colors.text }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.colorPaletteContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorPaletteScrollContent}
            >
              {cardColors.map((color) => (
                <TouchableOpacity
                  key={color.value}
                  style={[
                    styles.colorPaletteCircle,
                    formData.cardColor === color.value && styles.colorPaletteCircleSelected,
                    { backgroundColor: color.value },
                  ]}
                  onPress={() => {
                    try {
                      if (color?.value) handleInputChange('cardColor', color.value)
                    } catch (e: any) {
                      showError('Error', e?.message ?? 'Could not change color.')
                    }
                  }}
                  activeOpacity={0.8}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: MS(18), color: colors.text }]}>Images & layout</Text>

            {/* Card preview: no layout = latest uploaded in cover; else render by layout1–5 */}
            {(() => {
              const layout = formData.imageLayout
              const hasAnyImage = !!(formData.cover || formData.profile || formData.logo)
              const isTallLayout = ['layout1', 'layout2', 'layout3', 'layout4'].includes(layout || '')
              const height = hasAnyImage ? (isTallLayout ? VS(169) : VS(135)) : VS(60)
              const isPlaceholderOnly = !formData.cover && !formData.profile && !formData.logo
              const profileCircleSize = MS(96)
              const profileCircleRadius = MS(48)
              const logoRectW = MS(112)
              const logoRectH = MS(80)

              const renderMainPlaceholder = () => (
                <View style={[styles.coverPlaceholder, { backgroundColor: formData.cardColor }]}>
                  <SalonXLogo width={MS(72)} height={MS(72)} />
                </View>
              )
              const renderPencil = (field: ImageFieldType, position: object) => (
                <TouchableOpacity style={[styles.cardPreviewEditBtn, position]} onPress={() => openImageModal(field)} disabled={loading}>
                  <MaterialCommunityIcons name="pencil" size={ICON_SM} color={colors.primary} />
                </TouchableOpacity>
              )

              const hasOverflowLayout = layout === 'layout5' || layout === 'layout6' || layout === 'layout7'
              const overflowPadding = hasOverflowLayout ? MS(32) : 0
              const isShowingPlaceholder =
                (layout === null && (!lastUploadedField || !formData[lastUploadedField])) ||
                (layout === 'layout1' && !formData.profile) ||
                (layout === 'layout2' && !formData.logo) ||
                (layout === 'layout3' && !formData.cover) ||
                (layout === 'layout4' && !formData.profile) ||
                (layout === 'layout5' && !formData.cover) ||
                (layout === 'layout6' && !formData.cover) ||
                (layout === 'layout7' && !formData.cover)
              return (
                <View style={{ paddingBottom: overflowPadding }}>
                  <View
                    style={[
                      styles.cardPreviewBox,
                      { backgroundColor: isShowingPlaceholder ? formData.cardColor : 'transparent', height },
                    ]}
                  >
                  {/* No layout selected: show latest uploaded image in cover preview */}
                  {layout === null && (
                    <>
                      {lastUploadedField && formData[lastUploadedField] ? (
                        <View style={styles.cardPreviewCoverArea}>
                          <Image
                            source={{ uri: formData[lastUploadedField] }}
                            style={styles.cardPreviewCover}
                            resizeMode={lastUploadedField === 'logo' ? 'contain' : 'cover'}
                            onError={() => showError('Image failed to load', 'Try again or choose another image.')}
                          />
                          {renderPencil(lastUploadedField, { top: MS(8), right: MS(8) })}
                        </View>
                      ) : (
                        renderMainPlaceholder()
                      )}
                    </>
                  )}

                  {/* Layout 1: profile only, cover size */}
                  {layout === 'layout1' && (
                    <>
                      {formData.profile ? (
                        <View style={styles.cardPreviewCoverArea}>
                          <Image source={{ uri: formData.profile }} style={styles.cardPreviewCover} resizeMode="cover" onError={() => showError('Image failed to load', 'Try again or choose another image.')} />
                          {renderPencil('profile', { top: MS(8), right: MS(8) })}
                        </View>
                      ) : (
                        renderMainPlaceholder()
                      )}
                    </>
                  )}

                  {/* Layout 2: logo only, full preview area (cover so it fills the box) */}
                  {layout === 'layout2' && (
                    <>
                      {formData.logo ? (
                        <View style={styles.cardPreviewCoverArea}>
                          <Image source={{ uri: formData.logo }} style={styles.cardPreviewCover} resizeMode="cover" onError={() => showError('Image failed to load', 'Try again or choose another image.')} />
                          {renderPencil('logo', { top: MS(8), right: MS(8) })}
                        </View>
                      ) : (
                        renderMainPlaceholder()
                      )}
                    </>
                  )}

                  {/* Layout 3: cover only, cover size */}
                  {layout === 'layout3' && (
                    <>
                      {formData.cover ? (
                        <View style={styles.cardPreviewCoverArea}>
                          <Image source={{ uri: formData.cover }} style={styles.cardPreviewCover} resizeMode="cover" onError={() => showError('Image failed to load', 'Try again or choose another image.')} />
                          {renderPencil('cover', { top: MS(8), right: MS(8) })}
                        </View>
                      ) : (
                        renderMainPlaceholder()
                      )}
                    </>
                  )}

                  {/* Layout 4: profile cover size, logo circle bottom-left */}
                  {layout === 'layout4' && (
                    <>
                      {formData.profile ? (
                        <View style={styles.cardPreviewCoverArea}>
                          <Image source={{ uri: formData.profile }} style={styles.cardPreviewCover} resizeMode="cover" onError={() => showError('Image failed to load', 'Try again or choose another image.')} />
                          {renderPencil('profile', { top: MS(8), right: MS(8) })}
                        </View>
                      ) : (
                        renderMainPlaceholder()
                      )}
                      {formData.logo && (
                        <>
                          <View
                            style={[
                              styles.cardPreviewProfileWrap,
                              { left: MS(12), bottom: MS(12), right: undefined, width: profileCircleSize, height: profileCircleSize, borderRadius: profileCircleRadius },
                            ]}
                          >
                            <Image source={{ uri: formData.logo }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                          </View>
                          {renderPencil('logo', { left: MS(12) + profileCircleSize - MS(28), bottom: MS(12) })}
                        </>
                      )}
                    </>
                  )}

                  {/* Layout 5: cover + profile */}
                  {layout === 'layout5' && (
                    <>
                      {formData.cover ? (
                        <View style={styles.cardPreviewCoverArea}>
                          <Image source={{ uri: formData.cover }} style={styles.cardPreviewCover} resizeMode="cover" onError={() => showError('Image failed to load', 'Try again or choose another image.')} />
                          {renderPencil('cover', { top: MS(8), right: MS(8) })}
                        </View>
                      ) : (
                        renderMainPlaceholder()
                      )}
                      {formData.profile && (
                        <>
                          <View
                            style={[
                              styles.cardPreviewProfileWrap,
                              { left: MS(12), bottom: MS(-profileCircleSize / 2), right: undefined, width: profileCircleSize, height: profileCircleSize, borderRadius: profileCircleRadius },
                            ]}
                          >
                            <Image source={{ uri: formData.profile }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          </View>
                          {renderPencil('profile', { left: MS(12) + profileCircleSize - MS(28), bottom: -profileCircleSize / 2 })}
                        </>
                      )}
                    </>
                  )}

                  {/* Layout 6: cover + logo rect 2x bottom-right */}
                  {layout === 'layout6' && (
                    <>
                      {formData.cover ? (
                        <View style={styles.cardPreviewCoverArea}>
                          <Image source={{ uri: formData.cover }} style={styles.cardPreviewCover} resizeMode="cover" onError={() => showError('Image failed to load', 'Try again or choose another image.')} />
                          {renderPencil('cover', { top: MS(8), right: MS(8) })}
                        </View>
                      ) : (
                        renderMainPlaceholder()
                      )}
                      {formData.logo && (
                        <>
                          <View style={[styles.cardPreviewLogoWrap, { right: MS(12), bottom: -logoRectH / 2, width: logoRectW, height: logoRectH }]}>
                            <Image source={{ uri: formData.logo }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                          </View>
                          {renderPencil('logo', { right: MS(12), bottom: -logoRectH / 2 })}
                        </>
                      )}
                    </>
                  )}

                  {/* Layout 7: cover + profile circle 1.5x left bottom, logo 2x right bottom */}
                  {layout === 'layout7' && (
                    <>
                      {formData.cover ? (
                        <View style={styles.cardPreviewCoverArea}>
                          <Image source={{ uri: formData.cover }} style={styles.cardPreviewCover} resizeMode="cover" onError={() => showError('Image failed to load', 'Try again or choose another image.')} />
                          {renderPencil('cover', { top: MS(8), right: MS(8) })}
                        </View>
                      ) : (
                        renderMainPlaceholder()
                      )}
                      {formData.profile && (
                        <>
                          <View
                            style={[
                              styles.cardPreviewProfileWrap,
                              { left: MS(12), bottom: -profileCircleSize / 2, right: undefined, width: profileCircleSize, height: profileCircleSize, borderRadius: profileCircleRadius },
                            ]}
                          >
                            <Image source={{ uri: formData.profile }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          </View>
                          {renderPencil('profile', { left: MS(12) + profileCircleSize - MS(28), bottom: -profileCircleSize / 2 })}
                        </>
                      )}
                      {formData.logo && (
                        <>
                          <View style={[styles.cardPreviewLogoWrap, { right: MS(12), bottom: -logoRectH / 2, width: logoRectW, height: logoRectH }]}>
                            <Image source={{ uri: formData.logo }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                          </View>
                          {renderPencil('logo', { right: MS(12), bottom: -logoRectH / 2 })}
                        </>
                      )}
                    </>
                  )}
                </View>
                </View>
              )
            })()}

            {/* Row: only show upload button when that image is not uploaded */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.imageButtonsRow,
                formData.imageLayout === 'layout5' && (!formData.profile || !formData.logo || !formData.cover) && { marginTop: MS(16) },
              ]}
            >
              {!formData.profile && (
                <TouchableOpacity
                  style={styles.imageAddButton}
                  onPress={() => setImageModalType('profile')}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="plus" size={ICON_SM} color={colors.brand} />
                  <Text style={[styles.uploadButtonText, { fontFamily: fonts.medium, fontSize: MS(10), color: colors.primary }]} numberOfLines={1}>Profile</Text>
                </TouchableOpacity>
              )}
              {!formData.logo && (
                <TouchableOpacity
                  style={styles.imageAddButton}
                  onPress={() => setImageModalType('logo')}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="plus" size={ICON_SM} color={colors.brand} />
                  <Text style={[styles.uploadButtonText, { fontFamily: fonts.medium, fontSize: MS(10), color: colors.primary }]} numberOfLines={1}>Logo</Text>
                </TouchableOpacity>
              )}
              {!formData.cover && (
                <TouchableOpacity
                  style={styles.imageAddButton}
                  onPress={() => setImageModalType('cover')}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="plus" size={ICON_SM} color={colors.brand} />
                  <Text style={[styles.uploadButtonText, { fontFamily: fonts.medium, fontSize: MS(10), color: colors.primary }]} numberOfLines={1}>Cover</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Full-screen modal: preview + From camera / From gallery at bottom; Replace & Remove when has image. Always closable. */}
            <Modal
              visible={imageModalType !== null}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => closeImageModal(true)}
              statusBarTranslucent={false}
            >
              <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: modalPadding.top, paddingBottom: modalPadding.bottom, paddingLeft: modalPadding.left, paddingRight: modalPadding.right }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { fontFamily: fonts.medium, color: colors.text }]}>
                    {imageModalType === 'profile' ? 'Profile picture' : imageModalType === 'logo' ? 'Company logo' : 'Cover'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => closeImageModal(true)}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    style={{ padding: MS(8), margin: -MS(8) }}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="close" size={ICON_HEADER} color={loading ? colors.placeholder : colors.text} />
                  </TouchableOpacity>
                </View>
                {imageModalType !== null && (
                  <>
                    {/* Full-modal loading overlay — SalonX logo animation when uploading */}
                    <UploadLoadingOverlay visible={!!(loading && imageModalType)} />
                    {/* Preview — image or placeholder */}
                    <View style={styles.modalPreviewWrap}>
                      {formData[imageModalType] ? (
                        <View
                          style={[
                            styles.modalPreviewImageWrap,
                            imageModalType === 'cover' ? styles.modalPreviewCover : styles.modalPreviewSquare,
                            { overflow: 'hidden' },
                          ]}
                        >
                          <Image
                            source={{ uri: formData[imageModalType] }}
                            style={StyleSheet.absoluteFillObject}
                            resizeMode={imageModalType === 'cover' ? 'cover' : 'contain'}
                          />
                        </View>
                      ) : (
                        <View style={[styles.modalPreviewPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          <MaterialCommunityIcons name="image-plus" size={ICON_MD} color={colors.placeholder} />
                          <Text style={[styles.modalPreviewPlaceholderText, { fontFamily: fonts.medium, color: colors.placeholder }]}>No image</Text>
                        </View>
                      )}
                    </View>

                    {/* Buttons — no brand color; modern neutral look */}
                    <View style={styles.modalBottomActions}>
                      <TouchableOpacity
                        style={[styles.modalActionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                        onPress={() => pickFromCamera(imageModalType)}
                        disabled={loading}
                      >
                        <MaterialCommunityIcons name="camera-outline" size={ICON_SM} color={colors.text} />
                        <Text style={[styles.modalActionText, { fontFamily: fonts.medium, color: colors.text }]}>From camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalActionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                        onPress={() => pickFromGallery(imageModalType)}
                        disabled={loading}
                      >
                        <MaterialCommunityIcons name="image-multiple-outline" size={ICON_SM} color={colors.text} />
                        <Text style={[styles.modalActionText, { fontFamily: fonts.medium, color: colors.text }]}>From gallery</Text>
                      </TouchableOpacity>
                      {formData[imageModalType] ? (
                        <>
                          <TouchableOpacity
                            style={[styles.modalActionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                            onPress={async () => {
                              await pickFromGallery(imageModalType)
                            }}
                            disabled={loading}
                          >
                            <MaterialCommunityIcons name="pencil-outline" size={ICON_SM} color={colors.text} />
                            <Text style={[styles.modalActionText, { fontFamily: fonts.medium, color: colors.text }]}>Replace</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.modalActionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                            onPress={() => {
                              setFormData(prev => {
                                const next = { ...prev, [imageModalType]: '' }
                                const afterProfile = !!next.profile?.trim()
                                const afterLogo = !!next.logo?.trim()
                                const afterCover = !!next.cover?.trim()
                                let imageLayout: typeof prev.imageLayout = prev.imageLayout
                                if (afterProfile && afterLogo && afterCover) {
                                  imageLayout = 'layout7'
                                } else if (afterCover && afterLogo) {
                                  imageLayout = 'layout6'
                                } else if (afterCover && afterProfile) {
                                  imageLayout = 'layout5'
                                } else if (afterProfile && afterLogo) {
                                  imageLayout = 'layout4'
                                } else if (afterProfile) {
                                  imageLayout = 'layout1'
                                } else if (afterLogo) {
                                  imageLayout = 'layout2'
                                } else if (afterCover) {
                                  imageLayout = 'layout3'
                                } else {
                                  imageLayout = null
                                }
                                return { ...next, imageLayout }
                              })
                              closeImageModal()
                            }}
                          >
                            <MaterialCommunityIcons name="delete-outline" size={ICON_SM} color={colors.textSecondary} />
                            <Text style={[styles.modalActionText, { fontFamily: fonts.medium, color: colors.textSecondary }]}>Remove</Text>
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  </>
                )}
              </View>
            </Modal>

            <TouchableOpacity
              style={styles.changeLayoutButton}
              onPress={() => {
                try {
                  setLayoutModalVisible(true)
                } catch (e: any) {
                  showError('Error', e?.message ?? 'Could not open layout options.')
                }
              }}
            >
              <Text style={[styles.uploadButtonText, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>Change image layout</Text>
            </TouchableOpacity>

            {/* Layout selection modal — 5 options */}
            <Modal
              visible={layoutModalVisible}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setLayoutModalVisible(false)}
              statusBarTranslucent={false}
            >
              <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: modalPadding.top, paddingBottom: modalPadding.bottom, paddingLeft: modalPadding.left, paddingRight: modalPadding.right }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { fontFamily: fonts.medium, color: colors.text }]}>Image layout</Text>
                  <TouchableOpacity
                    onPress={() => setLayoutModalVisible(false)}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    style={{ padding: MS(8), margin: -MS(8) }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="close" size={ICON_HEADER} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.layoutSkeletonScroll, { flexDirection: 'row', alignItems: 'center' }]}
                >
                  {LAYOUT_OPTIONS.map((opt) => {
                    const selected = formData.imageLayout === opt.id
                    const renderSkeleton = () => {
                      const cover = <View style={styles.layoutSkeletonCover} />
                      const profileCircle = <View style={[styles.layoutSkeletonProfileCircle, { left: MS(4), bottom: MS(4) }]} />
                      const logoCircle = <View style={[styles.layoutSkeletonLogoCircle, { left: MS(4), bottom: MS(4) }]} />
                      const logoRectBottom = <View style={[styles.layoutSkeletonLogoRect, { right: MS(4), bottom: MS(2) }]} />
                      const profileBottom = <View style={[styles.layoutSkeletonProfileCircle, { left: MS(4), bottom: MS(2) }]} />
                      switch (opt.id) {
                        case 'layout1':
                          return (
                            <View style={[styles.layoutSkeletonPreview, { backgroundColor: colors.placeholder + '30', justifyContent: 'center', alignItems: 'center' }]}>
                              <View style={[styles.layoutSkeletonProfileCircle, { position: 'relative', left: undefined, bottom: undefined }]} />
                            </View>
                          )
                        case 'layout2':
                          return (
                            <View style={[styles.layoutSkeletonPreview, { backgroundColor: colors.placeholder + '30', justifyContent: 'center', alignItems: 'center' }]}>
                              <View style={[styles.layoutSkeletonLogoRect, { position: 'relative', right: undefined, bottom: undefined, width: MS(36), height: MS(24) }]} />
                            </View>
                          )
                        case 'layout3':
                          return (
                            <View style={styles.layoutSkeletonPreview}>
                              {cover}
                            </View>
                          )
                        case 'layout4':
                          return (
                            <View style={[styles.layoutSkeletonPreview, { backgroundColor: colors.placeholder + '30' }]}>
                              {logoCircle}
                            </View>
                          )
                        case 'layout5':
                          return (
                            <View style={styles.layoutSkeletonPreview}>
                              {cover}
                              {profileCircle}
                            </View>
                          )
                        case 'layout6':
                          return (
                            <View style={styles.layoutSkeletonPreview}>
                              {cover}
                              {logoRectBottom}
                            </View>
                          )
                        case 'layout7':
                          return (
                            <View style={styles.layoutSkeletonPreview}>
                              {cover}
                              {profileBottom}
                              {logoRectBottom}
                            </View>
                          )
                        default:
                          return cover
                      }
                    }
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.layoutSkeletonCard,
                          { borderColor: colors.border, backgroundColor: colors.card },
                          selected && { borderColor: colors.brand, backgroundColor: colors.backgroundSecondary },
                        ]}
                        onPress={() => {
                          try {
                            const required = LAYOUT_REQUIREMENTS[opt.id]
                            if (!required?.length) {
                              handleInputChange('imageLayout', opt.id)
                              setLayoutModalVisible(false)
                              return
                            }
                            const missing = required.filter((f) => !formData[f]?.trim())
                            if (missing.length === 0) {
                              handleInputChange('imageLayout', opt.id)
                              setLayoutModalVisible(false)
                              return
                            }
                            setIntendedLayout(opt.id)
                            setPendingUploadQueue(missing)
                            setLayoutModalVisible(false)
                            setTimeout(() => setImageModalType(missing[0]), 100)
                          } catch (e: any) {
                            showError('Error', e?.message ?? 'Could not select layout.')
                            setLayoutModalVisible(false)
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {renderSkeleton()}
                        <Text style={[styles.layoutSkeletonLabel, { fontFamily: fonts.medium, color: colors.textSecondary }]} numberOfLines={2}>
                          Layout {opt.id.replace('layout', '')}
                        </Text>
                        {selected && (
                          <View style={{ position: 'absolute', top: MS(6), right: MS(6) }}>
                            <MaterialCommunityIcons name="check-circle" size={MS(18)} color={colors.brand} />
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            </Modal>

      
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: MS(18), color: colors.text }]}>Personal Information *</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                placeholderTextColor={colors.placeholder}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                placeholderTextColor={colors.placeholder}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>Job Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter job title"
                placeholderTextColor={colors.placeholder}
                value={formData.jobTitle}
                onChangeText={(value) => handleInputChange('jobTitle', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor={colors.placeholder}
                value={formData.phoneNumber}
                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor={colors.placeholder}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: MS(18), color: colors.text }]}>Social Links (Optional)</Text>
            
            {formData.socialLinks.map((link, index) => (
              <View key={index} style={styles.socialLinkRow}>
                <View style={styles.socialLinkInfo}>
                  <Text style={[styles.socialLinkType, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>{link.type}</Text>
                  <Text style={[styles.socialLinkUrl, { fontFamily: fonts.regular, fontSize: MS(12), color: colors.placeholder }]} numberOfLines={1}>{link.url}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeSocialLink(index)}
                  style={styles.removeButton}
                >
                  <MaterialCommunityIcons name="close" size={ICON_SM} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            
            <View style={styles.addSocialLinkContainer}>
              <View style={styles.socialLinkInputs}>
                <View style={styles.socialLinkTypeSelect}>
                  <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>Type</Text>
                  <View style={styles.socialLinkTypeButtons}>
                    {['linkedin', 'facebook', 'twitter', 'instagram', 'github', 'website'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.socialLinkTypeButton,
                          currentSocialLink.type === type && styles.socialLinkTypeButtonActive
                        ]}
                        onPress={() => setCurrentSocialLink(prev => ({ ...prev, type }))}
                      >
                        <Text style={[
                          styles.socialLinkTypeButtonText,
                          currentSocialLink.type === type && styles.socialLinkTypeButtonTextActive,
                          { fontFamily: fonts.regular, fontSize: MS(12), color: currentSocialLink.type === type ? colors.buttonPrimaryText : colors.placeholder }
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>URL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter social link URL"
                    placeholderTextColor={colors.placeholder}
                    value={currentSocialLink.url}
                    onChangeText={(value) => setCurrentSocialLink(prev => ({ ...prev, url: value }))}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.addButton}
                onPress={addSocialLink}
              >
                <MaterialCommunityIcons name="plus" size={ICON_SM} color={colors.primary} />
                <Text style={[styles.addButtonText, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.primary }]}>Add Link</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: MS(18), color: colors.text }]}>Card Color</Text>
            <View style={styles.colorOptions}>
              {cardColors.map((color) => {
                // Determine check icon color based on background brightness
                const getCheckIconColor = (bgColor: string) => {
                  // Convert hex to RGB
                  const hex = bgColor.replace('#', '')
                  const r = parseInt(hex.substr(0, 2), 16)
                  const g = parseInt(hex.substr(2, 2), 16)
                  const b = parseInt(hex.substr(4, 2), 16)
                  // Calculate brightness
                  const brightness = (r * 299 + g * 587 + b * 114) / 1000
                  // Use theme colors for better contrast
                  return brightness > 128 ? colors.text : colors.buttonPrimaryText
                }
                
                return (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorOption,
                      formData.cardColor === color.value && styles.colorOptionSelected,
                      { backgroundColor: color.value }
                    ]}
                    onPress={() => handleInputChange('cardColor', color.value)}
                  >
                    {formData.cardColor === color.value && (
                      <MaterialCommunityIcons name="check" size={ICON_SM} color={getCheckIconColor(color.value)} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonPrimaryText} />
            ) : (
              <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, fontSize: MS(16), color: colors.buttonPrimaryText }]}>Create Card</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

export default CreateCard

