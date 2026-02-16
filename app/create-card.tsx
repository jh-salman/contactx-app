import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Text, Image, Modal, Pressable, Dimensions, useWindowDimensions } from 'react-native'
import React, { useEffect, useState } from 'react'
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
import { CardImageLayout } from '@/components/card/CardImageLayout'
import { CardPreviewModal } from '@/components/CardPreviewModal'
import { SalonXLogo } from '@/components/SalonXLogo'
import { UploadLoadingOverlay } from '@/components/UploadLoadingOverlay'
import { FloatingOutlinedInput } from '@/components/FloatingOutlinedInput'
import { moderateScale, verticalScale } from 'react-native-size-matters'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen'

const MS = moderateScale
const VS = verticalScale
const ICON_HEADER = MS(24)
const ICON_SM = MS(20)
const ICON_MD = MS(48)

import type { InputRestrict } from '@/components/FloatingOutlinedInput'

type KeyboardType = 'url' | 'email-address' | 'phone-pad' | 'default'
const SOCIAL_MEDIA_OPTIONS: { type: string; label: string; icon: string; inputLabel: string; placeholder: string; keyboardType: KeyboardType; restrictInput: InputRestrict }[] = [
  { type: 'phone', label: 'Phone', icon: 'phone', inputLabel: 'Phone number', placeholder: 'Enter phone number', keyboardType: 'phone-pad', restrictInput: 'numeric' },
  { type: 'email', label: 'Email', icon: 'email', inputLabel: 'Email address', placeholder: 'Enter email address', keyboardType: 'email-address', restrictInput: 'email' },
  { type: 'link', label: 'Link', icon: 'link-variant', inputLabel: 'URL or link', placeholder: 'Enter URL', keyboardType: 'url', restrictInput: 'url' },
  { type: 'address', label: 'Address', icon: 'map-marker', inputLabel: 'Address', placeholder: 'Enter full address', keyboardType: 'default', restrictInput: 'none' },
  { type: 'website', label: 'Company Website', icon: 'web', inputLabel: 'Website URL', placeholder: 'https://example.com', keyboardType: 'url', restrictInput: 'url' },
  { type: 'linkedin', label: 'LinkedIn', icon: 'linkedin', inputLabel: 'LinkedIn profile URL', placeholder: 'linkedin.com/in/username', keyboardType: 'url', restrictInput: 'url' },
  { type: 'instagram', label: 'Instagram', icon: 'instagram', inputLabel: 'Instagram username', placeholder: '@username', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'calendly', label: 'Calendly', icon: 'calendar-month', inputLabel: 'Calendly link', placeholder: 'calendly.com/your-link', keyboardType: 'url', restrictInput: 'url' },
  { type: 'x', label: 'X', icon: 'twitter', inputLabel: 'X profile URL', placeholder: 'x.com/username', keyboardType: 'url', restrictInput: 'url' },
  { type: 'facebook', label: 'Facebook', icon: 'facebook', inputLabel: 'Facebook profile URL', placeholder: 'facebook.com/username', keyboardType: 'url', restrictInput: 'url' },
  { type: 'threads', label: 'Threads', icon: 'at', inputLabel: 'Threads username', placeholder: '@username', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'snapchat', label: 'Snapchat', icon: 'ghost', inputLabel: 'Snapchat username', placeholder: 'username', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'tiktok', label: 'Tiktok', icon: 'music', inputLabel: 'TikTok username', placeholder: '@username', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'youtube', label: 'YouTube', icon: 'youtube', inputLabel: 'YouTube channel URL', placeholder: 'youtube.com/@channel', keyboardType: 'url', restrictInput: 'url' },
  { type: 'github', label: 'Github', icon: 'github', inputLabel: 'GitHub profile URL', placeholder: 'github.com/username', keyboardType: 'url', restrictInput: 'url' },
  { type: 'yelp', label: 'Yelp', icon: 'store', inputLabel: 'Yelp business URL', placeholder: 'yelp.com/biz/...', keyboardType: 'url', restrictInput: 'url' },
  { type: 'venmo', label: 'Venmo', icon: 'cash', inputLabel: 'Venmo username', placeholder: '@username', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'paypal', label: 'Paypal', icon: 'credit-card-outline', inputLabel: 'PayPal email or link', placeholder: 'Enter PayPal info', keyboardType: 'email-address', restrictInput: 'email' },
  { type: 'cashapp', label: 'CashApp', icon: 'currency-usd', inputLabel: 'Cash App $Cashtag', placeholder: '$username', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'discord', label: 'Discord', icon: 'controller-classic', inputLabel: 'Discord username', placeholder: 'username#1234', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'signal', label: 'Signal', icon: 'message-text', inputLabel: 'Signal phone number', placeholder: 'Enter phone number', keyboardType: 'phone-pad', restrictInput: 'numeric' },
  { type: 'skype', label: 'Skype', icon: 'phone-outline', inputLabel: 'Skype username', placeholder: 'live:username', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'telegram', label: 'Telegram', icon: 'send', inputLabel: 'Telegram username', placeholder: '@username', keyboardType: 'default', restrictInput: 'alphanumeric' },
  { type: 'twitch', label: 'Twitch', icon: 'video', inputLabel: 'Twitch channel URL', placeholder: 'twitch.tv/username', keyboardType: 'url', restrictInput: 'url' },
  { type: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', inputLabel: 'WhatsApp number', placeholder: '+1234567890', keyboardType: 'phone-pad', restrictInput: 'numeric' },
]

type CreateCardProps = { cardId?: string }

const CreateCard = ({ cardId }: CreateCardProps) => {
  const router = useRouter()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const isEditMode = !!cardId
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const socialGridGap = MS(12)
  const socialGridPadding = MS(16)
  const socialMediaItemWidth = Math.floor((windowWidth - 2 * MS(12) - 2 * socialGridPadding - 2 * socialGridGap) / 3)
  const modalPadding = { top: Math.max(insets.top, 44), bottom: Math.max(insets.bottom, 20), left: Math.max(insets.left, 0), right: Math.max(insets.right, 0) }
  const [loading, setLoading] = useState(false)
  const [fetchingCard, setFetchingCard] = useState(isEditMode)
  type ImageLayoutId = 'layout1' | 'layout2' | 'layout3' | 'layout4' | 'layout5' | 'layout6' | 'layout7'
  type ImageFieldType = 'profile' | 'logo' | 'cover'
  const defaultCardColor = isDark ? '#FFFFFF' : '#000000'
  const [formData, setFormData] = useState({
    cardTitle: 'ContactX',
    firstName: '',
    lastName: '',
    jobTitle: '',
    company: '',
    phoneNumber: '',
    email: '',
    cardColor: defaultCardColor,
    logo: '',
    profile: '',
    cover: '',
    imageLayout: null as ImageLayoutId | null,
    socialLinks: [] as Array<{ type: string; url: string; label?: string }>,
    middleName: '',
    prefix: '',
    suffix: '',
    pronoun: '',
    preferred: '',
    maidenName: '',
  })
  const [personalDetailExpanded, setPersonalDetailExpanded] = useState<Record<string, boolean>>({})
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
  const [cardPreviewVisible, setCardPreviewVisible] = useState(false)
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
  
  const [imageModalType, setImageModalType] = useState<ImageFieldType | null>(null)
  const [socialLinkModalVisible, setSocialLinkModalVisible] = useState(false)
  const [socialLinkModalType, setSocialLinkModalType] = useState('linkedin')
  const [socialLinkModalUrl, setSocialLinkModalUrl] = useState('')
  const [socialLinkModalLabel, setSocialLinkModalLabel] = useState('')

  useEffect(() => {
    const newDefault = isDark ? '#FFFFFF' : '#000000'
    setFormData(prev => {
      const oldDefault = !isDark ? '#FFFFFF' : '#000000'
      if (prev.cardColor === oldDefault) return { ...prev, cardColor: newDefault }
      return prev
    })
  }, [isDark])

  useEffect(() => {
    if (!cardId) return
    const fetchCard = async () => {
      try {
        setFetchingCard(true)
        const response = await apiService.getAllCards()
        const cardsData = response.data || response.cards || response || []
        const foundCard = Array.isArray(cardsData)
          ? cardsData.find((c: any) => (c.id === cardId || c._id === cardId))
          : null
        if (foundCard) {
          const pi = foundCard.personalInfo || foundCard.personal_info || {}
          const linksRaw = Array.isArray(foundCard.socialLinks?.links)
            ? foundCard.socialLinks.links
            : Array.isArray(foundCard.socialLinks)
              ? foundCard.socialLinks
              : []
          const links = linksRaw.map((l: any) => ({
            type: l.type || l.platform || 'link',
            url: l.url || '',
            label: l.label || l.name,
          }))
          const layoutVal = foundCard.imageLayout
            || foundCard.imagesAndLayouts?.layout
            || (typeof foundCard.imagesAndLayouts === 'string' ? foundCard.imagesAndLayouts : null)
          setFormData({
            cardTitle: foundCard.cardTitle || 'ContactX',
            firstName: pi.firstName ?? pi.first_name ?? '',
            lastName: pi.lastName ?? pi.last_name ?? '',
            jobTitle: pi.jobTitle ?? pi.job_title ?? '',
            company: pi.company ?? '',
            phoneNumber: pi.phoneNumber ?? pi.phone_number ?? '',
            email: pi.email ?? '',
            cardColor: foundCard.cardColor || defaultCardColor,
            logo: foundCard.logo || '',
            profile: foundCard.profile || '',
            cover: foundCard.cover || '',
            imageLayout: (layoutVal || null) as ImageLayoutId | null,
            socialLinks: links,
            middleName: pi.middleName ?? pi.middle_name ?? '',
            prefix: pi.prefix ?? '',
            suffix: pi.suffix ?? '',
            pronoun: pi.pronoun ?? '',
            preferred: pi.preferred ?? '',
            maidenName: pi.maidenName ?? pi.maiden_name ?? '',
          })
        } else {
          showError('Error', 'Card not found')
          router.back()
        }
      } catch (e: any) {
        showError('Error', e?.message ?? 'Failed to load card')
        router.back()
      } finally {
        setFetchingCard(false)
      }
    }
    fetchCard()
  }, [cardId])

  const handleInputChange = (field: string, value: string) => {
    try {
      setFormData(prev => ({ ...prev, [field]: value ?? '' }))
    } catch (e: any) {
      showError('Error', e?.message ?? 'Could not update.')
    }
  }

  /** Validation for CREATE only. Schema: PersonalInfo.phoneNumber required. */
  const validateFormForCreate = () => {
    try {
      if (!formData.phoneNumber?.trim()) {
        showError('Validation', 'Phone number is required.')
        return false
      }
      if (formData.email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email.trim())) {
          showError('Validation', 'Please enter a valid email address.')
          return false
        }
      }
      return true
    } catch (e: any) {
      showError('Validation', e?.message ?? 'Invalid form.')
      return false
    }
  }

  const handleSubmit = async () => {
    // UPDATE: no validation. CREATE: validate per DB schema (phoneNumber required)
    if (!isEditMode && !validateFormForCreate()) return

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
        imagesAndLayouts: formData.imageLayout ? { layout: formData.imageLayout } : null,
        isFavorite: false,
        personalInfo: {
          firstName: formData.firstName.trim() || undefined,
          lastName: formData.lastName.trim() || undefined,
          jobTitle: formData.jobTitle.trim() || undefined,
          company: formData.company?.trim() || undefined,
          phoneNumber: formData.phoneNumber.trim(), // Required
          email: formData.email.trim() || undefined,
          middleName: formData.middleName?.trim() || undefined,
          prefix: formData.prefix?.trim() || undefined,
          suffix: formData.suffix?.trim() || undefined,
          pronoun: formData.pronoun?.trim() || undefined,
          preferred: formData.preferred?.trim() || undefined,
          maidenName: formData.maidenName?.trim() || undefined,
        },
        socialLinks: formData.socialLinks.length > 0 
          ? { links: formData.socialLinks }
          : undefined,
        qrCode: undefined,
        qrImage: undefined,
      }

      if (isEditMode && cardId) {
        await apiService.updateCard(cardId, {
          cardTitle: cardData.cardTitle,
          cardColor: cardData.cardColor,
          logo: cardData.logo || null,
          profile: cardData.profile || null,
          cover: cardData.cover || null,
          imagesAndLayouts: cardData.imagesAndLayouts,
          personalInfo: cardData.personalInfo,
          socialLinks: cardData.socialLinks,
        })
        showSuccess('Card updated', 'Card updated successfully.')
      } else {
        await apiService.createCard(cardData)
        showSuccess('Card saved', 'Card created successfully.')
      }
      router.push({
        pathname: '/(tabs)/cards',
        params: { refresh: 'true' }
      })
    } catch (error: any) {
      const message = error?.response?.data?.message ?? error?.message ?? (isEditMode ? 'Failed to update card' : 'Failed to create card')
      showError('Error', message)
    } finally {
      setLoading(false)
    }
  }

  const openSocialLinkModal = (type: string) => {
    setSocialLinkModalType(type)
    setSocialLinkModalUrl('')
    setSocialLinkModalLabel('')
    setSocialLinkModalVisible(true)
  }

  const closeSocialLinkModal = () => {
    setSocialLinkModalVisible(false)
    setSocialLinkModalUrl('')
    setSocialLinkModalLabel('')
  }

  const saveSocialLink = () => {
    if (!socialLinkModalUrl.trim()) {
      showError('Validation', 'Please enter a URL or link.')
      return
    }
    setFormData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, {
        type: socialLinkModalType,
        url: socialLinkModalUrl.trim(),
        label: socialLinkModalLabel.trim() || undefined,
      }]
    }))
    closeSocialLinkModal()
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

  const getSocialIconColor = (bgColor: string) => {
    if (bgColor === '#FFFFFF') return '#000000'
    if (bgColor === '#000000') return '#FFFFFF'
    return colors.primary
  }

  const cardColors = [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Black', value: '#000000' },
    { name: 'Green', value: '#08CB00' },
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
      backgroundColor: colors.background,
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
      backgroundColor: colors.background,
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
      backgroundColor: colors.background,
    },
    personalDetailInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: MS(10),
      paddingVertical: MS(14),
      paddingHorizontal: MS(16),
      fontSize: MS(16),
      minHeight: MS(52),
      color: colors.inputText,
      backgroundColor: colors.background,
    },
    personalDetailChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: MS(6),
      marginBottom: MS(6),
    },
    personalDetailChip: {
      
      // alignItems: 'center',
      // justifyContent: 'center',
      paddingVertical: MS(7),
      paddingHorizontal: MS(16),
      borderRadius: MS(25),
      borderWidth: 0.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      
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
      backgroundColor: colors.background,
      borderRadius: MS(8),
      marginBottom: MS(8),
    },
    socialLinkRowWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: MS(12),
      paddingHorizontal: MS(4),
      marginBottom: MS(8),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    socialLinkIconCircle: {
      width: MS(40),
      height: MS(40),
      borderRadius: MS(20),
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: MS(12),
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
      backgroundColor: colors.background,
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
      backgroundColor: colors.background,
      borderRadius: MS(8),
      gap: MS(8),
    },
    addButtonText: {
      color: colors.primary,
      fontSize: MS(14),
      fontWeight: '600',
    },
    tapToAddPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: MS(12),
      marginBottom: MS(8),
    },
    tapToAddText: {
    },
    tapToAddPlusCircle: {
      width: MS(28),
      height: MS(28),
      borderRadius: MS(14),
      justifyContent: 'center',
      alignItems: 'center',
    },
    socialMediaSection: {
      borderWidth: 0,
      borderRadius: MS(12),
      padding: MS(16),
      marginTop: MS(4),
    },
    socialMediaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: MS(12),
      marginTop: MS(8),
    },
    socialMediaIconItem: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: MS(8),
    },
    socialMediaIconCircle: {
      width: MS(48),
      height: MS(48),
      borderRadius: MS(24),
      justifyContent: 'center',
      alignItems: 'center',
    },
    socialMediaIconLabel: {
      marginTop: MS(6),
      textAlign: 'center',
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
      backgroundColor: colors.background,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
      overflow: 'hidden',
      backgroundColor: colors.background,
    },
    cardPreviewEditBtn: {
      position: 'absolute',
      width: MS(28),
      height: MS(28),
      borderRadius: MS(14),
      backgroundColor: colors.background,
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
      backgroundColor: colors.background,
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
      backgroundColor: colors.background,
      borderRadius: MS(6),
    },
    layoutSkeletonProfileCircle: {
      position: 'absolute',
      width: MS(28),
      height: MS(28),
      borderRadius: MS(14),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    layoutSkeletonLogoRect: {
      position: 'absolute',
      width: MS(32),
      height: MS(22),
      borderRadius: MS(4),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    layoutSkeletonLogoCircle: {
      position: 'absolute',
      width: MS(24),
      height: MS(24),
      borderRadius: MS(12),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    layoutSkeletonLabel: {
      fontSize: MS(10),
      // marginTop: MS(6),
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
    socialLinkModalHeader: {
      paddingHorizontal: MS(16),
    },
    modalSaveButton: {
    },
    labelSuggestions: {
      marginTop: MS(8),
      marginBottom: MS(8),
    },
    labelSuggestionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: MS(12),
    },
    labelSuggestionChip: {
      paddingVertical: MS(10),
      paddingHorizontal: MS(20),
      borderRadius: MS(25),
      borderWidth: 1,
    },
    labelSuggestionText: {
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

  if (fetchingCard) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

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

            {/* Card preview: same CardImageLayout as CardItem - identical display */}
            <CardImageLayout
              layout={formData.imageLayout}
              profile={formData.profile?.trim() || null}
              logo={formData.logo?.trim() || null}
              cover={formData.cover?.trim() || null}
              cardColor={formData.cardColor}
              height={VS(150)}
              onImageError={() => showError('Image failed to load', 'Try again or choose another image.')}
              renderEditButton={(field) => (
                <TouchableOpacity
                  style={[styles.cardPreviewEditBtn, { top: MS(8), right: MS(8) }]}
                  onPress={() => openImageModal(field)}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="pencil" size={ICON_SM} color={colors.primary} />
                </TouchableOpacity>
              )}
            />

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
                        <View style={[styles.modalPreviewPlaceholder, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <MaterialCommunityIcons name="image-plus" size={ICON_MD} color={colors.placeholder} />
                          <Text style={[styles.modalPreviewPlaceholderText, { fontFamily: fonts.medium, color: colors.placeholder }]}>No image</Text>
                        </View>
                      )}
                    </View>

                    {/* Buttons — no brand color; modern neutral look */}
                    <View style={styles.modalBottomActions}>
                      <TouchableOpacity
                        style={[styles.modalActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={() => pickFromCamera(imageModalType)}
                        disabled={loading}
                      >
                        <MaterialCommunityIcons name="camera-outline" size={ICON_SM} color={colors.text} />
                        <Text style={[styles.modalActionText, { fontFamily: fonts.medium, color: colors.text }]}>From camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={() => pickFromGallery(imageModalType)}
                        disabled={loading}
                      >
                        <MaterialCommunityIcons name="image-multiple-outline" size={ICON_SM} color={colors.text} />
                        <Text style={[styles.modalActionText, { fontFamily: fonts.medium, color: colors.text }]}>From gallery</Text>
                      </TouchableOpacity>
                      {formData[imageModalType] ? (
                        <>
                          <TouchableOpacity
                            style={[styles.modalActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                            onPress={async () => {
                              await pickFromGallery(imageModalType)
                            }}
                            disabled={loading}
                          >
                            <MaterialCommunityIcons name="pencil-outline" size={ICON_SM} color={colors.text} />
                            <Text style={[styles.modalActionText, { fontFamily: fonts.medium, color: colors.text }]}>Replace</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.modalActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
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
                            <View style={[styles.layoutSkeletonPreview, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                              <View style={[styles.layoutSkeletonProfileCircle, { position: 'relative', left: undefined, bottom: undefined }]} />
                            </View>
                          )
                        case 'layout2':
                          return (
                            <View style={[styles.layoutSkeletonPreview, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
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
                            <View style={[styles.layoutSkeletonPreview, { backgroundColor: colors.background }]}>
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
                          { borderColor: colors.border, backgroundColor: colors.background },
                          selected && { borderColor: colors.brand, backgroundColor: colors.background },
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
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: MS(18), color: colors.text }]}>Personal details</Text>

            <View style={[styles.inputGroup, { marginBottom: MS(14) }]}>
              <FloatingOutlinedInput
                label="First name"
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                labelBgColor={colors.card}
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.inputGroup, { marginBottom: MS(18) }]}>
              <FloatingOutlinedInput
                label="Last name"
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                labelBgColor={colors.card}
                autoCapitalize="words"
              />
            </View>

            {/* Optional fields: show input after Last name when chip clicked; chip hides. Input shows delete on focus; delete hides input and shows chip again. */}
            {personalDetailExpanded.middleName && (
              <View style={styles.inputGroup}>
                <FloatingOutlinedInput
                  label="Middle name"
                  value={formData.middleName}
                  onChangeText={(v) => handleInputChange('middleName', v)}
                  labelBgColor={colors.card}
                  autoCapitalize="words"
                  rightIcon={<MaterialCommunityIcons name="delete-outline" size={MS(20)} color={colors.placeholder} />}
                  onPressRightIcon={() => { handleInputChange('middleName', ''); setPersonalDetailExpanded((p) => ({ ...p, middleName: false })) }}
                />
              </View>
            )}
            {personalDetailExpanded.prefix && (
              <View style={styles.inputGroup}>
                <FloatingOutlinedInput
                  label="Prefix"
                  value={formData.prefix}
                  onChangeText={(v) => handleInputChange('prefix', v)}
                  labelBgColor={colors.card}
                  rightIcon={<MaterialCommunityIcons name="delete-outline" size={MS(20)} color={colors.placeholder} />}
                  onPressRightIcon={() => { handleInputChange('prefix', ''); setPersonalDetailExpanded((p) => ({ ...p, prefix: false })) }}
                />
              </View>
            )}
            {personalDetailExpanded.suffix && (
              <View style={styles.inputGroup}>
                <FloatingOutlinedInput
                  label="Suffix"
                  value={formData.suffix}
                  onChangeText={(v) => handleInputChange('suffix', v)}
                  labelBgColor={colors.card}
                  rightIcon={<MaterialCommunityIcons name="delete-outline" size={MS(20)} color={colors.placeholder} />}
                  onPressRightIcon={() => { handleInputChange('suffix', ''); setPersonalDetailExpanded((p) => ({ ...p, suffix: false })) }}
                />
              </View>
            )}
            {personalDetailExpanded.pronoun && (
              <View style={styles.inputGroup}>
                <FloatingOutlinedInput
                  label="Pronoun"
                  value={formData.pronoun}
                  onChangeText={(v) => handleInputChange('pronoun', v)}
                  labelBgColor={colors.card}
                  rightIcon={<MaterialCommunityIcons name="delete-outline" size={MS(20)} color={colors.placeholder} />}
                  onPressRightIcon={() => { handleInputChange('pronoun', ''); setPersonalDetailExpanded((p) => ({ ...p, pronoun: false })) }}
                />
              </View>
            )}
            {personalDetailExpanded.preferred && (
              <View style={styles.inputGroup}>
                <FloatingOutlinedInput
                  label="Preferred name"
                  value={formData.preferred}
                  onChangeText={(v) => handleInputChange('preferred', v)}
                  labelBgColor={colors.card}
                  autoCapitalize="words"
                  rightIcon={<MaterialCommunityIcons name="delete-outline" size={MS(20)} color={colors.placeholder} />}
                  onPressRightIcon={() => { handleInputChange('preferred', ''); setPersonalDetailExpanded((p) => ({ ...p, preferred: false })) }}
                />
              </View>
            )}
            {personalDetailExpanded.maidenName && (
              <View style={styles.inputGroup}>
                <FloatingOutlinedInput
                  label="Maiden name"
                  value={formData.maidenName}
                  onChangeText={(v) => handleInputChange('maidenName', v)}
                  labelBgColor={colors.card}
                  autoCapitalize="words"
                  rightIcon={<MaterialCommunityIcons name="delete-outline" size={MS(20)} color={colors.placeholder} />}
                  onPressRightIcon={() => { handleInputChange('maidenName', ''); setPersonalDetailExpanded((p) => ({ ...p, maidenName: false })) }}
                />
              </View>
            )}

            <View style={{ marginBottom: MS(14) }}>
              <View style={styles.personalDetailChipsRow}>
                {!personalDetailExpanded.middleName && (
                  <TouchableOpacity
                    style={[styles.personalDetailChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setPersonalDetailExpanded((p) => ({ ...p, middleName: true }))}
                    activeOpacity={0.7}
                  >
<Text style={[styles.layoutSkeletonLabel, { fontFamily: fonts.bold, fontSize: MS(13), fontWeight: '500', color: colors.primary }]}>+ Middle name</Text>
                  </TouchableOpacity>
                )}
                {!personalDetailExpanded.prefix && (
                  <TouchableOpacity
                    style={[styles.personalDetailChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setPersonalDetailExpanded((p) => ({ ...p, prefix: true }))}
                    activeOpacity={0.7}
                  >
<Text style={[styles.layoutSkeletonLabel, { fontFamily: fonts.bold, fontSize: MS(13), fontWeight: '500', color: colors.primary }]}>+ Prefix</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.personalDetailChipsRow}>
                {!personalDetailExpanded.suffix && (
                  <TouchableOpacity
                    style={[styles.personalDetailChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setPersonalDetailExpanded((p) => ({ ...p, suffix: true }))}
                    activeOpacity={0.7}
                  >
<Text style={[styles.layoutSkeletonLabel, { fontFamily: fonts.bold, fontSize: MS(13), fontWeight: '500', color: colors.primary }]}>+ Suffix</Text>
                  </TouchableOpacity>
                )}
                {!personalDetailExpanded.pronoun && (
                  <TouchableOpacity
                    style={[styles.personalDetailChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setPersonalDetailExpanded((p) => ({ ...p, pronoun: true }))}
                    activeOpacity={0.7}
                  >
<Text style={[styles.layoutSkeletonLabel, { fontFamily: fonts.bold, fontSize: MS(13), fontWeight: '500', color: colors.primary }]}>+ Pronoun</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.personalDetailChipsRow}>
                {!personalDetailExpanded.preferred && (
                  <TouchableOpacity
                    style={[styles.personalDetailChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setPersonalDetailExpanded((p) => ({ ...p, preferred: true }))}
                    activeOpacity={0.7}
                  >
<Text style={[styles.layoutSkeletonLabel, { fontFamily: fonts.bold, fontSize: MS(13), fontWeight: '500', color: colors.primary, alignSelf: 'center' }]}>+ Preferred</Text>
                  </TouchableOpacity>
                )}
                {!personalDetailExpanded.maidenName && (
                  <TouchableOpacity
                    style={[styles.personalDetailChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setPersonalDetailExpanded((p) => ({ ...p, maidenName: true }))}
                    activeOpacity={0.7}
                  >
<Text style={[styles.layoutSkeletonLabel, { fontFamily: fonts.bold, fontSize: MS(13), fontWeight: '500', color: colors.primary }]}>+ Maiden name</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.inputGroup, { marginTop: personalDetailExpanded.middleName || personalDetailExpanded.prefix || personalDetailExpanded.suffix || personalDetailExpanded.pronoun || personalDetailExpanded.preferred || personalDetailExpanded.maidenName ? MS(8) : 0 }]}>
              <FloatingOutlinedInput
                label="Job title"
                value={formData.jobTitle}
                onChangeText={(value) => handleInputChange('jobTitle', value)}
                labelBgColor={colors.card}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Company"
                value={formData.company}
                onChangeText={(value) => handleInputChange('company', value)}
                labelBgColor={colors.card}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Phone number"
                value={formData.phoneNumber}
                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                labelBgColor={colors.card}
                keyboardType="phone-pad"
                restrictInput="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <FloatingOutlinedInput
                label="Email address"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                labelBgColor={colors.card}
                keyboardType="email-address"
                autoCapitalize="none"
                restrictInput="email"
              />
            </View>
          </View>

          {/* Social Media Section - reference image: added links above, tap to add, icon grid */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: MS(18), color: colors.text }]}>Social Links</Text>
            
            {/* Added links - above the grid, with remove X */}
            {formData.socialLinks.map((link, index) => {
              const linkOption = SOCIAL_MEDIA_OPTIONS.find(o => o.type === link.type)
              const linkLabel = linkOption?.label || link.type
              return (
                <View key={index} style={styles.socialLinkRowWithIcon}>
                  <View style={[styles.socialLinkIconCircle, { backgroundColor: formData.cardColor }]}>
                    <MaterialCommunityIcons name={(linkOption?.icon || 'link') as any} size={MS(20)} color={getSocialIconColor(formData.cardColor)} />
                  </View>
                  <View style={styles.socialLinkInfo}>
                    <Text style={[styles.socialLinkType, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]} numberOfLines={1}>{link.url}</Text>
                    <Text style={[styles.socialLinkUrl, { fontFamily: fonts.regular, fontSize: MS(12), color: colors.placeholder }]} numberOfLines={1}>
                      {link.label || linkLabel}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeSocialLink(index)}
                    style={styles.removeButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <MaterialCommunityIcons name="close" size={ICON_SM} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )
            })}
            
            {/* Tap to add prompt */}
            <View style={styles.tapToAddPrompt}>
              <Text style={[styles.tapToAddText, { fontFamily: fonts.regular, fontSize: MS(14), color: colors.textSecondary }]}>Tap a field below to add it</Text>
              <View style={[styles.tapToAddPlusCircle, { backgroundColor: formData.cardColor }]}>
                <MaterialCommunityIcons name="plus" size={MS(16)} color={getSocialIconColor(formData.cardColor)} />
              </View>
            </View>
            
            {/* Social Media Icon Grid - bg opacity 0.25 */}
            <View style={[styles.socialMediaSection, { backgroundColor: formData.cardColor + '30' }]}>
              <View style={styles.socialMediaGrid}>
                {SOCIAL_MEDIA_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[styles.socialMediaIconItem, { width: socialMediaItemWidth }]}
                    onPress={() => openSocialLinkModal(item.type)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.socialMediaIconCircle, { backgroundColor: formData.cardColor }]}>
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={MS(24)}
                        color={getSocialIconColor(formData.cardColor)}
                      />
                    </View>
                    <Text style={[styles.socialMediaIconLabel, { fontFamily: fonts.medium, fontSize: MS(10), color: colors.text }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Social Link Add Modal */}
          <Modal
            visible={socialLinkModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={closeSocialLinkModal}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: modalPadding.top, paddingBottom: modalPadding.bottom, paddingLeft: modalPadding.left, paddingRight: modalPadding.right }]}>
              <View style={[styles.modalHeader, styles.socialLinkModalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={closeSocialLinkModal} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ padding: MS(8), margin: -MS(8) }}>
                  <MaterialCommunityIcons name="arrow-left" size={ICON_HEADER} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { fontFamily: fonts.medium, color: colors.text, flex: 1, textAlign: 'center' }]}>
                  Add {SOCIAL_MEDIA_OPTIONS.find(o => o.type === socialLinkModalType)?.label || socialLinkModalType}
                </Text>
                <TouchableOpacity onPress={saveSocialLink} style={{ padding: MS(8), margin: -MS(8), minWidth: MS(50) }} disabled={!socialLinkModalUrl.trim()} activeOpacity={0.7}>
                  <Text style={[styles.modalSaveButton, { fontFamily: fonts.medium, fontSize: MS(16), color: socialLinkModalUrl.trim() ? formData.cardColor : colors.placeholder }]}>Save</Text>
                </TouchableOpacity>
              </View>
              
              {/* Live preview - updates on change, same style as card display */}
              <View style={[styles.socialLinkRowWithIcon, { paddingHorizontal: MS(16), borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.socialLinkIconCircle, { backgroundColor: formData.cardColor }]}>
                  <MaterialCommunityIcons
                    name={(SOCIAL_MEDIA_OPTIONS.find(o => o.type === socialLinkModalType)?.icon || 'link') as any}
                    size={MS(20)}
                    color={getSocialIconColor(formData.cardColor)}
                  />
                </View>
                <View style={styles.socialLinkInfo}>
                  <Text style={[styles.socialLinkType, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]} numberOfLines={1}>
                    {socialLinkModalUrl.trim() || 'Enter link above'}
                  </Text>
                  <Text style={[styles.socialLinkUrl, { fontFamily: fonts.regular, fontSize: MS(12), color: colors.placeholder }]} numberOfLines={1}>
                    {socialLinkModalLabel.trim() || SOCIAL_MEDIA_OPTIONS.find(o => o.type === socialLinkModalType)?.label || ''}
                  </Text>
                </View>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: MS(16) }} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <FloatingOutlinedInput
                    label={SOCIAL_MEDIA_OPTIONS.find(o => o.type === socialLinkModalType)?.inputLabel || 'URL or link'}
                    value={socialLinkModalUrl}
                    onChangeText={setSocialLinkModalUrl}
                    labelBgColor={colors.background}
                    autoCapitalize="none"
                    keyboardType={SOCIAL_MEDIA_OPTIONS.find(o => o.type === socialLinkModalType)?.keyboardType || 'url'}
                    restrictInput={SOCIAL_MEDIA_OPTIONS.find(o => o.type === socialLinkModalType)?.restrictInput || 'none'}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <FloatingOutlinedInput
                    label="Label (optional)"
                    value={socialLinkModalLabel}
                    onChangeText={setSocialLinkModalLabel}
                    labelBgColor={colors.background}
                  />
                </View>
                <Text style={[styles.labelSuggestions, { fontFamily: fonts.regular, fontSize: MS(12), color: colors.textSecondary }]}>Here are some suggestions for your label:</Text>
                <View style={styles.labelSuggestionsRow}>
                  <TouchableOpacity
                    style={[styles.labelSuggestionChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setSocialLinkModalLabel('Work')}
                  >
                    <Text style={[styles.labelSuggestionText, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>Work</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.labelSuggestionChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setSocialLinkModalLabel('Personal')}
                  >
                    <Text style={[styles.labelSuggestionText, { fontFamily: fonts.medium, fontSize: MS(14), color: colors.text }]}>Personal</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Modal>



          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={() => setCardPreviewVisible(true)}
            disabled={loading}
          >
            <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, fontSize: MS(16), color: colors.buttonPrimaryText }]}>Card Preview</Text>
          </TouchableOpacity>
        </ScrollView>

        <CardPreviewModal
          visible={cardPreviewVisible}
          onClose={() => setCardPreviewVisible(false)}
          formData={formData}
        />
      </SafeAreaView>
    </View>
  )
}

export default CreateCard

