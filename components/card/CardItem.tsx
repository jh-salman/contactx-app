import { useTabBar } from '@/context/TabBar'
import { useTheme, useThemeColors } from '@/context/ThemeContext'
import { FontAwesome5 } from '@expo/vector-icons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as ImagePicker from 'expo-image-picker'
import React from 'react'
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { Extrapolate, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
// import * as Sharing from 'expo-sharing'

const { width } = Dimensions.get("screen")

const CardItem = ({ item, index, scrollX, onRefresh }: { item: any, index: number, scrollX: any, onRefresh?: () => void }) => {
    // Local state for card data to allow immediate UI updates
    const [cardData, setCardData] = React.useState(item)
    
    // Update local state when item prop changes
    React.useEffect(() => {
        setCardData(item)
    }, [item])
    
    // Log card data to see structure
    React.useEffect(() => {
        console.log(`🎴 Card ${index} Data:`, JSON.stringify(cardData, null, 2))
    }, [cardData, index])
    const { showTabBar, hideTabBar } = useTabBar()
    const { isDark } = useTheme()
    const colors = useThemeColors()
    const translateY = useSharedValue(0)
    const hasCalledShowTabBar = useSharedValue(false)
    const hasCalledHideTabBar = useSharedValue(false)
    const [showQRModal, setShowQRModal] = React.useState(false)
    const [uploading, setUploading] = React.useState(false)

    // Get card background color, default to white
    const getCardBgColor = (color: string) => {
        // If it's already a hex color, return it
        if (color?.startsWith('#')) {
            return color
        }
        
        const colorMap: { [key: string]: string } = {
            'black': '#000',
            'white': '#fff',
            'blue': '#007AFF',
            'red': '#FF3B30',
            'green': '#34C759',
            'yellow': '#FFCC00',
            'purple': '#AF52DE',
            'orange': '#FF9500',
            'pink': '#FF2D55',
            'gray': '#8E8E93',
            // New custom colors
            '#08CB00': '#08CB00',
            '#000000': '#000000',
            '#00F7FF': '#00F7FF',
            '#FF7DB0': '#FF7DB0',
            '#FFA239': '#FFA239',
            '#4DFFBE': '#4DFFBE',
            '#B6F500': '#B6F500',
            '#FF0B55': '#FF0B55',
        }
        return colorMap[color?.toLowerCase()] || colorMap[color] || color || '#fff'
    }
    
    const originalCardBgColor = getCardBgColor(cardData.cardColor)
    
    // Card background should use theme input color
    const cardBgColor = colors.input
    
    // Determine if text should be light or dark based on background color and theme
    const getTextColor = (bgColor: string, darkMode: boolean) => {
        if (darkMode) {
            // Dark mode: use theme text color
            return colors.text
        }
        
        // Light mode: use light text on dark background (card color)
        // Convert color to lowercase for comparison
        const color = bgColor.toLowerCase().trim()
        
        // Dark colors - use white text
        if (color === 'black' || color === '#000' || color === '#000000' || 
            color === 'dark' || color.includes('dark') || color === '#007aff' || color === 'blue') {
            return '#FFFFFF'
        }
        
        // Light colors - use theme text color
        return colors.text
    }
    
    const textColor = getTextColor(cardBgColor, isDark)
    const secondaryTextColor = isDark 
        ? colors.placeholder 
        : (['black', '#000', '#000000', 'blue', '#007aff'].includes(originalCardBgColor.toLowerCase()) ? colors.placeholder : colors.placeholder)
    
    // Get full name from personalInfo
    const fullName = cardData.personalInfo 
        ? `${cardData.personalInfo.firstName || ''} ${cardData.personalInfo.lastName || ''}`.trim()
        : cardData.name || cardData.fullName || ''
    
    // Get job title
    const jobTitle = cardData.personalInfo?.jobTitle || cardData.title || cardData.designation || ''
    
    // Get company name (if available in personalInfo or elsewhere)
    const companyName = cardData.personalInfo?.company || cardData.company || ''
    
    // Get phone and email from personalInfo
    const cardPhone = cardData.personalInfo?.phoneNumber || cardData.setting?.phoneNumber || ''
    const cardEmail = cardData.personalInfo?.email || cardData.setting?.email || ''
    
    // Get website from social links
    const websiteLink = cardData.socialLinks?.links?.find((link: any) => 
        link.type?.toLowerCase() === 'website'
    )?.url || ''
    
    // Generate initials from full name
    const getInitials = (name: string) => {
        if (!name) return ''
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }
    const initials = getInitials(fullName)
    
    // Get image URI from API (Cloudinary URLs)
    const getImageUri = (type: 'logo' | 'cover') => {
        let uri = null
        if (type === 'logo') {
            uri = cardData.logo
        } else if (type === 'cover') {
            uri = cardData.cover
        }
        
        // Debug logging
        if (__DEV__ && type === 'cover') {
            console.log(`🖼️ Cover Image Debug:`, {
                type,
                uri,
                cardDataCover: cardData.cover,
                hasUri: !!uri,
                uriType: typeof uri,
            })
        }
        
        return uri
    }

    // Only cover and logo are used in UI now
    
    // Handle contact actions
    const handlePhonePress = () => {
        if (cardPhone) {
            Linking.openURL(`tel:${cardPhone}`)
        }
    }
    
    const handleEmailPress = () => {
        if (cardEmail) {
            Linking.openURL(`mailto:${cardEmail}`)
        }
    }
    
    const handleWebsitePress = () => {
        if (websiteLink) {
            const url = websiteLink.startsWith('http') ? websiteLink : `https://${websiteLink}`
            Linking.openURL(url)
        }
    }
    
    const handleShare = () => {
        // Show QR modal instead of sharing
        if (cardData.qrImage) {
            setShowQRModal(true)
        }
    }
    
    const closeQRModal = () => {
        setShowQRModal(false)
    }

    // Handle image upload - Upload to Cloudinary via API
    const handleImageUpload = async (imageType: 'logo' | 'cover') => {
        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access your photos.')
                return
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                // mediaTypes defaults to images, so we can omit it
                allowsEditing: true,
                aspect: imageType === 'cover' ? [16, 9] : [1, 1],
                quality: 0.8,
                base64: true, // Get base64 directly from ImagePicker
            })

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0]
                setUploading(true)

                try {
                    const cardId = cardData.id || cardData._id
                    if (!cardId) {
                        Alert.alert('Error', 'Card ID not found')
                        return
                    }

                    // Import upload service
                    const { uploadImageToCloudinary } = await import('@/services/imageUploadService')
                    
                    // Import apiService
                    const { apiService } = await import('@/services/apiService')
                    
                    // Get base64 from ImagePicker if available, otherwise use URI
                    let imageData: string;
                    if (asset.base64) {
                        // Determine MIME type from URI extension or default to jpeg
                        const uri = asset.uri || '';
                        const isPng = uri.toLowerCase().endsWith('.png') || uri.toLowerCase().includes('.png');
                        const mimeType = isPng ? 'image/png' : 'image/jpeg';
                        imageData = `data:${mimeType};base64,${asset.base64}`;
                    } else {
                        imageData = asset.uri;
                    }
                    
                    // Upload to Cloudinary via API
                    const cloudinaryUrl = await uploadImageToCloudinary(imageData, imageType)
                    
                    if (cloudinaryUrl) {
                        // Update card via API with new Cloudinary URL
                        await apiService.updateCard(cardId, {
                            [imageType]: cloudinaryUrl,
                        })
                        
                        Alert.alert('Success', `${imageType.charAt(0).toUpperCase() + imageType.slice(1)} image uploaded successfully!`)
                        
                        // Update local state immediately for instant preview
                        console.log(`🔄 Updating ${imageType} in local state:`, cloudinaryUrl)
                        setCardData((prev: any) => {
                            const updated = {
                                ...prev,
                                [imageType]: cloudinaryUrl
                            }
                            console.log(`✅ Updated cardData.${imageType}:`, updated[imageType])
                            console.log(`📋 Full cardData after update:`, JSON.stringify(updated, null, 2))
                            return updated
                        })
                        
                        // Refresh card data from server after a small delay
                        if (onRefresh) {
                            setTimeout(() => {
                                console.log('🔄 Refreshing cards from server...')
                                onRefresh()
                            }, 1000) // Delay to ensure UI updates first
                        }
                    } else {
                        Alert.alert('Error', 'Failed to upload image. Please try again.')
                    }
                } catch (error: any) {
                    console.error('Error uploading image:', error)
                    Alert.alert('Error', error.response?.data?.message || 'Failed to upload image. Please try again.')
                } finally {
                    setUploading(false)
                }
            }
        } catch (error: any) {
            console.error('Error picking image:', error)
            Alert.alert('Error', 'Failed to pick image. Please try again.')
            setUploading(false)
        }
    }

    // Show image upload options - Only Logo and Cover
    const showImageUploadOptions = () => {
        Alert.alert(
            'Upload Image',
            'Choose image type to upload',
            [
                { text: 'Logo', onPress: () => handleImageUpload('logo') },
                { text: 'Cover', onPress: () => handleImageUpload('cover') },
                { text: 'Cancel', style: 'cancel' },
            ]
        )
    }

    // Wrap tab bar functions in functions that can be called from worklet
    const handleShowTabBar = () => {
        showTabBar()
    }

    const handleHideTabBar = () => {
        hideTabBar()
    }

    const gesture = Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-10, 10]) // Fail if horizontal movement is detected first
        .onStart(() => {
            hasCalledShowTabBar.value = false
            hasCalledHideTabBar.value = false
        })
        .onUpdate((e) => {
            // Only update if vertical movement is significant
            if (Math.abs(e.translationY) > Math.abs(e.translationX)) {
                translateY.value = Math.max(-40, Math.min(e.translationY, 0))
                
                // Swipe up (negative translationY) - hide tab bar
                if (e.translationY < -10 && !hasCalledHideTabBar.value) {
                    hasCalledHideTabBar.value = true
                    hasCalledShowTabBar.value = false
                    runOnJS(handleHideTabBar)()
                }
                // Swipe down (positive translationY or back to 0) - show tab bar
                else if (e.translationY > -5 && !hasCalledShowTabBar.value && hasCalledHideTabBar.value) {
                    hasCalledShowTabBar.value = true
                    hasCalledHideTabBar.value = false
                    runOnJS(handleShowTabBar)()
                }
            }
        })
        .onEnd(() => {
            // Reset position with spring animation
            translateY.value = withSpring(0, {
                damping: 15,
                stiffness: 150
            })
            
            // If card is back to original position, show tab bar
            if (hasCalledHideTabBar.value) {
                hasCalledShowTabBar.value = false
                hasCalledHideTabBar.value = false
                runOnJS(handleShowTabBar)()
            } else {
                hasCalledShowTabBar.value = false
                hasCalledHideTabBar.value = false
            }
        })
    const rnCarouselStyle = useAnimatedStyle(() => {

        const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width

        ]

        const scale = interpolate(
            translateY.value,
            [-40, 0],
            [1, 0.8],
            Extrapolate.CLAMP)

        const borderRadius = interpolate(
            translateY.value,
            [-40, 0],
            [0, 20],
            Extrapolate.CLAMP)

        const scaleX = interpolate(
            scrollX.value, // 0 - 1206
            inputRange, //[-402, 0, 402]
            [0.8, 1, 0.8],
            Extrapolate.CLAMP
        );// ei ScaleX kaj korbe jokhon
        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.5, 1, 0.5],
            Extrapolate.CLAMP

        )
        const finalScale = scaleX * scale
        return {
            transform: [{ scale: finalScale }],
            borderRadius: borderRadius,
            opacity: opacity
        }

    })

    const rnQranimated = useAnimatedStyle(()=>{
        const transform = interpolate(
            translateY.value,
            [-40, 0],
            [150, 0]
        )

        return{
            transform:[
                {translateY:transform}
            ]
        }
    })


    return (

        <GestureDetector gesture={gesture}>
            <View style={styles.container}>
                <Animated.View style={[styles.qrCard, rnQranimated, { 
                    borderColor: originalCardBgColor, 
                    borderWidth: 2, 
                    backgroundColor: colors.input,
                    shadowColor: isDark ? '#000000' : '#000000'
                }]}>
                    {cardData.qrImage ? (
                        <Image 
                            source={{ uri: cardData.qrImage }} 
                            style={styles.qrCodeImage}
                            resizeMode="contain"
                        />
                    ) : null}
                </Animated.View>
                <Animated.View style={[styles.cardContainer, rnCarouselStyle, { 
                    backgroundColor: cardBgColor,
                    shadowColor: isDark ? '#000000' : '#000000'
                }]} >
                    <View style={styles.cardContent}>
                        {/* Top Header Section with Brand Color */}
                        <View style={[styles.headerSection, { backgroundColor: originalCardBgColor }]}>
                            {/* Cover Image Background - Full Width and Height */}
                            {getImageUri('cover') ? (
                                <View style={styles.coverContainer}>
                                    <Image 
                                        source={{ uri: getImageUri('cover') || '' }} 
                                        style={styles.coverImage}
                                        resizeMode="cover"
                                        onError={(error) => {
                                            console.error('❌ Cover image load error:', error.nativeEvent.error)
                                        }}
                                        onLoad={() => {
                                            console.log('✅ Cover image loaded successfully')
                                        }}
                                    />
                                    {/* Overlay for better content visibility */}
                                    <View style={styles.coverOverlay} />
                                </View>
                            ) : null}
                            
                            <TouchableOpacity 
                                style={styles.imageUploadButton}
                                onPress={showImageUploadOptions}
                                disabled={uploading}
                                activeOpacity={0.7}
                            >
                                {uploading ? (
                                    <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                                ) : (
                                    <MaterialCommunityIcons name="camera-plus" size={20} color={colors.buttonPrimaryText} />
                                )}
                            </TouchableOpacity>
                            
                            <View style={styles.headerContent}>
                                {/* Logo - Show default SalonX logo if no logo */}
                                <TouchableOpacity 
                                    style={styles.logoContainer}
                                    onPress={showImageUploadOptions}
                                    activeOpacity={0.8}
                                >
                                    {getImageUri('logo') ? (
                                        <Image 
                                            source={{ uri: getImageUri('logo') }} 
                                            style={styles.logoImage}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <Image 
                                            source={require('@/assets/images/salonx-logo.png')}
                                            style={styles.logoImage}
                                            resizeMode="contain"
                                        />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Main Content Section */}
                        <View style={styles.contentSection}>
                            {/* Full Name */}
                            {fullName && (
                                <Text style={[styles.fullName, { color: textColor }]}>{fullName}</Text>
                            )}

                            {/* Designation */}
                            {jobTitle && (
                                <Text style={[styles.designation, { color: secondaryTextColor }]}>{jobTitle}</Text>
                            )}

                            {/* Company Name */}
                            {companyName && (
                                <Text style={[styles.companyName, { color: secondaryTextColor }]}>{companyName}</Text>
                            )}

                            {/* Contact Actions */}
                            <View style={styles.contactActionsContainer}>
                                {/* Phone Number */}
                                {cardPhone && (
                                    <TouchableOpacity 
                                        style={[styles.contactActionItem, {
                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                            shadowColor: isDark ? '#000000' : '#000000',
                                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                        }]}
                                        onPress={handlePhonePress}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.contactIconContainer, { backgroundColor: `${originalCardBgColor}15` }]}>
                                            <MaterialCommunityIcons name="phone" size={22} color={originalCardBgColor} />
                                        </View>
                                        <View style={styles.contactActionContent}>
                                            <Text style={[styles.contactActionLabel, { color: secondaryTextColor }]}>Phone</Text>
                                            <Text style={[styles.contactActionValue, { color: textColor }]}>{cardPhone}</Text>
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={secondaryTextColor} />
                                    </TouchableOpacity>
                                )}

                                {/* Email */}
                                {cardEmail && (
                                    <TouchableOpacity 
                                        style={[styles.contactActionItem, {
                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                            shadowColor: isDark ? '#000000' : '#000000',
                                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                        }]}
                                        onPress={handleEmailPress}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.contactIconContainer, { backgroundColor: `${originalCardBgColor}15` }]}>
                                            <MaterialCommunityIcons name="email" size={22} color={originalCardBgColor} />
                                        </View>
                                        <View style={styles.contactActionContent}>
                                            <Text style={[styles.contactActionLabel, { color: secondaryTextColor }]}>Email</Text>
                                            <Text style={[styles.contactActionValue, { color: textColor }]} numberOfLines={1}>{cardEmail}</Text>
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={secondaryTextColor} />
                                    </TouchableOpacity>
                                )}

                                {/* Website */}
                                {websiteLink && (
                                    <TouchableOpacity 
                                        style={[styles.contactActionItem, {
                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                            shadowColor: isDark ? '#000000' : '#000000',
                                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                        }]}
                                        onPress={handleWebsitePress}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.contactIconContainer, { backgroundColor: `${originalCardBgColor}15` }]}>
                                            <MaterialCommunityIcons name="web" size={22} color={originalCardBgColor} />
                                        </View>
                                        <View style={styles.contactActionContent}>
                                            <Text style={[styles.contactActionLabel, { color: secondaryTextColor }]}>Website</Text>
                                            <Text style={[styles.contactActionValue, { color: originalCardBgColor }]} numberOfLines={1}>
                                                Visit our website
                                            </Text>
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={secondaryTextColor} />
                                    </TouchableOpacity>
                                )}

                                {/* Social Links */}
                                {cardData.socialLinks?.links && cardData.socialLinks.links.filter((link: any) => link.type?.toLowerCase() !== 'website').map((link: any, idx: number) => {
                                    const getSocialIcon = (type: string) => {
                                        const iconType = type.toLowerCase()
                                        switch(iconType) {
                                            case 'linkedin':
                                                return <FontAwesome5 name="linkedin" size={20} color={originalCardBgColor} />
                                            case 'facebook':
                                                return <FontAwesome5 name="facebook" size={20} color={originalCardBgColor} />
                                            case 'twitter':
                                                return <FontAwesome5 name="twitter" size={20} color={originalCardBgColor} />
                                            case 'instagram':
                                                return <FontAwesome5 name="instagram" size={20} color={originalCardBgColor} />
                                            case 'github':
                                                return <FontAwesome5 name="github" size={20} color={originalCardBgColor} />
                                            default:
                                                return <MaterialCommunityIcons name="link" size={20} color={originalCardBgColor} />
                                        }
                                    }
                                    
                                    return (
                                        <TouchableOpacity 
                                            key={idx} 
                                            style={[styles.contactActionItem, {
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                                shadowColor: isDark ? '#000000' : '#000000',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                            }]}
                                            onPress={() => {
                                                const url = link.url.startsWith('http') ? link.url : `https://${link.url}`
                                                Linking.openURL(url)
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.contactIconContainer, { backgroundColor: `${originalCardBgColor}15` }]}>
                                                {getSocialIcon(link.type)}
                                            </View>
                                            <View style={styles.contactActionContent}>
                                                <Text style={[styles.contactActionLabel, { color: secondaryTextColor }]}>
                                                    {link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                                                </Text>
                                                <Text style={[styles.contactActionValue, { color: originalCardBgColor }]} numberOfLines={1}>
                                                    {link.url}
                                                </Text>
                                            </View>
                                            <MaterialCommunityIcons name="chevron-right" size={20} color={secondaryTextColor} />
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        </View>
                    </View>

                    {/* Bottom Fixed Share Button */}
                    <View style={styles.shareButtonContainer}>
                        <TouchableOpacity 
                            style={[styles.shareButton, { 
                                backgroundColor: originalCardBgColor,
                                shadowColor: isDark ? '#000000' : '#000000'
                            }]}
                            onPress={handleShare}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="share-variant" size={22} color={colors.buttonPrimaryText} />
                            <Text style={[styles.shareButtonText, { color: colors.buttonPrimaryText }]}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </GestureDetector>

    )
}

export default CardItem

const styles = StyleSheet.create({
    container: {
      position: "relative",
    },
    cardContainer: {
      width: width,
      height: "100%",
      justifyContent: "flex-start",
      alignItems: "center",
      bottom: -100,
      left: 0,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    cardContent: {
      flex: 1,
      width: "100%",
      paddingBottom: 100, // Space for fixed share button
    },
    headerSection: {
      width: "100%",
      paddingTop: 60,
      paddingBottom: 40,
      minHeight: 300, // Reduced for better proportion
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    },
    headerContent: {
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 2,
    },
    imageUploadButton: {
      position: "absolute",
      top: 20,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    coverContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      zIndex: 0,
    },
    coverImage: {
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
    },
    coverOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.15)",
      zIndex: 1,
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: "center",
      alignItems: "center",
      padding: 15,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    logoImage: {
      width: "100%",
      height: "100%",
    },
    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      borderWidth: 3,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    initialsContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: "center",
      alignItems: "center",
    },
    initialsText: {
      fontSize: 36,
      fontWeight: "bold",
      letterSpacing: 2,
    },
    contentSection: {
      width: "100%",
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 20,
    },
    fullName: {
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 8,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    designation: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 4,
      textAlign: "center",
      letterSpacing: 0.3,
    },
    companyName: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 32,
      textAlign: "center",
      opacity: 0.8,
    },
    contactActionsContainer: {
      width: "100%",
      gap: 12,
    },
    contactActionItem: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      padding: 16,
      marginBottom: 0,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
    },
    contactIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    contactActionContent: {
      flex: 1,
    },
    contactActionLabel: {
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    contactActionValue: {
      fontSize: 16,
      fontWeight: "500",
    },
    shareButtonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      paddingBottom: Platform.OS === "ios" ? 34 : 24,
      paddingTop: 16,
      backgroundColor: "transparent",
    },
    shareButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 16,
      gap: 8,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    shareButtonText: {
      fontSize: 18,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    socialLinksContainer: {
      width: "100%",
      marginTop: 20,
      alignItems: "center",
      paddingHorizontal: 20,
    },
    socialLinkItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      width: "100%",
      maxWidth: width * 0.85,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    socialLinkType: {
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 4,
      textTransform: "capitalize",
      letterSpacing: 0.5,
    },
    socialLinkUrl: {
      fontSize: 13,
      flex: 1,
      flexShrink: 1,
    },
    socialIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    socialLinkTextContainer: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: "600",
      marginBottom: 8,
      textAlign: "center",
    },
    cardEmail: {
      fontSize: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    cardPhone: {
      fontSize: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    cardCompany: {
      fontSize: 18,
      fontWeight: "500",
      marginTop: 10,
      marginBottom: 5,
      textAlign: "center",
    },
    cardDesignation: {
      fontSize: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    cardAddress: {
      fontSize: 14,
      marginTop: 10,
      textAlign: "center",
    },
    cardWebsite: {
      fontSize: 14,
      marginTop: 8,
      textAlign: "center",
    },
    cardBio: {
      fontSize: 14,
      marginTop: 15,
      textAlign: "center",
      fontStyle: "italic",
    },
    qrCodeContainer: {
      marginTop: 20,
      padding: 10,
      borderRadius: 8,
    },
    qrCodeLabel: {
      fontSize: 12,
      textAlign: "center",
    },
    qrCard: {
      position: "absolute",
      zIndex: -2,
      width: "38%",
      aspectRatio: 1,
      alignSelf: "center",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      padding: 10,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    qrCodeImage: {
      width: "100%",
      height: "100%",
    },
    qrCodePlaceholder: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
    },
    qrCodePlaceholderText: {
      fontSize: 24,
      fontWeight: "bold",
    },
  })
  