import { SalonXLogo } from '@/components/SalonXLogo'
import { useAuth } from '@/context/AuthContext'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { useSaveContact } from '@/hooks/useSaveContact'
import { logger } from '@/lib/logger'
import { showSuccess, showError, showWarning } from '@/lib/toast'
import { apiService } from '@/services/apiService'
import { FontAwesome5 } from '@expo/vector-icons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import React, { useEffect } from 'react'
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

const { height } = Dimensions.get('window')

interface CardModalProps {
  visible: boolean
  cardId: string
  onClose: () => void
  locationData?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  } | null
  locationReady?: boolean // When false, auto-save waits for location; when true/undefined, proceeds
  autoSave?: boolean
}

const CardModal = ({ visible, cardId, onClose, locationData, locationReady = true, autoSave }: CardModalProps) => {
  const [card, setCard] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [sharePickerVisible, setSharePickerVisible] = React.useState(false)
  const [myCards, setMyCards] = React.useState<any[]>([])
  const [sharingCard, setSharingCard] = React.useState(false)
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const { isAuthenticated } = useAuth()

  // Save contact hook
  const { saveContact, saving, isSaved, setIsSaved, checkIfSaved } = useSaveContact({
    cardId,
    cardData: card,
    locationData,
    onSuccess: () => {
      // Optional: close modal or refresh
    },
  })

  const translateY = useSharedValue(height)

  useEffect(() => {
    if (visible && cardId) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 })
      fetchCard()
      setIsSaved(false) // Reset saved state when modal opens
    } else {
      translateY.value = withSpring(height, { damping: 20, stiffness: 90 })
    }
  }, [visible, cardId, locationData]) // Include locationData to re-fetch when it becomes available

  // Auto-save contact when card + location ready (e.g. from QR scan)
  useEffect(() => {
    if (!visible || !card || !isAuthenticated || !autoSave || isSaved || saving) return
    if (locationReady === false) return // Wait for location before auto-save
    saveContact({ silent: true })
  }, [visible, card, isAuthenticated, autoSave, isSaved, saving, locationReady])

  const fetchCard = async () => {
    if (!cardId) return

    setLoading(true)
    try {
      logger.debug('FETCHING CARD DATA', {
        cardId,
        source: 'QR Code',
        requestTime: new Date().toISOString(),
        locationData: locationData || 'IP-based detection'
      })

      // Pass location data to scanCard (or undefined if not available)
      const response = await apiService.scanCard(cardId, 'qr', locationData || undefined)
      // Extract the nested structure properly
      const responseData = response.data || response
      const cardData = responseData.card || responseData
      const cardScanData = responseData.cardScan || null

      // Log detailed scan information from API response
      logger.debug('CARD DATA RECEIVED', { response })

      // Log scan-specific information if available
      if (cardScanData) {
        logger.debug('SCAN LOCATION INFORMATION', {
          city: cardScanData.city || 'N/A',
          country: cardScanData.country || 'N/A',
          latitude: cardScanData.latitude || 'N/A',
          longitude: cardScanData.longitude || 'N/A',
          scanTimestamp: cardScanData.scannedAt || cardScanData.createdAt || 'N/A'
        })
      }
      

      // Log card information (support personalInfo + personal_info)
      const pi = cardData?.personalInfo || cardData?.personal_info || {}
      logger.debug('CARD INFORMATION', {
        cardTitle: cardData?.cardTitle || 'N/A',
        cardColor: cardData?.cardColor || 'N/A',
        owner: `${(pi?.firstName ?? pi?.first_name) || ''} ${(pi?.lastName ?? pi?.last_name) || ''}`.trim() || 'N/A',
        company: pi?.company || 'N/A',
        email: pi?.email || 'N/A',
        phone: (pi?.phoneNumber ?? pi?.phone_number ?? pi?.phone) || 'N/A'
      })

      setCard(cardData)
      
      // Check if contact is already saved after card is loaded
      if (isAuthenticated) {
        // Use setTimeout to ensure cardData is set before checking
        setTimeout(() => {
          checkIfSaved()
        }, 100)
      }
    } catch (error: any) {
      logger.error('ERROR FETCHING CARD', error, {
        cardId,
        response: error.response?.data || 'N/A'
      })

      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load card. Please try again.'
      )
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    }
  })

  // Get card background color
  const originalCardBgColor = card?.cardColor || colors.primary || '#FF6B9D'

  // Extract personalInfo (support personalInfo + personal_info, camelCase + snake_case)
  const pi = card?.personalInfo || card?.personal_info || {}
  const firstName = pi?.firstName ?? pi?.first_name ?? ''
  const lastName = pi?.lastName ?? pi?.last_name ?? ''
  const nameParts = [
    pi?.prefix,
    firstName,
    pi?.middleName ?? pi?.middle_name,
    lastName,
    pi?.suffix,
  ].filter(Boolean)
  const fullName = nameParts.join(' ').trim() || card?.cardTitle || 'No Name'
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'NA'

  // Check if card has logo or profile
  const hasLogo = !!card?.logo
  const hasProfile = !!card?.profile
  const hasNoImages = !hasLogo && !hasProfile

  // Text color based on theme
  const textColor = colors.text
  const textSecondaryColor = colors.textSecondary

  const handleContactAction = async (type: string, value: string) => {
    if (!value) return

    let url = ''
    switch (type) {
      case 'phone':
        url = `tel:${value}`
        break
      case 'email':
        url = `mailto:${value}`
        break
      case 'website':
        url = value.startsWith('http') ? value : `https://${value}`
        break
      default:
        return
    }

    try {
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        Alert.alert('Error', `Cannot open ${type}`)
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open ${type}`)
    }
  }

  const handleSocialLink = async (url: string) => {
    if (!url) return
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`
    try {
      const canOpen = await Linking.canOpenURL(formattedUrl)
      if (canOpen) {
        await Linking.openURL(formattedUrl)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link')
    }
  }

  const handleShareYourCard = async () => {
    try {
      const res = await apiService.getAllCards()
      const cards = res?.data || res?.cards || res || []
      const list = Array.isArray(cards) ? cards : []
      if (list.length === 0) {
        showWarning('No cards', 'Create a card first to share')
        return
      }
      if (list.length === 1) {
        await doShareCard(list[0])
        return
      }
      setMyCards(list)
      setSharePickerVisible(true)
    } catch (e: any) {
      showError('Error', e?.response?.data?.message || 'Failed to load your cards')
    }
  }

  const doShareCard = async (visitorCard: any) => {
    const visitorCardId = visitorCard.id || visitorCard._id
    if (!visitorCardId) return
    setSharingCard(true)
    try {
      // Use locationData (GPS) or card.scanLocation (IP-based from scan API) when location was denied
      const locationToSend = locationData || card?.scanLocation || undefined
      const result = await apiService.shareVisitorContact(
        cardId, // ownerCardId = scanned card
        visitorCardId,
        locationToSend
      )
      setSharePickerVisible(false)
      if (result?.alreadySaved) {
        showWarning('Already shared', 'Your card is already shared with this contact')
      } else {
        showSuccess('Shared', 'Your card has been shared successfully')
      }
    } catch (e: any) {
      showError('Error', e?.response?.data?.message || 'Failed to share your card')
    } finally {
      setSharingCard(false)
    }
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View style={[styles.modalContent, { backgroundColor: colors.background }, animatedStyle]}>
          <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.3)' }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={originalCardBgColor} />
                <Text style={[styles.loadingText, { color: textColor, fontFamily: fonts.regular }]}>
                  Loading card...
                </Text>
              </View>
            ) : card ? (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Header Section with Brand Color */}
                <View style={[styles.headerSection, { backgroundColor: originalCardBgColor }]}>
                  <View style={styles.headerContent}>
                    {/* Logo or Initials */}
                    {hasLogo ? (
                      <View style={styles.logoContainer}>
                        <Image
                          source={{ uri: card.logo }}
                          style={styles.logoImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : hasProfile ? (
                      <View style={[styles.avatarContainer, { 
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'
                      }]}>
                        <Image
                          source={{ uri: card.profile }}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      </View>
                    ) : hasNoImages ? (
                      <View style={[styles.avatarContainer, { 
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'
                      }]}>
                        <SalonXLogo width={60} height={60} />
                      </View>
                    ) : initials ? (
                      <View style={[styles.initialsContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' }]}>
                        <Text style={[styles.initialsText, { color: colors.buttonPrimaryText }]}>{initials}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Content Section */}
                <View style={[styles.contentSection, { backgroundColor: colors.background }]}>
                  {/* Name and Title */}
                  <View style={styles.nameSection}>
                    <Text style={[styles.cardName, { color: textColor, fontFamily: fonts.bold }]}>
                      {fullName}
                    </Text>
                    {(pi?.jobTitle ?? pi?.job_title) && (
                      <Text style={[styles.cardDesignation, { color: textSecondaryColor, fontFamily: fonts.regular }]}>
                        {pi.jobTitle ?? pi.job_title}
                      </Text>
                    )}
                    {pi?.company && (
                      <Text style={[styles.cardCompany, { color: textSecondaryColor, fontFamily: fonts.medium }]}>
                        {pi.company}
                      </Text>
                    )}
                  </View>

                  {/* Contact Actions */}
                  <View style={styles.contactActionsContainer}>
                    {/* Phone */}
                    {(pi?.phoneNumber ?? pi?.phone_number ?? pi?.phone) && (
                      <TouchableOpacity
                        style={[
                          styles.contactActionItem,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : colors.card || 'rgba(0, 0, 0, 0.05)',
                            borderColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : colors.borderLight || 'rgba(0, 0, 0, 0.1)',
                          }
                        ]}
                        onPress={() => handleContactAction('phone', pi.phoneNumber ?? pi.phone_number ?? pi.phone ?? '')}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.contactIconContainer, { backgroundColor: `${originalCardBgColor}20` }]}>
                          <MaterialCommunityIcons name="phone" size={20} color={originalCardBgColor} />
                        </View>
                        <View style={styles.contactActionContent}>
                          <Text style={[styles.contactActionLabel, { color: textSecondaryColor, fontFamily: fonts.regular }]}>
                            Phone
                          </Text>
                          <Text style={[styles.contactActionValue, { color: textColor, fontFamily: fonts.medium }]}>
                            {pi.phoneNumber ?? pi.phone_number ?? pi.phone}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Email */}
                    {pi?.email && (
                      <TouchableOpacity
                        style={[
                          styles.contactActionItem,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : colors.card || 'rgba(0, 0, 0, 0.05)',
                            borderColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : colors.borderLight || 'rgba(0, 0, 0, 0.1)',
                          }
                        ]}
                        onPress={() => handleContactAction('email', pi.email)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.contactIconContainer, { backgroundColor: `${originalCardBgColor}20` }]}>
                          <MaterialCommunityIcons name="email" size={20} color={originalCardBgColor} />
                        </View>
                        <View style={styles.contactActionContent}>
                          <Text style={[styles.contactActionLabel, { color: textSecondaryColor, fontFamily: fonts.regular }]}>
                            Email
                          </Text>
                          <Text style={[styles.contactActionValue, { color: textColor, fontFamily: fonts.medium }]}>
                            {pi.email}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Website */}
                    {pi?.website && (
                      <TouchableOpacity
                        style={[
                          styles.contactActionItem,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : colors.card || 'rgba(0, 0, 0, 0.05)',
                            borderColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : colors.borderLight || 'rgba(0, 0, 0, 0.1)',
                          }
                        ]}
                        onPress={() => handleContactAction('website', pi.website)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.contactIconContainer, { backgroundColor: `${originalCardBgColor}20` }]}>
                          <MaterialCommunityIcons name="web" size={20} color={originalCardBgColor} />
                        </View>
                        <View style={styles.contactActionContent}>
                          <Text style={[styles.contactActionLabel, { color: textSecondaryColor, fontFamily: fonts.regular }]}>
                            Website
                          </Text>
                          <Text style={[styles.contactActionValue, { color: textColor, fontFamily: fonts.medium }]}>
                            {pi.website}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Social Links */}
                  {card?.socialLinks?.links && card.socialLinks.links.length > 0 && (
                    <View style={styles.socialLinksContainer}>
                      <Text style={[styles.socialLinksTitle, { color: textColor, fontFamily: fonts.bold }]}>
                        Social Links
                      </Text>
                      <View style={styles.socialLinksGrid}>
                        {card.socialLinks.links.map((link: any, index: number) => (
                          <TouchableOpacity
                            key={index}
                            style={[styles.socialLinkButton, { borderColor: originalCardBgColor }]}
                            onPress={() => handleSocialLink(link.url)}
                            activeOpacity={0.7}
                          >
                            <FontAwesome5
                              name={link.type.toLowerCase()}
                              size={20}
                              color={originalCardBgColor}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : null}

            {/* Share Your Card Button - Fixed at Bottom */}
            {isAuthenticated && card && !loading && (
              <View style={[styles.shareButtonContainer, { borderTopColor: colors.border || 'rgba(0,0,0,0.1)' }]}>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: originalCardBgColor }]}
                  onPress={handleShareYourCard}
                  disabled={sharingCard}
                  activeOpacity={0.8}
                >
                  {sharingCard ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="share-variant" size={22} color="#fff" />
                      <Text style={[styles.shareButtonText, { color: '#fff', fontFamily: fonts.medium }]}>
                        Share Your Card
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </Animated.View>

        {/* Card Picker Modal - when user has 2+ cards */}
        <Modal
          visible={sharePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSharePickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setSharePickerVisible(false)}
          />
          <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.pickerTitle, { color: colors.text, fontFamily: fonts.bold }]}>
              Share which card?
            </Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {myCards.map((c: any) => {
                const cid = c.id || c._id
                const cpi = c?.personalInfo || c?.personal_info || {}
                const cFirstName = cpi?.firstName ?? cpi?.first_name ?? ''
                const cLastName = cpi?.lastName ?? cpi?.last_name ?? ''
                const cNameParts = [cpi?.prefix, cFirstName, cpi?.middleName ?? cpi?.middle_name, cLastName, cpi?.suffix].filter(Boolean)
                const name = cNameParts.length > 0 ? cNameParts.join(' ').trim() : c.cardTitle || 'Untitled Card'
                return (
                  <TouchableOpacity
                    key={cid}
                    style={[styles.pickerItem, { backgroundColor: colors.card || 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
                    onPress={() => doShareCard(c)}
                    disabled={sharingCard}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.text, fontFamily: fonts.medium }]}>{name}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.pickerCancel, { borderColor: colors.border }]}
              onPress={() => setSharePickerVisible(false)}
            >
              <Text style={[styles.pickerCancelText, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </Modal>
  )
}

export default CardModal

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    height: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for fixed button at bottom
  },
  headerSection: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  logoImage: {
    width: 60,
    height: 60,
    maxWidth: 60,
    maxHeight: 60,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  contentSection: {
    flex: 1,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  cardName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDesignation: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  cardCompany: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  contactActionsContainer: {
    marginBottom: 24,
  },
  contactActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  contactIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactActionContent: {
    flex: 1,
  },
  contactActionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  contactActionValue: {
    fontSize: 16,
  },
  socialLinksContainer: {
    marginTop: 8,
  },
  socialLinksTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  socialLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialLinkButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shareButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerList: {
    maxHeight: 280,
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  pickerItemText: {
    fontSize: 16,
  },
  pickerCancel: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  pickerCancelText: {
    fontSize: 16,
  },
})
