import { Alert, Animated, StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Text, Image, Linking, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useThemeColors, useThemeFonts, useTheme } from '@/context/ThemeContext'
import { logger } from '@/lib/logger'
import { showSuccess, showError } from '@/lib/toast'
import { StatusBar } from 'expo-status-bar'
import { moderateScale, verticalScale } from 'react-native-size-matters'
import { SalonXLogo } from '@/components/SalonXLogo'

const MS = moderateScale
const VS = verticalScale

interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  company?: string
  jobTitle?: string
  profile_img?: string
  note?: string
  city?: string
  country?: string
  createdAt?: string
  cardId?: string
  card?: { cardColor?: string }
  tags?: string[]
}

const parseTags = (raw: unknown): string[] => {
  if (!raw) return []
  if (Array.isArray(raw) && raw.every((t) => typeof t === 'string')) return raw as string[]
  return []
}

const formatConnectionDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

const extractWhereMet = (note?: string) => {
  if (!note) return null
  const match = note.match(/Met at:\s*(.+?)(?:\n|$)/i)
  return match ? match[1].trim() : null
}

// Contrast color for icons/text on background - light bg needs dark icon, dark bg needs light icon
const getContrastColor = (bgColor: string, isDark: boolean) => {
  const c = (bgColor ?? '').toLowerCase().trim()
  const lightBgs = ['white', '#fff', '#ffffff', 'yellow', '#ffcc00', '#b6f500', '#4dffbe', '#00f7ff']
  if (lightBgs.some((l) => c.includes(l))) return isDark ? '#171717' : '#000000'
  return '#FFFFFF'
}

