import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CardImageLayout } from '@/components/card/CardImageLayout'
import { moderateScale } from 'react-native-size-matters'
import { useThemeColors, useThemeFonts } from '@/context/ThemeContext'

const MS = moderateScale
const { width: SCREEN_WIDTH } = Dimensions.get('screen')

type ImageLayoutId = 'layout1' | 'layout2' | 'layout3' | 'layout4' | 'layout5' | 'layout6' | 'layout7' | null

export type CardPreviewFormData = {
  cardTitle: string
  firstName: string
  lastName: string
  middleName?: string
  prefix?: string
  suffix?: string
  jobTitle: string
  company: string
  phoneNumber: string
  email: string
  cardColor: string
  logo: string
  profile: string
  cover: string
  imageLayout: ImageLayoutId
  socialLinks: Array<{ type: string; url: string; label?: string }>
  preferred?: string
  maidenName?: string
}

type CardPreviewModalProps = {
  visible: boolean
  onClose: () => void
  formData: CardPreviewFormData
}

const getSocialIcon = (platform: string): string => {
  const iconMap: Record<string, string> = {
    phone: 'phone',
    email: 'email',
    address: 'map-marker',
    link: 'link-variant',
    website: 'web',
    linkedin: 'linkedin',
    instagram: 'instagram',
    twitter: 'twitter',
    x: 'twitter',
    facebook: 'facebook',
    whatsapp: 'whatsapp',
    telegram: 'send',
    github: 'github',
    youtube: 'youtube',
    calendly: 'calendar-month',
    threads: 'at',
    snapchat: 'ghost',
    tiktok: 'music',
    yelp: 'store',
    venmo: 'cash',
    paypal: 'credit-card-outline',
    cashapp: 'currency-usd',
    discord: 'controller-classic',
    signal: 'message-text',
    skype: 'phone-outline',
    twitch: 'video',
  }
  return iconMap[platform?.toLowerCase()] || 'link'
}

const getSocialLabel = (type: string): string => {
  const labels: Record<string, string> = {
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    website: 'Company Website',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    x: 'X',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    github: 'GitHub',
    youtube: 'YouTube',
    calendly: 'Calendly',
    threads: 'Threads',
    snapchat: 'Snapchat',
    tiktok: 'TikTok',
    yelp: 'Yelp',
    venmo: 'Venmo',
    paypal: 'PayPal',
    cashapp: 'Cash App',
    discord: 'Discord',
    signal: 'Signal',
    skype: 'Skype',
    twitch: 'Twitch',
  }
  return labels[type?.toLowerCase()] || type || 'Link'
}

