import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { showSuccess, showError, showWarning } from '@/lib/toast'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { API_BASE_URL } from '@/config/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { moderateScale } from 'react-native-size-matters'

const MS = moderateScale
const OFFLINE_SHARE_KEY = 'contactx_share_offline'

const SHARE_BASE_URL = 'https://contactx-web-app.vercel.app'

type ShareOption = {
  id: string
  label: string
  icon: string
  color?: string
  isToggle?: boolean
}

const SHARE_OPTIONS: ShareOption[] = [
  { id: 'offline', label: 'Share card offline', icon: 'wifi-off', isToggle: true },
  { id: 'copy', label: 'Copy link', icon: 'content-copy' },
  { id: 'text', label: 'Text your card', icon: 'message-text' },
  { id: 'email', label: 'Email your card', icon: 'email' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: 'whatsapp', color: '#25D366' },
  { id: 'linkedin', label: 'Send via LinkedIn', icon: 'linkedin', color: '#0A66C2' },
  { id: 'another', label: 'Send another way', icon: 'dots-horizontal' },
  { id: 'post-linkedin', label: 'Post to LinkedIn', icon: 'linkedin', color: '#0A66C2' },
  { id: 'post-facebook', label: 'Post to Facebook', icon: 'facebook', color: '#1877F2' },
  { id: 'save-qr', label: 'Save QR code to photos', icon: 'image-multiple' },
  { id: 'send-qr', label: 'Send QR code', icon: 'send' },
  { id: 'wallet', label: 'Add card to wallet', icon: 'wallet' },
]

interface ShareCardModalProps {
  visible: boolean
  onClose: () => void
  cardData: any
}

