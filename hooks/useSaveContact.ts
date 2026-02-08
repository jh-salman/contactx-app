import { apiService } from '@/services/apiService'
import { logger } from '@/lib/logger'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'

interface UseSaveContactProps {
  cardId: string
  cardData: any
  onSuccess?: () => void
}

export const useSaveContact = ({ cardId, cardData, onSuccess }: UseSaveContactProps) => {
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const router = useRouter()

  // Check if contact is already saved
  const checkIfSaved = useCallback(async () => {
    if (!cardId) return

    try {
      const contactsResponse = await apiService.getAllContacts()
      const contacts = contactsResponse.data || contactsResponse.contacts || contactsResponse || []
      
      const saved = Array.isArray(contacts) && contacts.some(
        (contact: any) => contact.cardId === cardId
      )
      
      setIsSaved(saved)
      
      if (saved) {
        logger.info('Contact already saved', { cardId })
      }
    } catch (error: any) {
      // Gracefully handle error - don't block modal if contacts check fails
      logger.error('Error checking saved contacts', error)
      setIsSaved(false)
    }
  }, [cardId])

  // Check if saved when cardData is available
  useEffect(() => {
    if (cardData && cardId) {
      checkIfSaved()
    }
  }, [cardData, cardId, checkIfSaved])

  const saveContact = async () => {
    if (!cardData) return

    setSaving(true)
    try {
      // Prepare contact data from card
      const contactData = {
        firstName: cardData.personalInfo?.firstName || '',
        lastName: cardData.personalInfo?.lastName || '',
        phone: cardData.personalInfo?.phoneNumber || cardData.personalInfo?.phone || '',
        email: cardData.personalInfo?.email || '',
        company: cardData.personalInfo?.company || '',
        jobTitle: cardData.personalInfo?.jobTitle || '',
        logo: cardData.logo || '',
        profile_img: cardData.profile || '',
      }

      const response = await apiService.saveContact(cardId, contactData)

      if (response?.alreadySaved) {
        Alert.alert('Already Saved', 'This contact is already in your contacts')
        setIsSaved(true)
      } else {
        Alert.alert(
          'Success',
          'Contact saved successfully!',
          [
            {
              text: 'View Contacts',
              onPress: () => {
                router.push('/(tabs)/contacts' as any)
                onSuccess?.()
              },
            },
            {
              text: 'OK',
              onPress: () => {
                setIsSaved(true)
                onSuccess?.()
              },
            },
          ]
        )
      }
    } catch (error: any) {
      logger.error('Error saving contact', error)
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to save contact. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return {
    saveContact,
    saving,
    isSaved,
    setIsSaved,
    checkIfSaved, // Export for manual checking if needed
  }
}

