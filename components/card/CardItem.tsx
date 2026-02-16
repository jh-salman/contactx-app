import { ShareCardModal } from '@/components/ShareCardModal'
import { CardImageLayout } from '@/components/card/CardImageLayout'
import { useTabBar } from '@/context/TabBar'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import React from 'react'
import { Dimensions, Image, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import Animated, {
    Extrapolate,
    clamp,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated'

const { width, height } = Dimensions.get('screen')

const CardItem = ({
    item,
    index,
    scrollX,
    translateY: sharedTranslateY,
}: {
    item: any
    index: number
    scrollX: any
    translateY: any
    safeAreaTop?: number
}) => {
    // keep local state (optional but fine for immediate UI update)
    const [cardData, setCardData] = React.useState(item)
    const [shareModalVisible, setShareModalVisible] = React.useState(false)
    React.useEffect(() => setCardData(item), [item])

    // error handler: invalid url + failed url skip
    const [failedImages, setFailedImages] = React.useState<Set<string>>(new Set())
    const [uploading, setUploading] = React.useState(false)

    const { showTabBar, hideTabBar } = useTabBar()
    const { isDark } = useTheme()
    const colors = useThemeColors()
    const fonts = useThemeFonts()
    const insets = useSafeAreaInsets()

    // Extract card data (handle both personalInfo and personal_info from API)
    const personalInfo = cardData?.personalInfo || cardData?.personal_info || {}
    const firstName = personalInfo?.firstName || personalInfo?.first_name || ''
    const lastName = personalInfo?.lastName || personalInfo?.last_name || ''
    const nameParts = [
      personalInfo?.prefix,
      firstName,
      personalInfo?.middleName || personalInfo?.middle_name,
      lastName,
      personalInfo?.suffix,
    ].filter(Boolean)
    const fullName = nameParts.join(' ').trim() || cardData?.cardTitle || 'No Name'
    const jobTitle = personalInfo?.jobTitle || personalInfo?.job_title || ''
    const companyName = personalInfo?.company || ''
    const preferred = personalInfo?.preferred || ''
    const cardPhone = personalInfo?.phoneNumber || personalInfo?.phone_number || ''
    const cardEmail = personalInfo?.email || ''
    const originalCardBgColor = cardData?.cardColor || '#000000'

    // Image layout - same as create card screen. Parse from API (object, string, or snake_case).
    const rawLayouts = cardData?.imagesAndLayouts ?? cardData?.images_and_layouts
    let layoutValue: string | null = null
    if (rawLayouts != null) {
      if (typeof rawLayouts === 'string') {
        try {
          const parsed = JSON.parse(rawLayouts) as { layout?: string }
          layoutValue = parsed?.layout ?? null
        } catch {
          layoutValue = null
        }
      } else if (typeof rawLayouts === 'object' && rawLayouts !== null && 'layout' in rawLayouts) {
        layoutValue = (rawLayouts as { layout?: string }).layout ?? null
      }
    }
    const imageLayout = (layoutValue || cardData?.imageLayout || null) as
      | 'layout1'
      | 'layout2'
      | 'layout3'
      | 'layout4'
      | 'layout5'
      | 'layout6'
      | 'layout7'
      | null

    // Extract social links (API returns socialLinks.links array)
    const socialLinksData = Array.isArray(cardData?.socialLinks?.links)
      ? cardData.socialLinks.links
      : Array.isArray(cardData?.socialLinks)
        ? cardData.socialLinks
        : []

    // Get image URI helper
    const getImageUri = (type: 'cover' | 'logo' | 'profile') => {
        const imageUrl = cardData?.[type] || ''
        if (!imageUrl || !isValidImageUrl(imageUrl) || failedImages.has(imageUrl)) {
            return null
        }
        return imageUrl
    }

    // Text colors based on card background
    const textColor = isDark ? '#FFFFFF' : '#000000'
    const secondaryTextColor = isDark ? '#CCCCCC' : '#666666'

    // Share handler - open Share Card modal
    const handleShare = () => {
        setShareModalVisible(true)
    }

    // Image upload handler (placeholder - can be implemented later)
    const showImageUploadOptions = () => {
        Alert.alert('Upload Image', 'Image upload functionality can be added here')
    }

    // Get social media icon name (same as CardPreviewModal)
    const getSocialIcon = (platform: string): string => {
        const iconMap: Record<string, string> = {
            phone: 'phone', email: 'email', address: 'map-marker', link: 'link-variant', website: 'web',
            linkedin: 'linkedin', instagram: 'instagram', twitter: 'twitter', x: 'twitter', facebook: 'facebook',
            whatsapp: 'whatsapp', telegram: 'send', github: 'github', youtube: 'youtube', calendly: 'calendar-month',
            threads: 'at', snapchat: 'ghost', tiktok: 'music', yelp: 'store', venmo: 'cash', paypal: 'credit-card-outline',
            cashapp: 'currency-usd', discord: 'controller-classic', signal: 'message-text', skype: 'phone-outline', twitch: 'video',
        }
        return iconMap[platform?.toLowerCase()] || 'link'
    }
    const getSocialLabel = (type: string): string => {
        const labels: Record<string, string> = {
            phone: 'Phone', email: 'Email', address: 'Address', website: 'Company Website', linkedin: 'LinkedIn',
            instagram: 'Instagram', x: 'X', facebook: 'Facebook', whatsapp: 'WhatsApp', telegram: 'Telegram',
            github: 'GitHub', youtube: 'YouTube', calendly: 'Calendly', threads: 'Threads', snapchat: 'Snapchat',
            tiktok: 'TikTok', yelp: 'Yelp', venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', discord: 'Discord',
            signal: 'Signal', skype: 'Skype', twitch: 'Twitch',
        }
        return labels[type?.toLowerCase()] || type || 'Link'
    }
    const getLinkUrl = (link: { type: string; url: string }) => {
        const url = link.url?.trim() || ''
        if (url.startsWith('http') || url.startsWith('tel:') || url.startsWith('mailto:')) return url
        if (link.type === 'email') return `mailto:${url}`
        if (link.type === 'phone') return `tel:${url.replace(/\s/g, '')}`
        if (url && !url.startsWith('http')) return `https://${url}`
        return url
    }

    const MAX_UP = -40
    const MAX_DOWN = 0

    // Card size variables - easily configurable
    const CARD_DOWN_HEIGHT_SCALE = .7  // Card down er height scale
    const CARD_DOWN_WIDTH_SCALE = .7  // Card down er width scale
    const CARD_UP_HEIGHT_SCALE = 1  // Card up er height scale
    const CARD_UP_WIDTH_SCALE = 1    // Card up er width scale

    const translateY = sharedTranslateY
    const startY = useSharedValue(0)

    const hasCalledShowTabBar = useSharedValue(false)
    const hasCalledHideTabBar = useSharedValue(false)

    const isValidImageUrl = (url: string | null | undefined): boolean => {
        if (!url || typeof url !== 'string') return false
        const invalidDomains = ['example.com', 'placeholder.com', 'test.com', 'localhost']
        const lowerUrl = url.toLowerCase()
        return !invalidDomains.some((d) => lowerUrl.includes(d))
    }

    const qrUri =
        cardData?.qrImage && isValidImageUrl(cardData.qrImage) && !failedImages.has(cardData.qrImage)
            ? cardData.qrImage
            : null

    const handleShowTabBar = () => showTabBar()
    const handleHideTabBar = () => hideTabBar()

    const gesture = Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-10, 10])
        .onBegin(() => {
            startY.value = translateY.value
            hasCalledShowTabBar.value = false
            hasCalledHideTabBar.value = false
        })
        .onUpdate((e) => {
            // accumulate drag
            const nextY = clamp(startY.value + e.translationY, MAX_UP, MAX_DOWN)
            translateY.value = nextY

            // tabbar hide/show thresholds
            // translateY > -5: show tab bar (card down)
            // translateY <= -5: hide tab bar (card up)
            if (nextY > -5 && !hasCalledShowTabBar.value) {
                hasCalledShowTabBar.value = true
                hasCalledHideTabBar.value = false
                runOnJS(handleShowTabBar)()
            } else if (nextY <= -5 && !hasCalledHideTabBar.value && hasCalledShowTabBar.value) {
                hasCalledHideTabBar.value = true
                hasCalledShowTabBar.value = false
                runOnJS(handleHideTabBar)()
            }
        })
        .onEnd((e) => {

            // snap to top/bottom based on position + velocity
            const shouldSnapTop = translateY.value < -20 || e.velocityY < -600
            const dest = shouldSnapTop ? MAX_UP : MAX_DOWN

            translateY.value = withSpring(dest, { damping: 18, stiffness: 170 })

            // Tab bar hide/show based on final position
            // translateY > -5: show tab bar (card down)
            // translateY <= -5: hide tab bar (card up)
            if (dest > -5) {
                // Card down (dest = 0), show tab bar
                runOnJS(handleShowTabBar)()
                hasCalledShowTabBar.value = false
                hasCalledHideTabBar.value = false
            } else {
                // Card up (dest = -40), hide tab bar
                runOnJS(handleHideTabBar)()
                hasCalledHideTabBar.value = false
                hasCalledShowTabBar.value = false
            }
        })

    const rnCarouselStyle = useAnimatedStyle(() => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width]

        // 0..1 progress (0 = down, 1 = up)
        const progress = interpolate(translateY.value, [MAX_DOWN, MAX_UP], [0, 1], Extrapolate.CLAMP)

        // Card height scale - down and up er variables use kore
        const heightScale = interpolate(progress, [0, 1], [CARD_DOWN_HEIGHT_SCALE, CARD_UP_HEIGHT_SCALE], Extrapolate.CLAMP)

        // carousel horizontal scale (center card bigger)
        const scaleX = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolate.CLAMP)

        // Card width scale - down and up er variables use kore
        const widthScale = interpolate(progress, [0, 1], [CARD_DOWN_WIDTH_SCALE, CARD_UP_WIDTH_SCALE], Extrapolate.CLAMP)

        const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolate.CLAMP)
        // Card down: borderRadius 20, Card up: borderRadius 0
        const borderRadius = interpolate(progress, [0, 1], [20, 0], Extrapolate.CLAMP)

        // combined scale - height and width use variables
        // clamp to max 1.0 to ensure card width never exceeds screen width
        const finalHeightScale = clamp(heightScale, 0, 1.0)
        const finalWidthScale = clamp(scaleX * widthScale, 0, 1.0)

        // Card down => bottom fixed, current size (scale 1)
        // Card up => scale up, no translateY needed
        const translateYUp = interpolate(progress, [0, 1], [0, 0], Extrapolate.CLAMP)

        return {
            transform: [{ scaleX: finalWidthScale }, { scaleY: finalHeightScale }, { translateY: translateYUp }],
            borderRadius,
            opacity,
        }
    })

    // Content scale removed - font and content default size (no scaling)
    const rnContentStyle = useAnimatedStyle(() => {
        // No scaling - everything stays default size
        return {
            transform: [{ scale: 1 }],
        }
    })

    // Cover image border radius - top left and top right corners only
    // Same borderRadius as card (20 when down, 0 when up)
    const rnCoverWrapStyle = useAnimatedStyle(() => {
        const progress = interpolate(translateY.value, [MAX_DOWN, MAX_UP], [0, 1], Extrapolate.CLAMP)
        const borderRadius = interpolate(progress, [0, 1], [20, 0], Extrapolate.CLAMP)
        
        return {
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
        }
    })

    // Share button bottom position - card down: 40, card up: 0
    const rnShareBtn2Style = useAnimatedStyle(() => {
        const progress = interpolate(translateY.value, [MAX_DOWN, MAX_UP], [0, 1], Extrapolate.CLAMP)
        const bottom = interpolate(progress, [0, 1], [40, -10], Extrapolate.CLAMP)
        
        return {
            bottom,
        }
    })

    // Share button container background
    // Card up: screen bottom to share button container, full width, screen height 8%, opacity 0.5
    // Card down: share button container er bg, opacity 0.1
    const rnShareBtnBgStyle = useAnimatedStyle(() => {
        const progress = interpolate(translateY.value, [MAX_DOWN, MAX_UP], [0, 1], Extrapolate.CLAMP)
        
        // Card up: full width, Card down: match button width
        const bgWidth = interpolate(progress, [0, 1], [buttonWidthDown, width], Extrapolate.CLAMP)
        
        // Card up: screen height 8%, Card down: match button height
        const bgHeight = interpolate(progress, [0, 1], [buttonHeight, height * 0.08], Extrapolate.CLAMP)
        
        // Card up: opacity 0.5, Card down: opacity 0.1
        const bgOpacity = interpolate(progress, [0, 1], [0.1, 0.5], Extrapolate.CLAMP)
        
        // Card up: screen bottom (0), Card down: match button container position
        // Button container when down is at: tabBarHeight + spacingDown + safeAreaBottom
        const buttonContainerBottomDown = tabBarHeight + spacingDown + safeAreaBottom
        const bgBottom = interpolate(progress, [0, 1], [buttonContainerBottomDown, 0], Extrapolate.CLAMP)
        
        // Card down: centered, Card up: left edge
        const bgLeft = interpolate(progress, [0, 1], [(width - buttonWidthDown) / 2, 0], Extrapolate.CLAMP)
        
        return {
            width: bgWidth,
            height: bgHeight,
            opacity: bgOpacity,
            bottom: bgBottom,
            left: bgLeft,
            position: 'absolute',
            zIndex: -1, // Behind the button
        }
    })

    const rnQranimated = useAnimatedStyle(() => {
        const progress = interpolate(translateY.value, [MAX_DOWN, MAX_UP], [0, 1], Extrapolate.CLAMP)

        // card down => QR visible and up, card up => QR hide (goes down and fades)
        // QR div 5% down + Y animation
        const baseDown = height * 0.05 // 5% down
        const tY = interpolate(progress, [0, 1], [baseDown, baseDown + 150], Extrapolate.CLAMP)
        const opacity = interpolate(progress, [0, 1], [1, 0], Extrapolate.CLAMP)
        const scale = interpolate(progress, [0, 1], [1, 0.9], Extrapolate.CLAMP)

        // QR box X position fixed - scrollX e move hobe na, only Y animation
        // No translateX, QR div fixed in X direction

        return {
            opacity,
            transform: [{ translateY: tY }, { scale }],
        }
    })

    // Responsive values calculated outside animated style for better performance
    // Responsive tab bar height (screen height er 8-10%)
    const tabBarHeight = Math.max(60, height * 0.09)
    
    // Safe area bottom inset
    const safeAreaBottom = insets.bottom
    
    // Responsive spacing based on screen size
    const spacingDown = Math.max(12, height * 0.02) // Card down spacing
    const spacingUp = Math.max(2, height * 0.003) // Card up spacing (2px minimum)
    
    // Card down => small rounded pill button (40% width, minimum 140px)
    const minButtonWidth = Math.min(140, width * 0.35)
    const buttonWidthDown = Math.max(minButtonWidth, width * 0.4)
    
    // Responsive border radius
    const borderRadiusDown = Math.max(20, Math.min(28, width * 0.06)) // 20-28px range
    const borderRadiusUp = Math.max(8, Math.min(16, width * 0.03)) // 8-16px range
    
    // Responsive button height, padding, font sizes
    const buttonHeight = Math.max(44, Math.min(56, height * 0.07))
    const buttonPaddingH = Math.max(20, Math.min(28, width * 0.06))
    const buttonPaddingV = Math.max(10, Math.min(14, height * 0.015))
    const iconSize = Math.max(16, Math.min(20, width * 0.045))
    const fontSize = Math.max(14, Math.min(18, width * 0.04))
    const textMarginLeft = Math.max(6, Math.min(10, width * 0.02))

    // Share button animation - screen er bottom e absolute positioned
    // SafeAreaView er bottom theke upore thakbe
    // Card down: choto rounded pill button, centered above tab bar
    // Card up: full width, tab bar theke 2px upore, border radius thakbe
    // Only width changes, height/text/icon size fixed
    // Responsive for all devices
    const rnShareButtonStyle = useAnimatedStyle(() => {
        const progress = interpolate(translateY.value, [MAX_DOWN, MAX_UP], [0, 1], Extrapolate.CLAMP)
        
        // Card down => small rounded pill button, Card up => full width
        // Only width changes, height remains fixed
        const buttonWidth = interpolate(progress, [0, 1], [buttonWidthDown, width], Extrapolate.CLAMP)
        
        // Card down: above tab bar with spacing, Card up: tab bar theke 2px upore
        // SafeAreaView er bottom theke upore thakbe
        const buttonBottom = interpolate(progress, [0, 1], [tabBarHeight + spacingDown + safeAreaBottom, tabBarHeight + spacingUp + safeAreaBottom], Extrapolate.CLAMP)
        
        // Card down: centered, Card up: left edge
        const buttonLeft = interpolate(progress, [0, 1], [(width - buttonWidthDown) / 2, 0], Extrapolate.CLAMP)
        
        // Responsive border radius
        const buttonBorderRadius = interpolate(progress, [0, 1], [borderRadiusDown, borderRadiusUp], Extrapolate.CLAMP)

        return {
            width: buttonWidth,
            left: buttonLeft,
            bottom: buttonBottom,
            borderRadius: buttonBorderRadius,
            position: 'absolute',
        }
    })

    return (
        <GestureDetector gesture={gesture}>
            <View>
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.qrCard,
                        rnQranimated,
                        {
                            backgroundColor: colors.input,
                            shadowColor: isDark ? '#000000' : '#000000',
                            borderWidth: 2,
                            borderColor: colors.placeholder,
                        },
                    ]}
                >
                    {qrUri ? (
                        <Image
                            source={{ uri: qrUri }}
                            style={styles.qrCodeImage}
                            resizeMode="contain"
                            onError={() => {
                                // error handler: mark as failed so we don't keep retrying
                                setFailedImages((prev) => {
                                    const next = new Set(prev)
                                    next.add(qrUri)
                                    return next
                                })
                            }}
                        />
                    ) : null}
                </Animated.View>

                <Animated.View
                    style={[
                        styles.cardContainer,
                        rnCarouselStyle,
                        {
                            backgroundColor: colors.input,
                            shadowColor: isDark ? '#000000' : '#000000',
                        },
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.coverWrap,
                            rnCoverWrapStyle,
                            {
                                backgroundColor: originalCardBgColor,
                                height: width * 0.55,
                                overflow: 'visible',
                            },
                        ]}
                    >
                        <CardImageLayout
                            layout={imageLayout ?? null}
                            profile={getImageUri('profile')}
                            logo={getImageUri('logo')}
                            cover={getImageUri('cover')}
                            cardColor={originalCardBgColor}
                            height={width * 0.55}
                            onImageError={(url) => {
                                setFailedImages((prev) => {
                                    const next = new Set(prev)
                                    next.add(url)
                                    return next
                                })
                            }}
                        />
                        {/* Dark overlay for readability */}
                        <View style={styles.coverOverlay} pointerEvents="box-none" />
                        {/* Action button above overlay */}
                        <TouchableOpacity
                            style={[styles.coverActionBtn, { zIndex: 10 }]}
                            onPress={showImageUploadOptions}
                            disabled={uploading}
                            activeOpacity={0.75}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <MaterialCommunityIcons name="camera-plus" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Body - same design as CardPreviewModal */}
                    <Animated.View
                        style={[
                            styles.cardDesignContent,
                            rnContentStyle,
                            ['layout5', 'layout6', 'layout7'].includes(imageLayout || '') && {
                                paddingTop: 28,
                            },
                        ]}
                    >
                        {/* Profile section */}
                        <Text style={[styles.profileName, { color: textColor, fontFamily: fonts.bold }]} numberOfLines={1}>
                            {fullName}
                        </Text>
                        {!!jobTitle && (
                            <Text style={[styles.profileTitle, { color: textColor, fontFamily: fonts.medium }]} numberOfLines={1}>
                                {jobTitle}
                            </Text>
                        )}
                        {!!companyName && (
                            <Text style={[styles.profileCompany, { color: textColor, fontFamily: fonts.regular }]} numberOfLines={1}>
                                {companyName}
                            </Text>
                        )}
                        {!!preferred && (
                            <Text style={[styles.profileTagline, { color: secondaryTextColor, fontFamily: fonts.regular }]} numberOfLines={1}>
                                {preferred}
                            </Text>
                        )}

                        {/* Contact section - Email, Phone, Social links with icons (CardPreview style) */}
                        <View style={styles.contactSection}>
                            {!!cardEmail && (
                                <TouchableOpacity
                                    style={[styles.contactRowCard, { borderBottomColor: colors.border }]}
                                    onPress={() => Linking.openURL(`mailto:${cardEmail}`).catch(() => {})}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.contactIconCard, { backgroundColor: originalCardBgColor }]}>
                                        <MaterialCommunityIcons name="email-outline" size={20} color="#fff" />
                                    </View>
                                    <View style={styles.contactTextWrap}>
                                        <Text style={[styles.contactLabelCard, { color: secondaryTextColor, fontFamily: fonts.regular }]}>Email</Text>
                                        <Text style={[styles.contactTextCard, { color: textColor, fontFamily: fonts.medium }]} numberOfLines={1}>
                                            {cardEmail}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {!!cardPhone && (
                                <TouchableOpacity
                                    style={[styles.contactRowCard, { borderBottomColor: colors.border }]}
                                    onPress={() => Linking.openURL(`tel:${cardPhone.replace(/\s/g, '')}`).catch(() => {})}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.contactIconCard, { backgroundColor: originalCardBgColor }]}>
                                        <MaterialCommunityIcons name="phone-outline" size={20} color="#fff" />
                                    </View>
                                    <View style={styles.contactTextWrap}>
                                        <Text style={[styles.contactLabelCard, { color: secondaryTextColor, fontFamily: fonts.regular }]}>Phone</Text>
                                        <Text style={[styles.contactTextCard, { color: textColor, fontFamily: fonts.medium }]} numberOfLines={1}>
                                            {cardPhone}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {Array.isArray(socialLinksData) && socialLinksData.map((link: any, idx: number) => {
                                if (!link?.url && !link?.platform && !link?.type) return null
                                const platform = (link.platform || link.type)?.toLowerCase() || ''
                                const iconName = getSocialIcon(platform)
                                const platformLabel = getSocialLabel(platform)
                                const displayText = link.url || link.label || platform || 'Link'
                                const url = getLinkUrl(link)
                                const subLabel = link.label && link.label !== platformLabel ? link.label : null
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.contactRowCard, { borderBottomColor: colors.border }]}
                                        onPress={() => url && Linking.openURL(url).catch(() => {})}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.contactIconCard, { backgroundColor: originalCardBgColor }]}>
                                            <MaterialCommunityIcons name={iconName as any} size={20} color="#fff" />
                                        </View>
                                        <View style={styles.contactTextWrap}>
                                            <Text style={[styles.contactLabelCard, { color: secondaryTextColor, fontFamily: fonts.regular }]}>
                                                {platformLabel}
                                            </Text>
                                            <Text style={[styles.contactTextCard, { color: textColor, fontFamily: fonts.medium }]} numberOfLines={1}>
                                                {displayText}
                                            </Text>
                                            {subLabel && subLabel !== displayText && (
                                                <Text style={[styles.contactSubLabelCard, { color: secondaryTextColor, fontFamily: fonts.regular }]} numberOfLines={1}>
                                                    {subLabel}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </Animated.View>
                </Animated.View>

                {/* Share button container background */}
                <Animated.View 
                    style={[
                        rnShareBtnBgStyle,
                        {
                            backgroundColor: originalCardBgColor,
                        }
                    ]}
                />

                {/* Share button - screen er bottom e absolute positioned, only width changes */}
                <Animated.View style={rnShareButtonStyle}>
                    <Animated.View 
                        style={[
                            styles.shareBtn2,
                            rnShareBtn2Style,
                            { 
                                backgroundColor: originalCardBgColor,
                                height: buttonHeight,
                                paddingHorizontal: buttonPaddingH,
                                paddingVertical: buttonPaddingV,
                            }
                        ]}
                    >
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                            }}
                            onPress={handleShare}
                            activeOpacity={0.85}
                        >
                            <MaterialCommunityIcons 
                                name="send" 
                                size={iconSize} 
                                color="#fff" 
                            />
                            <Text style={[
                                styles.shareBtnText2,
                                {
                                    fontSize: fontSize,
                                    marginLeft: textMarginLeft,
                                }
                            ]}>Share</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </View>

            <ShareCardModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                cardData={cardData}
            />
            </View>
        </GestureDetector>
    )
}

