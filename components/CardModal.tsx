import { SaveContactButton } from '@/components/SaveContactButton'
import { useAuth } from '@/context/AuthContext'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { useSaveContact } from '@/hooks/useSaveContact'
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
}

const CardModal = ({ visible, cardId, onClose, locationData }: CardModalProps) => {
  const [card, setCard] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const { isAuthenticated } = useAuth()

  // Save contact hook
  const { saveContact, saving, isSaved, setIsSaved, checkIfSaved } = useSaveContact({
    cardId,
    cardData: card,
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

  const fetchCard = async () => {
    if (!cardId) return

    setLoading(true)
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔍 FETCHING CARD DATA')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🆔 Card ID:', cardId)
      console.log('📡 Source: QR Code')
      console.log('⏰ Request Time:', new Date().toISOString())
      
      if (locationData) {
        console.log('📍 Location Data (from device):', {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          city: locationData.city,
          country: locationData.country,
        })
      } else {
        console.log('⚠️ No location data - backend will use IP-based detection')
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Pass location data to scanCard (or undefined if not available)
      const response = await apiService.scanCard(cardId, 'qr', locationData || undefined)
      // Extract the nested structure properly
      const responseData = response.data || response
      const cardData = responseData.card || responseData
      const cardScanData = responseData.cardScan || null

      // Log detailed scan information from API response
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ CARD DATA RECEIVED')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📋 Full Response:', JSON.stringify(response, null, 2))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Log scan-specific information if available
      if (cardScanData) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📍 SCAN LOCATION INFORMATION')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🌍 City:', cardScanData.city || 'N/A')
        console.log('🌎 Country:', cardScanData.country || 'N/A')
        console.log('📍 Latitude:', cardScanData.latitude || 'N/A')
        console.log('📍 Longitude:', cardScanData.longitude || 'N/A')
        console.log('⏰ Scan Timestamp:', cardScanData.scannedAt || cardScanData.createdAt || 'N/A')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
      

      // Log card information
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🎴 CARD INFORMATION')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📝 Card Title:', cardData?.cardTitle || 'N/A')
      console.log('🎨 Card Color:', cardData?.cardColor || 'N/A')
      console.log('👤 Owner:', cardData?.personalInfo?.firstName || 'N/A', cardData?.personalInfo?.lastName || '')
      console.log('🏢 Company:', cardData?.personalInfo?.company || 'N/A')
      console.log('📧 Email:', cardData?.personalInfo?.email || 'N/A')
      console.log('📱 Phone:', cardData?.personalInfo?.phoneNumber || cardData?.personalInfo?.phone || 'N/A')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      setCard(cardData)
      
      // Check if contact is already saved after card is loaded
      if (isAuthenticated) {
        // Use setTimeout to ensure cardData is set before checking
        setTimeout(() => {
          checkIfSaved()
        }, 100)
      }
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('❌ ERROR FETCHING CARD')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('🆔 Card ID:', cardId)
      console.error('❌ Error:', error.message || error)
      console.error('📄 Response:', error.response?.data || 'N/A')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

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

  // Get initials
  const firstName = card?.personalInfo?.firstName || ''
  const lastName = card?.personalInfo?.lastName || ''
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
                        <Image
                          source={require('@/assets/images/logo.jpg')}
                          style={styles.avatarImage}
                          resizeMode="contain"
                        />
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
                      {firstName} {lastName}
                    </Text>
                    {card?.personalInfo?.jobTitle && (
                      <Text style={[styles.cardDesignation, { color: textSecondaryColor, fontFamily: fonts.regular }]}>
                        {card.personalInfo.jobTitle}
                      </Text>
                    )}
                    {card?.personalInfo?.company && (
                      <Text style={[styles.cardCompany, { color: textSecondaryColor, fontFamily: fonts.medium }]}>
                        {card.personalInfo.company}
                      </Text>
                    )}
                  </View>

                  {/* Contact Actions */}
                  <View style={styles.contactActionsContainer}>
                    {/* Phone */}
                    {(card?.personalInfo?.phoneNumber || card?.personalInfo?.phone) && (
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
                        onPress={() => handleContactAction('phone', card.personalInfo.phoneNumber || card.personalInfo.phone)}
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
                            {card.personalInfo.phoneNumber || card.personalInfo.phone}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Email */}
                    {card?.personalInfo?.email && (
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
                        onPress={() => handleContactAction('email', card.personalInfo.email)}
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
                            {card.personalInfo.email}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Website */}
                    {card?.personalInfo?.website && (
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
                        onPress={() => handleContactAction('website', card.personalInfo.website)}
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
                            {card.personalInfo.website}
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

            {/* Save Contact Button - Fixed at Bottom */}
            {isAuthenticated && card && !loading && (
              <SaveContactButton
                onPress={saveContact}
                loading={saving}
                isSaved={isSaved}
                cardColor={originalCardBgColor}
              />
            )}
          </SafeAreaView>
        </Animated.View>
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
})
