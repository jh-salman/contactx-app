import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Text, Image } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { StatusBar } from 'expo-status-bar'
import * as ImagePicker from 'expo-image-picker'
import { convertImageToBase64 } from '@/utils/imageUtils'
import { uploadImageToCloudinary } from '@/services/imageUploadService'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CreateCard = () => {
  const router = useRouter()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(false)
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
    socialLinks: [] as Array<{ type: string; url: string }>,
  })
  
  const [currentSocialLink, setCurrentSocialLink] = useState({
    type: 'linkedin',
    url: '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      Alert.alert('Validation Error', 'First Name is required')
      return false
    }
    if (!formData.lastName.trim()) {
      Alert.alert('Validation Error', 'Last Name is required')
      return false
    }
    if (!formData.jobTitle.trim()) {
      Alert.alert('Validation Error', 'Job Title is required')
      return false
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Phone Number is required')
      return false
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required')
      return false
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address')
      return false
    }
    return true
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

      const response = await apiService.createCard(cardData)
      
      // Get the created card data from response
      // API returns: { success: true, message: "...", data: cardObject }
      const createdCard = response.data || (response as any).data || response
      
      console.log('✅ Card created successfully:', createdCard?.id || createdCard?._id)
      console.log('📦 Full response:', JSON.stringify(response, null, 2))
      
      // Store created card temporarily to show it even if fetch fails
      if (createdCard && (createdCard.id || createdCard._id)) {
        try {
          await AsyncStorage.setItem('lastCreatedCard', JSON.stringify(createdCard))
          console.log('💾 Stored created card in AsyncStorage')
          // Clear after 10 seconds (enough time for refresh)
          setTimeout(async () => {
            await AsyncStorage.removeItem('lastCreatedCard')
            console.log('🗑️ Cleared created card from AsyncStorage')
          }, 10000)
        } catch (e) {
          console.warn('Failed to store created card:', e)
        }
      } else {
        console.warn('⚠️ Created card missing ID:', createdCard)
      }
      
      Alert.alert('Success', 'Card created successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate back - cards page will auto-refresh via useFocusEffect
            router.back()
          }
        }
      ])
    } catch (error: any) {
      console.error('Error creating card:', error)
      Alert.alert('Error', error.response?.data?.message || 'Failed to create card')
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
    colorOptions: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    colorOption: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorOptionSelected: {
      borderColor: colors.primary,
      borderWidth: 3,
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
    socialLinkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      marginBottom: 8,
    },
    socialLinkInfo: {
      flex: 1,
      marginRight: 12,
    },
    socialLinkType: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textTransform: 'capitalize',
    },
    socialLinkUrl: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    removeButton: {
      padding: 4,
    },
    addSocialLinkContainer: {
      marginTop: 12,
    },
    socialLinkInputs: {
      marginBottom: 12,
    },
    socialLinkTypeSelect: {
      marginBottom: 12,
    },
    socialLinkTypeButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    socialLinkTypeButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    socialLinkTypeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    socialLinkTypeButtonText: {
      fontSize: 12,
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
      padding: 12,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      gap: 8,
    },
    addButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    imagePreviewContainer: {
      position: 'relative',
      width: '100%',
      minHeight: 200,
      height: 200,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
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
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.background,
      gap: 8,
    },
    uploadButtonText: {
      fontSize: 14,
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
          <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Create New Card</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Card Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Card Title</Text>
              <TextInput
                style={styles.input}
                placeholder="ContactX"
                placeholderTextColor={colors.placeholder}
                value={formData.cardTitle}
                onChangeText={(value) => handleInputChange('cardTitle', value)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Personal Information *</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                placeholderTextColor={colors.placeholder}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                placeholderTextColor={colors.placeholder}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Job Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter job title"
                placeholderTextColor={colors.placeholder}
                value={formData.jobTitle}
                onChangeText={(value) => handleInputChange('jobTitle', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Phone Number *</Text>
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

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Images (Optional)</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Logo URL</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter logo image URL"
                placeholderTextColor={colors.placeholder}
                value={formData.logo}
                onChangeText={(value) => handleInputChange('logo', value)}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Profile Image URL</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter profile image URL"
                placeholderTextColor={colors.placeholder}
                value={formData.profile}
                onChangeText={(value) => handleInputChange('profile', value)}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Cover Image</Text>
              
              {/* Cover Image Preview */}
              {formData.cover ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: formData.cover }} 
                    style={styles.imagePreview}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error('Image load error:', error)
                    }}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleInputChange('cover', '')}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={colors.buttonPrimaryText} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.imagePreviewContainer, { 
                  backgroundColor: colors.backgroundSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderStyle: 'dashed',
                }]}>
                  <MaterialCommunityIcons name="image-outline" size={48} color={colors.placeholder} />
                  <Text style={[styles.uploadButtonText, { 
                    marginTop: 8, 
                    color: colors.placeholder,
                    fontSize: 12 
                  }]}>No cover image selected</Text>
                </View>
              )}
              
              {/* Upload Button */}
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={async () => {
                  try {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
                    if (status !== 'granted') {
                      Alert.alert('Permission Required', 'Please grant permission to access your photos.')
                      return
                    }

                    const result = await ImagePicker.launchImageLibraryAsync({
                      // mediaTypes defaults to images, so we can omit it
                      allowsEditing: true,
                      aspect: [16, 9],
                      quality: 0.8,
                      base64: true, // Get base64 directly from ImagePicker (more reliable on iOS)
                    })

                    if (!result.canceled && result.assets[0]) {
                      const asset = result.assets[0]
                      const imageUri = asset.uri
                      
                      // Show loading state
                      setLoading(true)
                      
                      try {
                        // If base64 is available directly from ImagePicker, use it
                        let base64Image: string | null = null;
                        
                        if (asset.base64) {
                          // Use base64 directly from ImagePicker
                          // Determine MIME type from URI extension or default to jpeg
                          const uri = asset.uri || '';
                          const isPng = uri.toLowerCase().endsWith('.png') || uri.toLowerCase().includes('.png');
                          const mimeType = isPng ? 'image/png' : 'image/jpeg';
                          base64Image = `data:${mimeType};base64,${asset.base64}`;
                          console.log('✅ Using base64 from ImagePicker');
                        } else {
                          // Fallback to conversion
                          console.log('⚠️ Base64 not available, converting...');
                          base64Image = await convertImageToBase64(imageUri);
                        }
                        
                        if (!base64Image) {
                          throw new Error('Failed to get image data');
                        }
                        
                        // Upload image immediately to Cloudinary
                        const cloudinaryUrl = await uploadImageToCloudinary(base64Image, 'cover')
                        
                        if (cloudinaryUrl) {
                          // Update form with Cloudinary URL - preview will show immediately
                          handleInputChange('cover', cloudinaryUrl)
                          Alert.alert('Success', 'Cover image uploaded successfully!')
                        } else {
                          Alert.alert('Error', 'Failed to upload image. Please try again.')
                        }
                      } catch (uploadError: any) {
                        console.error('Error uploading image:', uploadError)
                        Alert.alert('Error', uploadError.response?.data?.message || uploadError.message || 'Failed to upload image. Please try again.')
                      } finally {
                        setLoading(false)
                      }
                    }
                  } catch (error: any) {
                    console.error('Error picking image:', error)
                    Alert.alert('Error', 'Failed to pick image. Please try again.')
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                <MaterialCommunityIcons name="camera-plus" size={20} color={colors.primary} />
                <Text style={[styles.uploadButtonText, { fontFamily: fonts.medium, fontSize: 14, color: colors.primary }]}>
                  {formData.cover ? 'Change Cover Image' : 'Upload Cover Image'}
                </Text>
              </TouchableOpacity>
              
              {/* URL Input (Optional) */}
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="Or enter cover image URL"
                placeholderTextColor={colors.placeholder}
                value={formData.cover}
                onChangeText={(value) => handleInputChange('cover', value)}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Social Links (Optional)</Text>
            
            {formData.socialLinks.map((link, index) => (
              <View key={index} style={styles.socialLinkRow}>
                <View style={styles.socialLinkInfo}>
                  <Text style={[styles.socialLinkType, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>{link.type}</Text>
                  <Text style={[styles.socialLinkUrl, { fontFamily: fonts.regular, fontSize: 12, color: colors.placeholder }]} numberOfLines={1}>{link.url}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeSocialLink(index)}
                  style={styles.removeButton}
                >
                  <MaterialCommunityIcons name="close" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            
            <View style={styles.addSocialLinkContainer}>
              <View style={styles.socialLinkInputs}>
                <View style={styles.socialLinkTypeSelect}>
                  <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>Type</Text>
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
                          { fontFamily: fonts.regular, fontSize: 12, color: currentSocialLink.type === type ? colors.buttonPrimaryText : colors.placeholder }
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { fontFamily: fonts.medium, fontSize: 14, color: colors.text }]}>URL</Text>
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
                <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                <Text style={[styles.addButtonText, { fontFamily: fonts.medium, fontSize: 14, color: colors.primary }]}>Add Link</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 18, color: colors.text }]}>Card Color</Text>
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
                      <MaterialCommunityIcons name="check" size={20} color={getCheckIconColor(color.value)} />
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
              <Text style={[styles.submitButtonText, { fontFamily: fonts.medium, fontSize: 16, color: colors.buttonPrimaryText }]}>Create Card</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

export default CreateCard

