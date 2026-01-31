import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Text } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { StatusBar } from 'expo-status-bar'

const CreateContact = () => {
  const router = useRouter()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(false)
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
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim() && !formData.lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter at least first name or last name')
      return false
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      Alert.alert('Validation Error', 'Please enter at least phone number or email')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      // Note: This assumes you have a create contact endpoint
      // If not, you might need to use saveContact with a cardId
      // For now, I'll show an alert that manual creation might need cardId
      Alert.alert(
        'Info',
        'To create a contact, you need to scan a card first. Contacts are created when you save a scanned card.',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      )
    } catch (error: any) {
      console.error('Error creating contact:', error)
      Alert.alert('Error', error.response?.data?.message || 'Failed to create contact')
    } finally {
      setLoading(false)
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Create Contact</Text>
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
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Phone *</Text>
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
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Email *</Text>
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
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonPrimaryText} />
            ) : (
              <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, fontSize: 16, color: colors.buttonPrimaryText }]}>Create Contact</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

export default CreateContact

