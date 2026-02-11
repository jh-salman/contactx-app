import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { logger } from '@/lib/logger'
import { StatusBar } from 'expo-status-bar'

interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  company?: string
  jobTitle?: string
  profile_img?: string
  note?: string
  city?: string
  country?: string
  createdAt?: string
  cardId?: string
  card?: {
    cardColor?: string
  }
}

const ContactDetails = () => {
  const router = useRouter()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [contact, setContact] = useState<Contact | null>(null)
  const [cardColor, setCardColor] = useState<string>(colors.primary)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchContactDetails()
    }
  }, [id])

  const fetchContactDetails = async () => {
    try {
      setLoading(true)
      // Since we don't have a get single contact API, we'll fetch all and filter
      const response = await apiService.getAllContacts()
      const contactsData = response.data || response.contacts || response || []
      const foundContact = Array.isArray(contactsData) 
        ? contactsData.find((c: any) => c.id === id || c._id === id)
        : null
      
      if (foundContact) {
        setContact(foundContact)
        
        // Fetch card to get cardColor if cardId exists
        if (foundContact.cardId) {
          try {
            const cardResponse = await apiService.scanCard(foundContact.cardId, 'link')
            const cardData = cardResponse.data || cardResponse
            if (cardData?.cardColor) {
              setCardColor(cardData.cardColor)
            } else {
              // Use primary color if card doesn't have color
              setCardColor(colors.primary)
            }
          } catch (error) {
            logger.error('Error fetching card color', error)
            // Use primary color if card fetch fails
            setCardColor(colors.primary)
          }
        } else {
          // No cardId means contact was created manually - use primary color
          setCardColor(colors.primary)
        }
      } else {
        Alert.alert('Error', 'Contact not found', [
          { text: 'OK', onPress: () => router.back() }
        ])
      }
    } catch (error: any) {
      logger.error('Error fetching contact', error)
      Alert.alert('Error', 'Failed to load contact details', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true)
              await apiService.deleteContact(id)
              Alert.alert('Success', 'Contact deleted successfully', [
                { 
                  text: 'OK', 
                  onPress: () => {
                    // Navigate back - contacts page will auto-refresh via useFocusEffect
                    router.back()
                  }
                }
              ])
            } catch (error: any) {
              logger.error('Error deleting contact', error)
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete contact')
            } finally {
              setDeleting(false)
            }
          }
        }
      ]
    )
  }

  const handleEdit = () => {
    router.push(`/edit-contact/${id}` as any)
  }

  // Get card background color helper
  const getCardBgColor = (color: string) => {
    if (color?.startsWith('#')) {
      return color
    }
    const colorMap: { [key: string]: string } = {
      'black': '#000000',
      'white': '#FFFFFF',
      'blue': '#007AFF',
      'red': '#FF3B30',
      'green': '#34C759',
      'yellow': '#FFCC00',
      'purple': '#AF52DE',
      'orange': '#FF9500',
      'pink': '#FF2D55',
      'gray': '#8E8E93',
      '#08CB00': '#08CB00',
      '#000000': '#000000',
      '#00F7FF': '#00F7FF',
      '#FF7DB0': '#FF7DB0',
      '#FFA239': '#FFA239',
      '#4DFFBE': '#4DFFBE',
      '#B6F500': '#B6F500',
      '#FF0B55': '#FF0B55',
    }
    return colorMap[color?.toLowerCase()] || colorMap[color] || color || '#000000'
  }

  const cardBgColor = getCardBgColor(cardColor)
  
  // Determine text color based on card background
  const getTextColor = (bgColor: string) => {
    const color = bgColor.toLowerCase().trim()
    if (color === 'black' || color === '#000' || color === '#000000' || 
        color === 'dark' || color.includes('dark') || color === '#007aff' || color === 'blue') {
      return colors.buttonPrimaryText
    }
    return colors.text
  }

  const textColor = getTextColor(cardBgColor)
  const secondaryTextColor = ['black', '#000', '#000000', 'blue', '#007aff'].includes(cardBgColor.toLowerCase()) ? colors.placeholder : colors.placeholder

  // Create styles dynamically based on card color
  const createStyles = () => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: cardBgColor,
      borderBottomWidth: 0,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: textColor,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 30,
      paddingTop: 20,
    },
    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: cardBgColor,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 3,
      borderColor: cardBgColor,
    },
    avatarText: {
      color: textColor,
      fontSize: 36,
      fontWeight: 'bold',
    },
    name: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    company: {
      fontSize: 18,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    jobTitle: {
      fontSize: 16,
      color: colors.textTertiary,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: cardBgColor,
      borderLeftWidth: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: cardBgColor,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    infoContent: {
      flex: 1,
      marginLeft: 12,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.textTertiary,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 16,
      color: colors.text,
    },
    noteContainer: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      padding: 12,
    },
    noteText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    actions: {
      marginTop: 20,
      marginBottom: 20,
    },
    editButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    editButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  })

  const styles = createStyles()

  // Default card color for loading/error states - use primary color
  const defaultCardColor = colors.primary
  const defaultTextColor = getTextColor(defaultCardColor)

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
          <View style={[styles.header, { backgroundColor: defaultCardColor }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={defaultTextColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: 18, color: defaultTextColor }]}>Contact Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={defaultCardColor} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (!contact) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
          <View style={[styles.header, { backgroundColor: defaultCardColor }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={defaultTextColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: 18, color: defaultTextColor }]}>Contact Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerContent}>
            <Text style={[styles.errorText, { fontFamily: fonts.regular, fontSize: 16, color: colors.text }]}>Contact not found</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'No Name'
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: 18, color: textColor }]}>Contact Details</Text>
          <TouchableOpacity onPress={handleDelete} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <MaterialCommunityIcons name="delete" size={24} color={textColor} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Text style={[styles.avatarText, { fontFamily: fonts.bold, fontSize: 36, color: textColor }]}>{initials}</Text>
            </View>
            <Text style={[styles.name, { fontFamily: fonts.bold, fontSize: 28, color: colors.text }]}>{fullName}</Text>
            {contact.company && (
              <Text style={[styles.company, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>{contact.company}</Text>
            )}
            {contact.jobTitle && (
              <Text style={[styles.jobTitle, { fontFamily: fonts.regular, fontSize: 16, color: colors.text }]}>{contact.jobTitle}</Text>
            )}
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: cardBgColor }]}>Contact Information</Text>
            
            {contact.phone && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="phone" size={20} color={cardBgColor} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { fontFamily: fonts.regular, fontSize: 12, color: colors.placeholder }]}>Phone</Text>
                  <Text style={[styles.infoValue, { fontFamily: fonts.regular, fontSize: 16, color: colors.text }]}>{contact.phone}</Text>
                </View>
              </View>
            )}

            {contact.email && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="email" size={20} color={cardBgColor} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { fontFamily: fonts.regular, fontSize: 12, color: colors.placeholder }]}>Email</Text>
                  <Text style={[styles.infoValue, { fontFamily: fonts.regular, fontSize: 16, color: colors.text }]}>{contact.email}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Location Information */}
          {(contact.city || contact.country) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: cardBgColor }]}>Location</Text>
              
              {(contact.city || contact.country) && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="map-marker" size={20} color={cardBgColor} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { fontFamily: fonts.regular, fontSize: 12, color: colors.placeholder }]}>Address</Text>
                    <Text style={[styles.infoValue, { fontFamily: fonts.regular, fontSize: 16, color: colors.text }]}>
                      {[contact.city, contact.country].filter(Boolean).join(', ') || 'N/A'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Notes */}
          {contact.note && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: cardBgColor }]}>Notes</Text>
              <View style={styles.noteContainer}>
                <Text style={[styles.noteText, { fontFamily: fonts.regular, fontSize: 14, color: colors.text }]}>{contact.note}</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.editButton, { backgroundColor: cardBgColor }]} onPress={handleEdit}>
              <MaterialCommunityIcons name="pencil" size={20} color={textColor} />
              <Text style={[styles.editButtonText, { fontFamily: fonts.medium, fontSize: 16, color: textColor }]}>Edit Contact</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

export default ContactDetails

