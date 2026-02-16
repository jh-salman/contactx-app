import { useAuth } from '@/context/AuthContext'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { logger } from '@/lib/logger'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Button, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  company?: string
  jobTitle?: string
  profile_img?: string
}

const contacts = () => {
  const { logout } = useAuth()
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()

  const fetchContacts = useCallback(async (isRefresh = false) => {
    try {
      // Only show full loading screen on initial load, not on refresh
      if (!isRefresh) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)
      
      const response = await apiService.getAllContacts()
      
      // Handle different response structures
      const contactsData = response.data || response.contacts || response || []
      
      // If response has success: true and data is empty array, treat as empty state
      if (response.success === true && Array.isArray(contactsData)) {
        setContacts(contactsData)
        setError(null)
        return
      }
      
      setContacts(Array.isArray(contactsData) ? contactsData : [])
    } catch (err: any) {
      // Check if server returned success: true with empty data (graceful error handling)
      if (err.response?.data?.success === true && Array.isArray(err.response?.data?.data)) {
        setContacts(err.response.data.data)
        setError(null)
        return
      }
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load contacts'
      
      // Handle database errors (500) as empty state - server handles them gracefully
      if (err.response?.status === 500 || 
          errorMessage.toLowerCase().includes('column') ||
          errorMessage.toLowerCase().includes('table') ||
          errorMessage.toLowerCase().includes('database') ||
          errorMessage.toLowerCase().includes('prisma')) {
        // Server already handled the error gracefully, return empty array
        setContacts([])
        setError(null)
        return
      }
      
      // Handle "No contacts found" as empty state, not an error
      if (errorMessage.toLowerCase().includes('no contacts found') || 
          errorMessage.toLowerCase().includes('no contact')) {
        setContacts([])
        setError(null)
        return
      }
      
      // Only show error for actual errors (not database/500 errors)
      setError(errorMessage)
      // Only show alert on initial load, not on refresh, and not for database errors
      if (!isRefresh && 
          !errorMessage.toLowerCase().includes('no contacts found') &&
          !errorMessage.toLowerCase().includes('no contact') &&
          !errorMessage.toLowerCase().includes('column') &&
          !errorMessage.toLowerCase().includes('table') &&
          !errorMessage.toLowerCase().includes('database') &&
          !errorMessage.toLowerCase().includes('prisma')) {
        Alert.alert('Error', errorMessage)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const hasLoadedRef = React.useRef(false)
  const isFetchingRef = React.useRef(false)

  useEffect(() => {
    if (!hasLoadedRef.current) {
      fetchContacts(false) // Initial load
      hasLoadedRef.current = true
    }
  }, [fetchContacts])

  // Refresh contacts when screen comes into focus (e.g., returning from detail/edit screen)
  // Only refresh once when screen comes into focus, not repeatedly
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we've already loaded once and not currently fetching
      if (hasLoadedRef.current && !isFetchingRef.current) {
        isFetchingRef.current = true
        fetchContacts(true).finally(() => {
          isFetchingRef.current = false
        })
      }
      // No cleanup needed - we want it to refresh every time screen focuses
    }, [fetchContacts])
  )

  const onRefresh = () => {
    fetchContacts(true) // Refresh with pull-to-refresh
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout()
              router.replace('/auth/login')
            } catch (error) {
              logger.error('Logout error', error)
              Alert.alert('Error', 'Failed to logout. Please try again.')
            }
          },
        },
      ]
    )
  }

  const handleContactPress = (contactId: string) => {
    router.push(`/contact/${contactId}` as any)
  }

  const handleCreateContact = () => {
    router.push('/create-contact' as any)
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
      padding: 20,
      backgroundColor: colors.input,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    addButton: {
      padding: 4,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.placeholder,
    },
    errorText: {
      fontSize: 16,
      color: colors.primaryDark,
      textAlign: 'center',
      marginBottom: 20,
    },
    emptyText: {
      fontSize: 18,
      color: colors.placeholder,
      textAlign: 'center',
      fontWeight: '500',
      marginBottom: 8,
    },
    emptySubText: {
      fontSize: 14,
      color: colors.placeholder,
      textAlign: 'center',
    },
    listContent: {
      padding: 16,
    },
    contactItem: {
      flexDirection: 'row',
      backgroundColor: colors.input,
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      alignItems: 'center',
    },
    avatarContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: colors.buttonPrimaryText,
      fontSize: 20,
      fontWeight: 'bold',
    },
    contactInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    contactName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    contactCompany: {
      fontSize: 14,
      color: colors.placeholder,
      marginBottom: 4,
    },
    contactDetail: {
      fontSize: 14,
      color: colors.placeholder,
      marginTop: 2,
    },
    createButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 20,
    },
    createButtonText: {
      color: colors.buttonPrimaryText,
      fontSize: 16,
      fontWeight: '600',
    },
  })

  const renderContactItem = ({ item }: { item: Contact }) => {
    const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'No Name'
    
    return (
      <TouchableOpacity 
        style={styles.contactItem}
        onPress={() => handleContactPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Text style={[styles.avatarText, { fontFamily: fonts.bold, fontSize: 20 }]}>
            {fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { fontFamily: fonts.medium, fontSize: 18 }]}>{fullName}</Text>
          {item.company && (
            <Text style={[styles.contactCompany, { fontFamily: fonts.regular, fontSize: 14 }]}>{item.company}</Text>
          )}
          {item.phone && (
            <Text style={[styles.contactDetail, { fontFamily: fonts.regular, fontSize: 14 }]}>📞 {item.phone}</Text>
          )}
          {item.email && (
            <Text style={[styles.contactDetail, { fontFamily: fonts.regular, fontSize: 14 }]}>✉️ {item.email}</Text>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.placeholder} />
      </TouchableOpacity>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.header}>
            <Text style={[styles.title, { fontFamily: fonts.bold, fontSize: 32 }]}>Contacts</Text>
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { fontFamily: fonts.regular, fontSize: 16 }]}>Loading contacts...</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (error && contacts.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.header}>
            <Text style={[styles.title, { fontFamily: fonts.bold, fontSize: 32 }]}>Contacts</Text>
          </View>
          <View style={styles.centerContent}>
            <Text style={[styles.errorText, { fontFamily: fonts.regular, fontSize: 16 }]}>{error}</Text>
            <Button title="Retry" onPress={() => fetchContacts(false)} color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: fonts.bold, fontSize: 32 }]}>Contacts</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleCreateContact}
            >
              <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Button title="Logout" onPress={handleLogout} color={colors.primaryDark} />
          </View>
        </View>

        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={(item, index) => item.id?.toString() || `contact-${index}`}
          contentContainerStyle={contacts.length === 0 ? { flex: 1 } : styles.listContent}
          ListHeaderComponent={null}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <MaterialCommunityIcons name="account-outline" size={64} color={colors.placeholder} />
              <Text style={[styles.emptyText, { fontFamily: fonts.medium, fontSize: 20 }]}>No contacts found</Text>
              <Text style={[styles.emptySubText, { fontFamily: fonts.regular, fontSize: 14 }]}>Add contacts manually or scan cards to save them</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={handleCreateContact}
              >
                <Text style={[styles.createButtonText, { fontFamily: fonts.medium, fontSize: 16 }]}>Create Contact</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      </SafeAreaView>
    </View>
  )
}

export default contacts