export default CardItem

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        justifyContent: 'flex-start',
        bottom: -81,
    },
    cardContainer: {
        width,
        height: '100%',
        left: 0,
        overflow: 'visible',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    qrCard: {
        position: 'absolute',
        top: -59,
        zIndex: -2,
        width: '30%',
        aspectRatio: 1,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        padding: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 1,
    },
    qrCodeImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    coverWrap: {
        width: '100%',
        height: '40%',
        position: 'relative',
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    coverActionBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardDesignContent: {
        flex: 1,
        minHeight: 180,
        padding: 20,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    profileTitle: {
        fontSize: 16,
        marginBottom: 2,
    },
    profileCompany: {
        fontSize: 16,
        marginBottom: 2,
    },
    profileTagline: {
        fontSize: 14,
        marginTop: 4,
    },
    contactSection: {
        marginTop: 12,
        width: '100%',
    },
    contactRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    contactIconCard: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contactTextWrap: {
        flex: 1,
    },
    contactLabelCard: {
        fontSize: 12,
        marginBottom: 2,
    },
    contactTextCard: {
        fontSize: 15,
        fontWeight: '500',
    },
    contactSubLabelCard: {
        fontSize: 11,
        marginTop: 2,
    },
    shareBtn2: {
        position: 'absolute',
        // bottom will be animated (40 when down, 0 when up)
        // left: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        borderRadius: 40,
        width: '95%',
    },
    shareBtnText2: {
        color: '#fff',
        fontWeight: '600',
    },
})
