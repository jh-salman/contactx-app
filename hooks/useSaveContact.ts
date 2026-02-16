import { apiService } from '@/services/apiService'
import { logger } from '@/lib/logger'
import { showSuccess, showError, showWarning } from '@/lib/toast'
import { useCallback, useEffect, useState } from 'react'

interface UseSaveContactProps {
  cardId: string
  cardData: any
  locationData?: {
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
  } | null
  onSuccess?: () => void
}

export const useSaveContact = ({ cardId, cardData, locationData, onSuccess }: UseSaveContactProps) => {
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

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

  const saveContact = async (options?: { silent?: boolean }) => {
    if (!cardData) return

    setSaving(true)
    try {
      // Prepare contact data from card (support personalInfo + personal_info, camelCase + snake_case)
      const pi = cardData?.personalInfo || cardData?.personal_info || {}
      const contactData: Record<string, any> = {
        firstName: pi?.firstName ?? pi?.first_name ?? '',
        lastName: pi?.lastName ?? pi?.last_name ?? '',
        phone: pi?.phoneNumber ?? pi?.phone_number ?? pi?.phone ?? '',
        email: pi?.email ?? '',
        company: pi?.company ?? '',
        jobTitle: pi?.jobTitle ?? pi?.job_title ?? '',
        logo: cardData?.logo ?? '',
        profile_img: cardData?.profile ?? '',
      }
      // Use locationData (GPS) or cardData.scanLocation (IP-based from scan API) when location denied
      const loc = locationData || cardData?.scanLocation
      if (loc) {
        contactData.latitude = loc.latitude
        contactData.longitude = loc.longitude
        contactData.city = loc.city
        contactData.country = loc.country
        if (locationData) {
          contactData.street = locationData.street
          contactData.streetNumber = locationData.streetNumber
          contactData.district = locationData.district
          contactData.region = locationData.region
          contactData.subregion = locationData.subregion
          contactData.postalCode = locationData.postalCode
          contactData.addressName = locationData.name // village/place
          contactData.formattedAddress = locationData.formattedAddress
          contactData.isoCountryCode = locationData.isoCountryCode
        }
      }

      const response = await apiService.saveContact(cardId, contactData)

      if (response?.alreadySaved) {
        if (!options?.silent) {
          showWarning('Already Saved', 'This contact is already in your contacts')
        }
        setIsSaved(true)
      } else {
        setIsSaved(true)
        onSuccess?.()
        showSuccess('Contact Saved', 'Successfully added to your contacts')
      }
    } catch (error: any) {
      logger.error('Error saving contact', error)
      showError(
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

