import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { moderateScale, verticalScale } from 'react-native-size-matters'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen'

const MS = moderateScale
const VS = verticalScale
const { width } = Dimensions.get('window')

interface ChooseLayoutProps {
  visible: boolean
  onClose: () => void
  onConfirm: (layoutId: string) => void
  initialLayout: string
  imageUrls: {
    profile?: string
    logo?: string
    cover?: string
  }
}

type ImageLayoutId = 'layout1' | 'layout2' | 'layout3' | 'layout4' | 'layout5'

const LAYOUT_OPTIONS = [
  { id: 'layout1', label: 'Layout 1', description: 'Profile picture in cover size' },
  { id: 'layout2', label: 'Layout 2', description: 'Logo in cover size' },
  { id: 'layout3', label: 'Layout 3', description: 'Profile cover size, logo circle bottom-left' },
  { id: 'layout4', label: 'Layout 4', description: 'Cover in cover size, logo rectangle bottom-right' },
  { id: 'layout5', label: 'Layout 5', description: 'Cover + profile circle bottom-right, logo rect bottom-right' },
] as const

const LAYOUT_REQUIREMENTS: Record<string, ('profile' | 'logo' | 'cover')[]> = {
  layout1: ['profile'],
  layout2: ['logo'],
  layout3: ['profile', 'logo'],
  layout4: ['cover', 'logo'],
  layout5: ['cover', 'profile', 'logo'],
}