export function ShareCardModal({ visible, onClose, cardData }: ShareCardModalProps) {
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [offlineShare, setOfflineShare] = useState(false)

  const cardId = cardData?.id || cardData?._id
  const qrUri = cardData?.qrImage
  const cardLink = cardId ? `${SHARE_BASE_URL}/card/${cardId}` : ''

  React.useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(OFFLINE_SHARE_KEY).then((v) => setOfflineShare(v === 'true'))
    }
  }, [visible])

  const handleOfflineToggle = (value: boolean) => {
    setOfflineShare(value)
    AsyncStorage.setItem(OFFLINE_SHARE_KEY, value ? 'true' : 'false')
    showSuccess(value ? 'Offline sharing enabled' : 'Offline sharing disabled')
  }

  const handleCopyLink = async () => {
    if (!cardLink) {
      showError('Error', 'Card link not available')
      return
    }
    try {
      await Share.share({ message: cardLink, url: cardLink })
      showSuccess('Link ready', 'Use Copy from the share menu to copy the link')
    } catch (e: any) {
      showError('Error', e?.message ?? 'Could not copy')
    }
  }

  const handleTextCard = () => {
    if (!cardLink) return
    Linking.openURL(`sms:?body=${encodeURIComponent(cardLink)}`).catch(() =>
      showError('Error', 'Could not open Messages')
    )
  }

  const handleEmailCard = () => {
    if (!cardLink) return
    Linking.openURL(`mailto:?body=${encodeURIComponent(cardLink)}`).catch(() =>
      showError('Error', 'Could not open Mail')
    )
  }

  const handleWhatsApp = () => {
    if (!cardLink) return
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(cardLink)}`).catch(() =>
      showError('Error', 'Could not open WhatsApp')
    )
  }

  const handleLinkedIn = () => {
    if (!cardLink) return
    Linking.openURL(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cardLink)}`
    ).catch(() => showError('Error', 'Could not open LinkedIn'))
  }

  const handlePostLinkedIn = () => handleLinkedIn()
  const handlePostFacebook = () => {
    if (!cardLink) return
    Linking.openURL(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cardLink)}`
    ).catch(() => showError('Error', 'Could not open Facebook'))
  }

  const handleSendAnotherWay = async () => {
    if (!cardLink) return
    try {
      await Share.share({ message: cardLink, url: cardLink })
    } catch (e: any) {
      showError('Error', e?.message ?? 'Could not share')
    }
  }

  const handleSaveQR = async () => {
    if (!qrUri) {
      showError('Error', 'QR code not available')
      return
    }
    try {
      await Share.share({ url: qrUri, message: 'My ContactX card QR code' })
      showSuccess('QR code', 'Use Save Image from the share menu')
    } catch (e: any) {
      showError('Error', e?.message ?? 'Could not save QR code')
    }
  }

  const handleSendQR = async () => {
    if (!qrUri) {
      showError('Error', 'QR code not available')
      return
    }
    try {
      await Share.share({ url: qrUri, message: 'My ContactX card QR code' })
    } catch (e: any) {
      showError('Error', e?.message ?? 'Could not send QR code')
    }
  }

  const handleAddToWallet = () => {
    showWarning('Coming soon', 'Add to wallet will be available in a future update')
  }

  const handleOption = (id: string) => {
    switch (id) {
      case 'copy':
        handleCopyLink()
        break
      case 'text':
        handleTextCard()
        break
      case 'email':
        handleEmailCard()
        break
      case 'whatsapp':
        handleWhatsApp()
        break
      case 'linkedin':
        handleLinkedIn()
        break
      case 'another':
        handleSendAnotherWay()
        break
      case 'post-linkedin':
        handlePostLinkedIn()
        break
      case 'post-facebook':
        handlePostFacebook()
        break
      case 'save-qr':
        handleSaveQR()
        break
      case 'send-qr':
        handleSendQR()
        break
      case 'wallet':
        handleAddToWallet()
        break
    }
  }

  const handleSettings = () => {
    onClose()
    router.push('/settings')
  }

  const padding = {
    top: Math.max(insets.top, 44),
    bottom: Math.max(insets.bottom, 20),
    left: Math.max(insets.left, 16),
    right: Math.max(insets.right, 16),
  }

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background,
      borderTopLeftRadius: MS(20),
      borderTopRightRadius: MS(20),
      maxHeight: Dimensions.get('window').height * 0.9,
      paddingTop: padding.top,
      paddingBottom: padding.bottom,
      paddingHorizontal: padding.left,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: MS(20),
    },
    headerTitle: {
      fontSize: MS(18),
      fontWeight: '600',
      color: colors.text,
    },
    closeBtn: {
      padding: MS(8),
      marginLeft: -MS(8),
    },
    settingsBtn: {
      padding: MS(8),
      marginRight: -MS(8),
    },
    qrSection: {
      alignItems: 'center',
      marginBottom: MS(24),
    },
    qrBox: {
      width: MS(200),
      height: MS(200),
      backgroundColor: '#FFFFFF',
      borderRadius: MS(16),
      padding: MS(12),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: MS(12),
    },
    qrImage: {
      width: '100%',
      height: '100%',
      borderRadius: MS(8),
    },
    qrPlaceholder: {
      width: MS(120),
      height: MS(120),
      backgroundColor: '#EEEEEE',
      borderRadius: MS(8),
      justifyContent: 'center',
      alignItems: 'center',
    },
    instructionText: {
      fontSize: MS(14),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: MS(20),
    },
    optionsList: {
      gap: MS(8),
      paddingBottom: MS(24),
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.input,
      borderRadius: MS(12),
      paddingVertical: MS(14),
      paddingHorizontal: MS(16),
    },
    optionIcon: {
      width: MS(36),
      height: MS(36),
      borderRadius: MS(18),
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: MS(14),
    },
    optionLabel: {
      flex: 1,
      fontSize: MS(16),
      fontWeight: '500',
      color: colors.text,
    },
  })

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={20}>
              <MaterialCommunityIcons name="close" size={MS(24)} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontFamily: fonts.medium }]}>Send Your Card</Text>
            <TouchableOpacity onPress={handleSettings} style={styles.settingsBtn} hitSlop={20}>
              <MaterialCommunityIcons name="cog" size={MS(24)} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              {qrUri ? (
                <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <MaterialCommunityIcons name="qrcode" size={MS(64)} color={colors.placeholder} />
                </View>
              )}
            </View>
            <Text style={[styles.instructionText, { fontFamily: fonts.regular }]}>
              Point your camera at the QR code to receive the card
            </Text>
          </View>

          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {SHARE_OPTIONS.map((opt) => {
              const RowWrapper = opt.isToggle ? View : TouchableOpacity
              const rowProps = opt.isToggle
                ? {}
                : { onPress: () => handleOption(opt.id), activeOpacity: 0.7 }
              return (
                <RowWrapper key={opt.id} style={styles.optionRow} {...rowProps}>
                  <View style={[styles.optionIcon, opt.color && { backgroundColor: opt.color + '20' }]}>
                    <MaterialCommunityIcons
                      name={opt.icon as any}
                      size={MS(20)}
                      color={opt.color || colors.text}
                    />
                  </View>
                  <Text style={[styles.optionLabel, { fontFamily: fonts.medium }]}>{opt.label}</Text>
                  {opt.isToggle ? (
                    <Switch
                      value={offlineShare}
                      onValueChange={handleOfflineToggle}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.background}
                    />
                  ) : (
                    <MaterialCommunityIcons name="chevron-right" size={MS(24)} color={colors.placeholder} />
                  )}
                </RowWrapper>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