export const CardPreviewModal: React.FC<CardPreviewModalProps> = ({
  visible,
  onClose,
  formData,
}) => {
  const colors = useThemeColors()
  const fonts = useThemeFonts()

  const nameParts = [
    formData.prefix,
    formData.firstName,
    formData.middleName,
    formData.lastName,
    formData.suffix,
  ].filter(Boolean)
  const fullName = nameParts.join(' ').trim() || formData.cardTitle || 'No Name'
  const accentColor = formData.cardColor || '#E07A5F'

  const handleLinkPress = (url: string) => {
    if (url && (url.startsWith('http') || url.startsWith('tel:') || url.startsWith('mailto:'))) {
      Linking.openURL(url).catch(() => {})
    } else if (url && url.includes('@')) {
      Linking.openURL(`mailto:${url}`).catch(() => {})
    } else if (url && /^\+?[\d\s-]+$/.test(url)) {
      Linking.openURL(`tel:${url.replace(/\s/g, '')}`).catch(() => {})
    }
  }

  const getLinkUrl = (link: { type: string; url: string }) => {
    const url = link.url?.trim() || ''
    if (url.startsWith('http') || url.startsWith('tel:') || url.startsWith('mailto:')) return url
    if (link.type === 'email') return `mailto:${url}`
    if (link.type === 'phone') return `tel:${url.replace(/\s/g, '')}`
    if (url && !url.startsWith('http')) return `https://${url}`
    return url
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <MaterialCommunityIcons name="arrow-left" size={MS(24)} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: fonts.medium, fontSize: MS(18), color: colors.text }]}>Card Preview</Text>
          <View style={{ width: MS(24) }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover / Logo area - reference image style */}
          <View style={[styles.coverWrap, { backgroundColor: accentColor }]}>
            <CardImageLayout
              layout={formData.imageLayout}
              profile={formData.profile?.trim() || null}
              logo={formData.logo?.trim() || null}
              cover={formData.cover?.trim() || null}
              cardColor={accentColor}
              height={SCREEN_WIDTH * 0.45}
            />
          </View>

          {/* Profile section - reference: Name, Title, Company, Tagline */}
          <View style={[styles.profileSection, { backgroundColor: colors.background }]}>
            <Text style={[styles.nameText, { color: colors.text, fontFamily: fonts.bold }]} numberOfLines={1}>
              {fullName}
            </Text>
            {!!formData.jobTitle && (
              <Text style={[styles.titleText, { color: colors.text, fontFamily: fonts.medium }]} numberOfLines={1}>
                {formData.jobTitle}
              </Text>
            )}
            {!!formData.company && (
              <Text style={[styles.companyText, { color: colors.text, fontFamily: fonts.regular }]} numberOfLines={1}>
                {formData.company}
              </Text>
            )}
            {!!formData.preferred && (
              <Text style={[styles.taglineText, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={1}>
                {formData.preferred}
              </Text>
            )}
          </View>

          {/* Contact section - Phone, Email, all social links with icons */}
          <View style={[styles.contactSection, { backgroundColor: colors.background }]}>
            {!!formData.email && (
              <TouchableOpacity
                style={[styles.contactRow, { borderBottomColor: colors.border }]}
                onPress={() => handleLinkPress(`mailto:${formData.email}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIcon, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="email-outline" size={MS(22)} color="#fff" />
                </View>
                <View style={styles.contactTextWrap}>
                  <Text style={[styles.contactLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Email</Text>
                  <Text style={[styles.contactText, { color: colors.text, fontFamily: fonts.medium }]} numberOfLines={1}>
                    {formData.email}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {!!formData.phoneNumber && (
              <TouchableOpacity
                style={[styles.contactRow, { borderBottomColor: colors.border }]}
                onPress={() => handleLinkPress(`tel:${formData.phoneNumber.replace(/\s/g, '')}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIcon, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="phone-outline" size={MS(22)} color="#fff" />
                </View>
                <View style={styles.contactTextWrap}>
                  <Text style={[styles.contactLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Phone</Text>
                  <Text style={[styles.contactText, { color: colors.text, fontFamily: fonts.medium }]} numberOfLines={1}>
                    {formData.phoneNumber}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {formData.socialLinks.map((link: any, index: number) => {
              if (!link?.url && !link?.platform && !link?.type) return null
              const platform = (link.platform || link.type)?.toLowerCase() || ''
              const iconName = getSocialIcon(platform)
              const platformLabel = getSocialLabel(platform)
              const displayText = link.url || link.label || platform || 'Link'
              const url = getLinkUrl(link)
              const subLabel = link.label && link.label !== platformLabel ? link.label : null

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.contactRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleLinkPress(url)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.contactIcon, { backgroundColor: accentColor }]}>
                    <MaterialCommunityIcons name={iconName as any} size={MS(22)} color="#fff" />
                  </View>
                  <View style={styles.contactTextWrap}>
                    <Text style={[styles.contactLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                      {platformLabel}
                    </Text>
                    <Text style={[styles.contactText, { color: colors.text, fontFamily: fonts.medium }]} numberOfLines={1}>
                      {displayText}
                    </Text>
                    {subLabel && subLabel !== displayText && (
                      <Text style={[styles.contactSubLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={1}>
                        {subLabel}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: MS(16),
    paddingVertical: MS(12),
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: MS(18),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: MS(32),
  },
  coverWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  profileSection: {
    paddingHorizontal: MS(20),
    paddingTop: MS(20),
    paddingBottom: MS(16),
    alignItems: 'flex-start',
  },
  nameText: {
    fontSize: MS(24),
    fontWeight: 'bold',
    marginBottom: MS(4),
  },
  titleText: {
    fontSize: MS(16),
    marginBottom: MS(2),
  },
  companyText: {
    fontSize: MS(16),
    marginBottom: MS(2),
  },
  taglineText: {
    fontSize: MS(14),
    marginTop: MS(4),
  },
  contactSection: {
    paddingHorizontal: MS(20),
    paddingTop: MS(8),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: MS(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactIcon: {
    width: MS(40),
    height: MS(40),
    borderRadius: MS(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MS(12),
  },
  contactTextWrap: {
    flex: 1,
  },
  contactText: {
    fontSize: MS(15),
    fontWeight: '500',
  },
  contactLabel: {
    fontSize: MS(12),
    marginBottom: MS(2),
    color: '#888',
  },
  contactSubLabel: {
    fontSize: MS(11),
    marginTop: MS(2),
  },
})