const ChooseLayout = ({
  visible,
  onClose,
  onConfirm,
  initialLayout,
  imageUrls,
}: ChooseLayoutProps) => {
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const [selectedLayout, setSelectedLayout] = useState<string>(initialLayout)

  const getMissingImages = (layoutId: string) => {
    const required = LAYOUT_REQUIREMENTS[layoutId] || []
    return required.filter((req) => !imageUrls[req])
  }

  const isLayoutLocked = (layoutId: string) => {
    return getMissingImages(layoutId).length > 0
  }

  const renderLayoutCard = (layoutId: string) => {
    const isSelected = selectedLayout === layoutId
    const missingImages = getMissingImages(layoutId)
    const isLocked = missingImages.length > 0

    // Common styles
    const cardWidth = width * 0.75
    const cardHeight = VS(400)

    // Placeholder Components
    const TextLines = () => (
      <View style={{ width: '100%', paddingHorizontal: MS(16), marginTop: MS(16), gap: MS(10) }}>
        <View style={{ width: '100%', height: MS(12), backgroundColor: colors.border, borderRadius: MS(6), opacity: 0.5 }} />
        <View style={{ width: '70%', height: MS(12), backgroundColor: colors.border, borderRadius: MS(6), opacity: 0.5 }} />
        <View style={{ width: '85%', height: MS(12), backgroundColor: colors.border, borderRadius: MS(6), opacity: 0.5 }} />
        <View style={{ width: '50%', height: MS(12), backgroundColor: colors.border, borderRadius: MS(6), opacity: 0.5 }} />
        <View style={{ width: '90%', height: MS(12), backgroundColor: colors.border, borderRadius: MS(6), opacity: 0.5 }} />
      </View>
    )

    const CoverArea = ({ children, style, imageUri, imageMode = 'cover' }: { children?: React.ReactNode, style?: any, imageUri?: string, imageMode?: 'cover' | 'contain' }) => (
      <View style={[{
        width: '100%',
        height: '45%',
        backgroundColor: colors.card, // Sligthly darker than card bg
        borderTopLeftRadius: MS(16),
        borderTopRightRadius: MS(16),
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative' // For absolute positioning of children
      }, style]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            resizeMode={imageMode}
          />
        ) : children}

        {/* Gradient overlay to simulate the fade/shadow effect in design if needed - only if no image or strictly decorative */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: MS(20),
          backgroundColor: 'transparent',
          // shadow/gradient logic here if complex, else skip
        }} />
      </View>
    )

    // Helper for small floating circles/rects
    const FloatingImage = ({ uri, style, placeholderIcon }: { uri?: string, style: any, placeholderIcon: string }) => (
      <View style={[{
        position: 'absolute',
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.card
      }, style]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialCommunityIcons name={placeholderIcon as any} size={MS(Math.min(style.width, style.height) * 0.4)} color="#BDBDBD" />
        )}
      </View>
    )

    // Specific Layout Renderers
    const renderVisuals = () => {
      // Background base
      const baseStyle = { flex: 1, backgroundColor: colors.card } // Inner card bg

      switch (layoutId) {
        case 'layout1': // Profile as Cover
          return (
            <View style={baseStyle}>
              <CoverArea style={{ backgroundColor: '#E0E0E0' }} imageUri={imageUrls.profile}>
                <View style={{ alignItems: 'center', gap: MS(8) }}>
                  <MaterialCommunityIcons name="account" size={MS(40)} color="#9E9E9E" />
                  <Text style={{ fontFamily: fonts.bold, color: '#9E9E9E' }}>Profile</Text>
                </View>
              </CoverArea>
              {/* Logo small if needed, but layout 1 usually just text. Keeping hidden based on prev logic or just text lines */}
              <TextLines />
            </View>
          )
        case 'layout2': // Logo as Cover
          return (
            <View style={baseStyle}>
              <CoverArea style={{ backgroundColor: '#E0E0E0' }} imageUri={imageUrls.logo} imageMode="contain">
                <View style={{ alignItems: 'center', gap: MS(8) }}>
                  <MaterialCommunityIcons name="cube" size={MS(40)} color="#9E9E9E" />
                  <Text style={{ fontFamily: fonts.bold, color: '#9E9E9E' }}>Logo</Text>
                </View>
              </CoverArea>
              <TextLines />
            </View>
          )
        case 'layout3': // Profile Cover + Logo Circle
          return (
            <View style={baseStyle}>
              <CoverArea style={{ backgroundColor: '#E0E0E0' }} imageUri={imageUrls.profile}>
                <View style={{ alignItems: 'center', gap: MS(8) }}>
                  <MaterialCommunityIcons name="account" size={MS(40)} color="#9E9E9E" />
                  <Text style={{ fontFamily: fonts.bold, color: '#9E9E9E' }}>Profile</Text>
                </View>
              </CoverArea>
              {/* Logo Circle Bottom Left overlapping */}
              <FloatingImage
                uri={imageUrls.logo}
                placeholderIcon="cube"
                style={{
                  top: '38%',
                  left: MS(16),
                  width: MS(60),
                  height: MS(60),
                  borderRadius: MS(30),
                }}
              />
              <TextLines />
            </View>
          )
        case 'layout4': // Cover + Logo Rect
          return (
            <View style={baseStyle}>
              <CoverArea style={{ backgroundColor: '#E0E0E0' }} imageUri={imageUrls.cover}>
                <View style={{ alignItems: 'center', gap: MS(8) }}>
                  <MaterialCommunityIcons name="image" size={MS(40)} color="#9E9E9E" />
                  <Text style={{ fontFamily: fonts.bold, color: '#9E9E9E' }}>Cover</Text>
                </View>
              </CoverArea>
              {/* Logo Rect Bottom Right overlapping */}
              <FloatingImage
                uri={imageUrls.logo}
                placeholderIcon="cube"
                style={{
                  top: '38%',
                  right: MS(16),
                  width: MS(60),
                  height: MS(40),
                  borderRadius: MS(8),
                }}
              />
              <TextLines />
            </View>
          )
        case 'layout5': // Cover + Profile Circle + Logo Rect
        default:
          return (
            <View style={baseStyle}>
              <CoverArea style={{ backgroundColor: '#E0E0E0' }} imageUri={imageUrls.cover}>
                <View style={{ alignItems: 'center', gap: MS(8) }}>
                  <MaterialCommunityIcons name="image" size={MS(40)} color="#9E9E9E" />
                  <Text style={{ fontFamily: fonts.bold, color: '#9E9E9E' }}>Cover</Text>
                </View>
              </CoverArea>
              {/* Profile Circle Bottom Left overlapping */}
              <FloatingImage
                uri={imageUrls.profile}
                placeholderIcon="account"
                style={{
                  top: '38%',
                  left: MS(16),
                  width: MS(60),
                  height: MS(60),
                  borderRadius: MS(30),
                }}
              />
              {/* Logo Rect Bottom Right overlapping */}
              <FloatingImage
                uri={imageUrls.logo}
                placeholderIcon="cube"
                style={{
                  top: '38%',
                  right: MS(16),
                  width: MS(50),
                  height: MS(34),
                  borderRadius: MS(8),
                }}
              />
              <TextLines />
            </View>
          )
      }
    }

    return (
      <TouchableOpacity
        key={layoutId}
        activeOpacity={0.9}
        onPress={() => setSelectedLayout(layoutId)}
        style={[
          styles.layoutCard,
          {
            width: cardWidth,
            height: cardHeight,
            borderColor: isSelected ? colors.text : colors.borderLight, // Black border if selected
            borderWidth: isSelected ? 2 : 1,
            backgroundColor: colors.card,
          }
        ]}
      >
        {isLocked && (
          <View style={styles.lockedBadge}>
            <MaterialCommunityIcons name="lock" size={MS(12)} color="#FFF" />
            <Text style={styles.lockedBadgeText}>
              More images required
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={MS(12)} color="#D32F2F" />
          </View>
        )}

        {/* Render the visual representation */}
        <View style={styles.visualContainer}>
          {renderVisuals()}
        </View>

        {/* Can add label below if desired, but design shows clean cards */}
        {/* <Text style={{ textAlign: 'center', marginTop: MS(8) }}>{LAYOUT_OPTIONS.find(l=>l.id===layoutId)?.label}</Text> */}
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={MS(24)} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fonts.bold }]}>
            Choose a layout
          </Text>
          <View style={{ width: MS(24) }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            snapToInterval={width * 0.75 + MS(16)} // Card width + margin
            snapToAlignment="center"
            pagingEnabled={false} // Using snapToInterval instead for cleaner peeking
          >
            {LAYOUT_OPTIONS.map((option) => renderLayoutCard(option.id))}
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.text }]}
            onPress={() => onConfirm(selectedLayout)}
          >
            <Text style={[styles.confirmBtnText, { color: colors.background, fontFamily: fonts.medium }]}>
              Confirm layout
            </Text>
          </TouchableOpacity>
        </View>
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
    // borderBottomWidth: 1,
    // borderBottomColor: '#F0F0F0',
  },
  closeBtn: {
    padding: MS(4),
  },
  headerTitle: {
    fontSize: MS(18),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: (width - (width * 0.75)) / 2, // Center the first item
    alignItems: 'center',
    gap: MS(16),
    paddingVertical: MS(20),
  },
  layoutCard: {
    borderRadius: MS(16),
    overflow: 'hidden',
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  visualContainer: {
    flex: 1,
  },
  lockedBadge: {
    position: 'absolute',
    top: MS(16),
    left: MS(16),
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: MS(6),
    paddingHorizontal: MS(10),
    borderRadius: MS(20),
    gap: MS(6),
  },
  lockedBadgeText: {
    color: '#FFF',
    fontSize: MS(12),
    fontWeight: '600',
  },
  footer: {
    padding: MS(16),
    paddingBottom: MS(32),
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: MS(16),
    borderRadius: MS(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: MS(16),
  },
})

export default ChooseLayout
