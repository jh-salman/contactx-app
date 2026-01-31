import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { StatusBar } from 'expo-status-bar'

interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  company?: string
  jobTitle?: string
  note?: string
  city?: string
  country?: string
}

const EditContact = () => {
  const router = useRouter()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Contact>({
    id: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    jobTitle: '',
    note: '',
    city: '',
    country: '',
  })

  useEffect(() => {
    if (id) {
      fetchContact()
    }
  }, [id])

  const fetchContact = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAllContacts()
      const contactsData = response.data || response.contacts || response || []
      const foundContact = Array.isArray(contactsData) 
        ? contactsData.find((c: Contact) => c.id === id || (c as any)._id === id)
        : null
      
      if (foundContact) {
        setFormData({
          id: foundContact.id || (foundContact as any)._id || id,
          firstName: foundContact.firstName || '',
          lastName: foundContact.lastName || '',
          phone: foundContact.phone || '',
          email: foundContact.email || '',
          company: foundContact.company || '',
          jobTitle: foundContact.jobTitle || '',
          note: foundContact.note || '',
          city: foundContact.city || '',
          country: foundContact.country || '',
        })
      } else {
        Alert.alert('Error', 'Contact not found', [
          { text: 'OK', onPress: () => router.back() }
        ])
      }
    } catch (error: any) {
      console.error('Error fetching contact:', error)
      Alert.alert('Error', 'Failed to load contact', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.firstName.trim() && !formData.lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter at least first name or last name')
      return
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      Alert.alert('Validation Error', 'Please enter at least phone number or email')
      return
    }

    try {
      setSaving(true)
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        company: formData.company,
        jobTitle: formData.jobTitle,
        note: formData.note,
        city: formData.city,
        country: formData.country,
      }

      await apiService.updateContact(id, updateData)
      Alert.alert('Success', 'Contact updated successfully', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate back - contacts page will auto-refresh via useFocusEffect
            router.back()
          }
        }
      ])
    } catch (error: any) {
      console.error('Error updating contact:', error)
      Alert.alert('Error', error.response?.data?.message || 'Failed to update contact')
    } finally {
      setSaving(false)
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.inputText,
      backgroundColor: colors.inputBackground,
    },
    textArea: {
      minHeight: 100,
      paddingTop: 12,
    },
    submitButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 20,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: colors.buttonPrimaryText,
      fontSize: 16,
      fontWeight: '600',
    },
  })

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Edit Contact</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Edit Contact</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                placeholderTextColor={colors.placeholder}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                placeholderTextColor={colors.placeholder}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
              />
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Contact Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor={colors.placeholder}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Email</Text>
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

          {/* Professional Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Professional Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Company</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter company name"
                placeholderTextColor={colors.placeholder}
                value={formData.company}
                onChangeText={(value) => handleInputChange('company', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Job Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter job title"
                placeholderTextColor={colors.placeholder}
                value={formData.jobTitle}
                onChangeText={(value) => handleInputChange('jobTitle', value)}
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Location</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter city"
                placeholderTextColor={colors.placeholder}
                value={formData.city}
                onChangeText={(value) => handleInputChange('city', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Country</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter country"
                placeholderTextColor={colors.placeholder}
                value={formData.country}
                onChangeText={(value) => handleInputChange('country', value)}
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any notes about this contact"
              placeholderTextColor={colors.placeholder}
              value={formData.note}
              onChangeText={(value) => handleInputChange('note', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.buttonPrimaryText} />
            ) : (
              <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, fontSize: 16, color: colors.buttonPrimaryText }]}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

export default EditContact

