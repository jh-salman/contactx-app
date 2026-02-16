import React from 'react'
import { View, Image, StyleSheet, Dimensions } from 'react-native'
import { SalonXLogo } from '@/components/SalonXLogo'
import { moderateScale, verticalScale } from 'react-native-size-matters'

const MS = moderateScale
const VS = verticalScale

type LayoutId = 'layout1' | 'layout2' | 'layout3' | 'layout4' | 'layout5' | 'layout6' | 'layout7' | null
type ImageFieldType = 'profile' | 'logo' | 'cover'

type CardImageLayoutProps = {
  layout: LayoutId
  profile: string | null
  logo: string | null
  cover: string | null
  cardColor: string
  /** Height of the image area - use 40% of card for cards page */
  height?: number
  onImageError?: (url: string) => void
  /** Optional: render edit/action button overlay */
  renderActionButton?: () => React.ReactNode
  /** Edit mode: when provided, show pencil overlay on each image. Used by create/edit card. */
  renderEditButton?: (field: ImageFieldType) => React.ReactNode
}

const { width: SCREEN_WIDTH } = Dimensions.get('screen')

export const CardImageLayout: React.FC<CardImageLayoutProps> = ({
  layout,
  profile,
  logo,
  cover,
  cardColor,
  height: customHeight,
  onImageError,
  renderActionButton,
  renderEditButton,
}) => {
  const effectiveLayout = layout ?? null
  const hasAnyImage = !!(cover || profile || logo)
  const isTallLayout = ['layout1', 'layout2', 'layout3', 'layout4'].includes(effectiveLayout || '')
  const baseHeight = customHeight ?? (SCREEN_WIDTH * 0.4)
  const height = hasAnyImage ? (isTallLayout ? baseHeight * 1.25 : baseHeight) : baseHeight * 0.5

  const profileCircleSize = MS(96)
  const profileCircleRadius = MS(48)
  const logoRectW = MS(112)
  const logoRectH = MS(80)

  const handleError = (url: string) => {
    onImageError?.(url)
  }

  const renderMainPlaceholder = () => (
    <View style={[styles.coverPlaceholder, { backgroundColor: cardColor }]}>
      <SalonXLogo width={MS(72)} height={MS(72)} />
    </View>
  )

  const renderCoverArea = (uri: string | null, resizeMode: 'cover' | 'contain' = 'cover', editField?: ImageFieldType) => {
    if (!uri) return null
    return (
      <View style={styles.coverArea}>
        <Image
          source={{ uri }}
          style={styles.coverImage}
          resizeMode={resizeMode}
          onError={() => handleError(uri)}
        />
        {renderActionButton?.() ?? (editField && renderEditButton?.(editField))}
      </View>
    )
  }

  const hasOverflowLayout = effectiveLayout === 'layout5' || effectiveLayout === 'layout6' || effectiveLayout === 'layout7'
  const overflowPadding = hasOverflowLayout ? MS(32) : 0

  const isShowingPlaceholder =
    (effectiveLayout === null && !cover && !profile && !logo) ||
    (effectiveLayout === 'layout1' && !profile) ||
    (effectiveLayout === 'layout2' && !logo) ||
    (effectiveLayout === 'layout3' && !cover) ||
    (effectiveLayout === 'layout4' && !profile) ||
    (effectiveLayout === 'layout5' && !cover) ||
    (effectiveLayout === 'layout6' && !cover) ||
    (effectiveLayout === 'layout7' && !cover)

  return (
    <View style={[styles.wrapper, { paddingBottom: overflowPadding, minHeight: height }]}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: isShowingPlaceholder ? cardColor : 'transparent',
            height,
            width: '100%',
          },
        ]}
      >
        {/* No layout: show cover if available, else logo, else profile, else placeholder */}
        {effectiveLayout === null && (
          <>
            {cover ? renderCoverArea(cover, 'cover', 'cover') : logo ? renderCoverArea(logo, 'contain', 'logo') : profile ? renderCoverArea(profile, 'cover', 'profile') : renderMainPlaceholder()}
          </>
        )}

        {/* Layout 1: profile only, cover size */}
        {effectiveLayout === 'layout1' && (
          <>
            {profile ? renderCoverArea(profile, 'cover', 'profile') : renderMainPlaceholder()}
          </>
        )}

        {/* Layout 2: logo only */}
        {effectiveLayout === 'layout2' && (
          <>
            {logo ? renderCoverArea(logo, 'contain', 'logo') : renderMainPlaceholder()}
          </>
        )}

        {/* Layout 3: cover only */}
        {effectiveLayout === 'layout3' && (
          <>
            {cover ? renderCoverArea(cover, 'cover', 'cover') : renderMainPlaceholder()}
          </>
        )}

        {/* Layout 4: profile cover + logo circle bottom-left */}
        {effectiveLayout === 'layout4' && (
          <>
            {profile ? renderCoverArea(profile, 'cover', 'profile') : renderMainPlaceholder()}
            {logo && (
              <View
                style={[
                  styles.profileWrap,
                  {
                    left: MS(12),
                    bottom: MS(12),
                    width: profileCircleSize,
                    height: profileCircleSize,
                    borderRadius: profileCircleRadius,
                  },
                ]}
              >
                <Image
                  source={{ uri: logo }}
                  style={styles.fillImage}
                  resizeMode="contain"
                  onError={() => handleError(logo)}
                />
                {renderEditButton?.('logo')}
              </View>
            )}
          </>
        )}

        {/* Layout 5: cover + profile circle bottom-left */}
        {effectiveLayout === 'layout5' && (
          <>
            {cover ? renderCoverArea(cover, 'cover', 'cover') : renderMainPlaceholder()}
            {profile && (
              <View
                style={[
                  styles.profileWrap,
                  {
                    left: MS(12),
                    bottom: -profileCircleSize / 2,
                    width: profileCircleSize,
                    height: profileCircleSize,
                    borderRadius: profileCircleRadius,
                  },
                ]}
              >
                <Image
                  source={{ uri: profile }}
                  style={styles.fillImage}
                  resizeMode="cover"
                  onError={() => handleError(profile)}
                />
                {renderEditButton?.('profile')}
              </View>
            )}
          </>
        )}

        {/* Layout 6: cover + logo rect bottom-right */}
        {effectiveLayout === 'layout6' && (
          <>
            {cover ? renderCoverArea(cover, 'cover', 'cover') : renderMainPlaceholder()}
            {logo && (
              <View
                style={[
                  styles.logoWrap,
                  {
                    right: MS(12),
                    bottom: -logoRectH / 2,
                    width: logoRectW,
                    height: logoRectH,
                  },
                ]}
              >
                <Image
                  source={{ uri: logo }}
                  style={styles.fillImage}
                  resizeMode="contain"
                  onError={() => handleError(logo)}
                />
                {renderEditButton?.('logo')}
              </View>
            )}
          </>
        )}

        {/* Layout 7: cover + profile circle bottom-left + logo rect bottom-right */}
        {effectiveLayout === 'layout7' && (
          <>
            {cover ? renderCoverArea(cover, 'cover', 'cover') : renderMainPlaceholder()}
            {profile && (
              <View
                style={[
                  styles.profileWrap,
                  {
                    left: MS(12),
                    bottom: -profileCircleSize / 2,
                    width: profileCircleSize,
                    height: profileCircleSize,
                    borderRadius: profileCircleRadius,
                  },
                ]}
              >
                <Image
                  source={{ uri: profile }}
                  style={styles.fillImage}
                  resizeMode="cover"
                  onError={() => handleError(profile)}
                />
                {renderEditButton?.('profile')}
              </View>
            )}
            {logo && (
              <View
                style={[
                  styles.logoWrap,
                  {
                    right: MS(12),
                    bottom: -logoRectH / 2,
                    width: logoRectW,
                    height: logoRectH,
                  },
                ]}
              >
                <Image
                  source={{ uri: logo }}
                  style={styles.fillImage}
                  resizeMode="contain"
                  onError={() => handleError(logo)}
                />
                {renderEditButton?.('logo')}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  box: {
    width: '100%',
    borderRadius: MS(12),
    overflow: 'visible' as const,
    position: 'relative',
  },
  coverArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: MS(12),
    overflow: 'hidden',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverPlaceholder: {
    width: '100%',
    flex: 1,
    borderRadius: MS(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileWrap: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  logoWrap: {
    position: 'absolute',
    borderRadius: MS(8),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
})