const ContactDetails = () => {
  const router = useRouter()
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      if (id) fetchContactDetails()
    }, [id])
  )

  const fetchContactDetails = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAllContacts()
      const contactsData = response.data || response.contacts || response || []
      const found = Array.isArray(contactsData)
        ? contactsData.find((c: any) => c.id === id || c._id === id)
        : null

      if (found) {
        setContact(found)
      } else {
        showError('Error', 'Contact not found')
        router.back()
      }
    } catch (e: any) {
      logger.error('Error fetching contact', e)
      showError('Error', e?.message ?? 'Failed to load contact')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddTagModal, setShowAddTagModal] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const [savingTag, setSavingTag] = useState(false)

  const tags = parseTags(contact?.tags)

  const handleDelete = () => setShowDeleteConfirm(true)

  const handleAddTag = () => {
    setShowAddTagModal(true)
  }

  const saveTag = async () => {
    const tag = newTagInput.trim()
    if (!tag) return
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      showError('Tag exists', `"${tag}" is already added`)
      return
    }
    try {
      setSavingTag(true)
      const nextTags = [...tags, tag]
      await apiService.updateContact(id!, { tags: nextTags })
      setContact((c) => (c ? { ...c, tags: nextTags } : null))
      setNewTagInput('')
      setShowAddTagModal(false)
      showSuccess('Added', `Tag "${tag}" added`)
    } catch (e: any) {
      showError('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to add tag')
    } finally {
      setSavingTag(false)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    Alert.alert(
      'Remove tag?',
      `Are you sure you want to remove "${tagToRemove}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => confirmRemoveTag(tagToRemove) },
      ]
    )
  }

  const confirmRemoveTag = async (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove)
    try {
      await apiService.updateContact(id!, { tags: nextTags })
      setContact((c) => (c ? { ...c, tags: nextTags } : null))
      showSuccess('Removed', 'Tag removed')
    } catch (e: any) {
      showError('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to remove tag')
    }
  }

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    try {
      setDeleting(true)
      await apiService.deleteContact(id)
      showSuccess('Deleted', 'Contact deleted successfully')
      router.back()
    } catch (e: any) {
      showError('Error', e?.response?.data?.message ?? 'Failed to delete contact')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = () => {
    router.push(`/edit-contact/${id}` as any)
  }

  const coverBg = colors.card
  const accentColor = colors.primary
  const iconOnCoverColor = getContrastColor(coverBg, isDark)
  const iconOnAccentColor = getContrastColor(accentColor, isDark)
  const insets = useSafeAreaInsets()
  const topInset = insets.top || 44

  const scrollY = React.useRef(new Animated.Value(0)).current
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 80, 150],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  })

  const circleBg = isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'
  const circleIconColor = isDark ? '#FFF' : '#000'
  const statusBarStyle = isDark ? 'light' : 'dark'

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: coverBg }}>
        <StatusBar style={statusBarStyle} />
        <View style={[styles.loadingHeader, { paddingTop: topInset + MS(8) }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <View style={[styles.circleBtn, { backgroundColor: circleBg }]}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={circleIconColor} />
            </View>
          </TouchableOpacity>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={iconOnCoverColor} />
        </View>
      </View>
    )
  }

  if (!contact) return null

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'No Name'
  const connectionDate = formatConnectionDate(contact.createdAt)
  const whereMet = extractWhereMet(contact.note)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={statusBarStyle} />

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContentOuter}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Top section - cover photo (scrolls with content) */}
        <View style={[styles.coverSection, { backgroundColor: coverBg }]}>
         
          <View style={[styles.coverImageWrap, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
            {contact.profile_img ? (
              <Image source={{ uri: contact.profile_img }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <SalonXLogo width={MS(100)} height={MS(100)} />
              </View>
            )}
          </View>
          <View style={{ height: VS(24) }} />
        </View>

        {/* Content (white card) */}
        <View style={[styles.scrollContent, { backgroundColor: colors.background }]}>
          {/* Name, Role, Company */}
          <View style={styles.nameSection}>
            <Text style={[styles.name, { fontFamily: fonts.bold, color: colors.text }]}>{fullName}</Text>
            {contact.jobTitle && (
              <Text style={[styles.role, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
                {contact.jobTitle} ✨
              </Text>
            )}
            {contact.company && (
              <Text style={[styles.company, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
                {contact.company}
              </Text>
            )}
          </View>

          {/* Connection details */}
          <View style={styles.connectionSection}>
            <Text style={[styles.connectionTitle, { fontFamily: fonts.medium, color: colors.textSecondary }]}>
              Connection details
            </Text>
            <View style={styles.connectionRow}>
              <MaterialCommunityIcons name="calendar" size={18} color={colors.textSecondary} />
              <Text style={[styles.connectionValue, { fontFamily: fonts.regular, color: colors.text }]}>
                {connectionDate}
              </Text>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map((tag) => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.tagChipText, { fontFamily: fonts.medium, color: colors.text }]}>{tag}</Text>
                    <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => handleRemoveTag(tag)} style={styles.tagChipRemove}>
                      <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={[styles.addTagBtn, { backgroundColor: colors.text, borderColor: colors.text }]} onPress={handleAddTag}>
              <MaterialCommunityIcons name="plus" size={18} color={colors.buttonPrimaryText} />
              <Text style={[styles.addTagText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>Add tag</Text>
            </TouchableOpacity>
          </View>

          {/* Contact info cards */}
          <View style={styles.cardsSection}>
            {contact.email && (
              <TouchableOpacity
                style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => contact.email && Linking.openURL(`mailto:${contact.email}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.infoCardIcon, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="email-outline" size={22} color={iconOnAccentColor} />
                </View>
                <View style={styles.infoCardContent}>
                  <Text style={[styles.infoCardValue, { fontFamily: fonts.medium, color: colors.text }]} numberOfLines={1}>
                    {contact.email}
                  </Text>
                  <Text style={[styles.infoCardLabel, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
                    Email
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.placeholder} />
              </TouchableOpacity>
            )}

            {contact.phone && (
              <TouchableOpacity
                style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.infoCardIcon, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="phone-outline" size={22} color={iconOnAccentColor} />
                </View>
                <View style={styles.infoCardContent}>
                  <Text style={[styles.infoCardValue, { fontFamily: fonts.medium, color: colors.text }]} numberOfLines={1}>
                    {contact.phone}
                  </Text>
                  <Text style={[styles.infoCardLabel, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
                    Phone
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.placeholder} />
              </TouchableOpacity>
            )}

            {contact.jobTitle && (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.infoCardIcon, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="linkedin" size={22} color={iconOnAccentColor} />
                </View>
                <View style={styles.infoCardContent}>
                  <Text style={[styles.infoCardValue, { fontFamily: fonts.medium, color: colors.text }]} numberOfLines={1}>
                    {contact.jobTitle}
                  </Text>
                  <Text style={[styles.infoCardLabel, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
                    Title
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Where we met */}
          {(whereMet || contact.city || contact.country) && (
            <View style={styles.whereMetSection}>
              <Text style={[styles.whereMetTitle, { fontFamily: fonts.medium, color: colors.textSecondary }]}>
                Where we met
              </Text>
              <View style={[styles.whereMetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {whereMet && (
                  <View style={styles.whereMetRow}>
                    <MaterialCommunityIcons name="calendar-check" size={20} color={accentColor} />
                    <Text style={[styles.whereMetEventName, { fontFamily: fonts.medium, color: colors.text }]}>
                      {whereMet}
                    </Text>
                  </View>
                )}
                {(contact.city || contact.country) && (
                  <View style={[styles.whereMetRow, whereMet && { marginTop: MS(12) }]}>
                    <MaterialCommunityIcons name="map-marker" size={20} color={accentColor} />
                    <Text style={[styles.whereMetLocation, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
                      {[contact.city, contact.country].filter(Boolean).join(', ') || '—'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={styles.notesSection}>
            <Text style={[styles.notesTitle, { fontFamily: fonts.medium, color: colors.textSecondary }]}>
              Notes
            </Text>
            <TouchableOpacity
              style={[styles.moreBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleEdit}
            >
              <Text style={[styles.moreBtnText, { fontFamily: fonts.regular, color: colors.text }]}>
                {contact.note ? contact.note.replace(/Met at:.*?\n?/i, '').trim().slice(0, 60) + (contact.note.length > 60 ? '...' : '') : 'Add notes'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.placeholder} />
            </TouchableOpacity>
          </View>

          {/* Bottom actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.bottomBtnText, { fontFamily: fonts.medium, color: colors.text }]}>More...</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: colors.text }]} onPress={handleAddTag}>
              <MaterialCommunityIcons name="plus" size={18} color={colors.buttonPrimaryText} />
              <Text style={[styles.bottomBtnText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>Add tag</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: colors.text }]} onPress={handleEdit}>
              <Text style={[styles.bottomBtnText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.border }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.error} />
            )}
            <Text style={[styles.deleteBtnText, { fontFamily: fonts.medium, color: colors.error }]}>Delete contact</Text>
          </TouchableOpacity>

          <View style={{ height: VS(40) }} />
        </View>
      </Animated.ScrollView>

      {/* Sticky header - arrow & pencil */}
      <View style={[styles.stickyHeader, { paddingTop: topInset }]} pointerEvents="box-none">
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: coverBg, opacity: headerBgOpacity }]}
          pointerEvents="none"
        />
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ zIndex: 1 }}>
          <View style={[styles.circleBtn, { backgroundColor: circleBg }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={circleIconColor} />
          </View>
        </TouchableOpacity>
        <View style={{ width: 44, zIndex: 1 }} />
        <TouchableOpacity onPress={handleEdit} disabled={deleting} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ zIndex: 1 }}>
          <View style={[styles.circleBtn, { backgroundColor: circleBg }]}>
            <MaterialCommunityIcons name="pencil" size={20} color={circleIconColor} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Add tag modal */}
        <Modal visible={showAddTagModal} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => !savingTag && setShowAddTagModal(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalTitle, { fontFamily: fonts.bold, color: colors.text }]}>Add tag</Text>
                <TextInput
                  style={[styles.tagInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Work, Friend, Conference"
                  placeholderTextColor={colors.placeholder}
                  value={newTagInput}
                  onChangeText={setNewTagInput}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={saveTag}
                  editable={!savingTag}
                />
                <View style={styles.modalTagActions}>
                  <TouchableOpacity
                    style={[styles.modalBtnCancel, { borderColor: colors.border }]}
                    onPress={() => setShowAddTagModal(false)}
                    disabled={savingTag}
                  >
                    <Text style={[styles.modalBtnText, { fontFamily: fonts.medium, color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addTagBtn, { backgroundColor: colors.text, borderColor: colors.text, flex: 1 }]}
                    onPress={saveTag}
                    disabled={savingTag || !newTagInput.trim()}
                  >
                    {savingTag ? (
                      <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                    ) : (
                      <Text style={[styles.addTagText, { fontFamily: fonts.medium, color: colors.buttonPrimaryText }]}>Add</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

      {/* Delete confirmation modal */}
        <Modal visible={showDeleteConfirm} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { fontFamily: fonts.bold, color: colors.text }]}>Delete contact?</Text>
              <Text style={[styles.modalSubtitle, { fontFamily: fonts.regular, color: colors.textSecondary }]}>
                This cannot be undone.
              </Text>
              <TouchableOpacity
                style={[styles.modalBtnDanger, { backgroundColor: colors.error }]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { fontFamily: fonts.medium, color: '#FFFFFF' }]}>Delete</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={[styles.modalBtnText, { fontFamily: fonts.medium, color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MS(16),
    paddingTop: MS(8),
    paddingBottom: MS(16),
  },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MS(20),
    paddingBottom: MS(12),
  },
  coverSection: {
    width: '100%',
    alignItems: 'center',
  },
  coverImageWrap: {
    width: '100%',
    height: VS(220),
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverInitials: {
    fontSize: MS(56),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContentOuter: { paddingBottom: VS(20) },
  scrollContent: {
    marginTop: -VS(36),
    borderTopLeftRadius: MS(24),
    borderTopRightRadius: MS(24),
    paddingHorizontal: MS(20),
    paddingTop: MS(24),
  },
  nameSection: { marginBottom: MS(24) },
  name: { fontSize: MS(26), fontWeight: '700', marginBottom: MS(4) },
  role: { fontSize: MS(14), marginBottom: MS(2) },
  company: { fontSize: MS(14) },
  connectionSection: { marginBottom: MS(24) },
  connectionTitle: { fontSize: MS(12), marginBottom: MS(12), textTransform: 'uppercase', letterSpacing: 0.5 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: MS(10) },
  connectionValue: { fontSize: MS(14) },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MS(8), marginTop: MS(12) },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: MS(6),
    paddingLeft: MS(12),
    paddingRight: MS(6),
    borderRadius: MS(20),
    borderWidth: 1,
  },
  tagChipText: { fontSize: MS(14), marginRight: MS(4) },
  tagChipRemove: { padding: MS(4) },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MS(8),
    paddingVertical: MS(12),
    paddingHorizontal: MS(16),
    borderRadius: MS(12),
    marginTop: MS(16),
    alignSelf: 'flex-start',
  },
  addTagText: { fontSize: MS(14), fontWeight: '600' },
  tagInput: {
    height: MS(48),
    borderRadius: MS(12),
    borderWidth: 1,
    paddingHorizontal: MS(16),
    fontSize: MS(16),
    marginBottom: MS(16),
  },
  modalTagActions: { flexDirection: 'row', gap: MS(12) },
  cardsSection: { gap: MS(12), marginBottom: MS(24) },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: MS(16),
    borderRadius: MS(14),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MS(14),
  },
  infoCardContent: { flex: 1 },
  infoCardValue: { fontSize: MS(16), marginBottom: MS(2) },
  infoCardLabel: { fontSize: MS(12) },
  whereMetSection: { marginBottom: MS(24) },
  whereMetTitle: { fontSize: MS(12), marginBottom: MS(12), textTransform: 'uppercase', letterSpacing: 0.5 },
  whereMetCard: {
    padding: MS(16),
    borderRadius: MS(14),
    borderWidth: 1,
  },
  whereMetRow: { flexDirection: 'row', alignItems: 'center', gap: MS(12) },
  whereMetEventName: { fontSize: MS(16), flex: 1 },
  whereMetLocation: { fontSize: MS(14), flex: 1 },
  notesSection: { marginBottom: MS(24) },
  notesTitle: { fontSize: MS(12), marginBottom: MS(12), textTransform: 'uppercase', letterSpacing: 0.5 },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: MS(16),
    borderRadius: MS(12),
    borderWidth: 1,
  },
  moreBtnText: { fontSize: MS(14) },
  bottomActions: {
    flexDirection: 'row',
    gap: MS(12),
    marginBottom: MS(24),
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MS(8),
    paddingVertical: MS(14),
    borderRadius: MS(12),
  },
  bottomBtnText: { fontSize: MS(14), fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MS(8),
    paddingVertical: MS(12),
    borderWidth: 1,
    borderRadius: MS(12),
  },
  deleteBtnText: { fontSize: MS(14), fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: MS(24),
  },
  modalBox: {
    width: '100%',
    maxWidth: MS(320),
    borderRadius: MS(16),
    padding: MS(24),
    borderWidth: 1,
  },
  modalTitle: { fontSize: MS(18), marginBottom: MS(8), textAlign: 'center' },
  modalSubtitle: { fontSize: MS(14), marginBottom: MS(20), textAlign: 'center' },
  modalBtnDanger: { padding: MS(14), borderRadius: MS(10), alignItems: 'center', marginBottom: MS(10) },
  modalBtnCancel: {
    padding: MS(14),
    borderRadius: MS(10),
    alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnText: { fontSize: MS(16), fontWeight: '600' },
})

export default ContactDetails
