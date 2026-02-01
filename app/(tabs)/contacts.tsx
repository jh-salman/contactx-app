import { useAuth } from '@/context/AuthContext'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
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

interface ContactRequest {
  id: string
  cardId: string
  cardTitle?: string
  cardOwnerName?: string
  cardOwnerPhone?: string
  cardOwnerEmail?: string
  status: 'pending' | 'approved' | 'rejected'
  message?: string
  createdAt?: string
}

const contacts = () => {
  const { logout } = useAuth()
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRequests, setShowRequests] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
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

  const fetchRequests = useCallback(async () => {
    try {
      const response = await apiService.getReceivedRequests()
      
      // Handle different response structures
      const requestsData = response.data || response.requests || response || []
      
      // If response has success: true and data is empty array, treat as empty state
      if (response.success === true && Array.isArray(requestsData)) {
        setRequests(requestsData)
        return
      }
      setRequests(Array.isArray(requestsData) ? requestsData : [])
    } catch (err: any) {
      // Check if server returned success: true with empty data (graceful error handling)
      if (err.response?.data?.success === true && Array.isArray(err.response?.data?.data)) {
        setRequests(err.response.data.data)
        return
      }
      
      const errorMessage = err.response?.data?.message || err.message || ''
      
      // Handle database errors (500) as empty state - server handles them gracefully
      if (err.response?.status === 500 || 
          errorMessage.toLowerCase().includes('column') ||
          errorMessage.toLowerCase().includes('table') ||
          errorMessage.toLowerCase().includes('database') ||
          errorMessage.toLowerCase().includes('prisma')) {
        // Server already handled the error gracefully, return empty array
        setRequests([])
        return
      }
      
      // Silently handle errors - backend might not have this endpoint implemented yet
      // Set requests to empty array to prevent UI issues
      setRequests([])
      // Only log in development mode
      if (__DEV__) {
        console.log('Requests API not available or error:', errorMessage)
      }
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Refresh requests when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (hasLoadedRef.current) {
        fetchRequests()
      }
    }, [fetchRequests])
  )

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequestId(requestId)
    try {
      await apiService.approveRequest(requestId)
      Alert.alert('Success', 'Contact request approved!')
      // Refresh requests and contacts
      await fetchRequests()
      await fetchContacts(true)
    } catch (err: any) {
      console.error('Error approving request:', err)
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to approve request. Please try again.'
      )
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this contact request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequestId(requestId)
            try {
              await apiService.rejectRequest(requestId)
              Alert.alert('Success', 'Contact request rejected.')
              await fetchRequests()
            } catch (err: any) {
              console.error('Error rejecting request:', err)
              Alert.alert(
                'Error',
                err.response?.data?.message || 'Failed to reject request. Please try again.'
              )
            } finally {
              setProcessingRequestId(null)
            }
          },
        },
      ]
    )
  }

  const onRefresh = () => {
    fetchContacts(true) // Refresh with pull-to-refresh
    fetchRequests() // Also refresh requests
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
              console.error('Logout error:', error)
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
    requestsSection: {
      backgroundColor: colors.input,
      marginBottom: 16,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    requestsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    requestsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    requestsBadge: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 24,
      alignItems: 'center',
    },
    requestsBadgeText: {
      color: colors.buttonPrimaryText,
      fontSize: 12,
      fontWeight: '600',
    },
    requestItem: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    requestHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    requestInfo: {
      flex: 1,
    },
    requestOwnerName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    requestCardTitle: {
      fontSize: 14,
      color: colors.placeholder,
      marginBottom: 4,
    },
    requestMessage: {
      fontSize: 13,
      color: colors.placeholder,
      fontStyle: 'italic',
      marginTop: 4,
    },
    requestActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    approveButton: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    rejectButton: {
      flex: 1,
      backgroundColor: colors.primaryDark,
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    requestButtonText: {
      color: colors.buttonPrimaryText,
      fontSize: 14,
      fontWeight: '600',
    },
    toggleRequestsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    emptyRequestsText: {
      fontSize: 14,
      color: colors.placeholder,
      textAlign: 'center',
      paddingVertical: 8,
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
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
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
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
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
          ListHeaderComponent={
            requests.length > 0 ? (
              <View style={styles.requestsSection}>
                <TouchableOpacity
                  style={styles.requestsHeader}
                  onPress={() => setShowRequests(!showRequests)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="account-plus" size={20} color={colors.primary} />
                    <Text style={[styles.requestsTitle, { fontFamily: fonts.medium, fontSize: 20 }]}>
                      Contact Requests
                    </Text>
                    <View style={styles.requestsBadge}>
                      <Text style={[styles.requestsBadgeText, { fontFamily: fonts.medium, fontSize: 12 }]}>
                        {requests.filter(r => r.status === 'pending').length}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name={showRequests ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.placeholder}
                  />
                </TouchableOpacity>

                {showRequests && (
                  <View>
                    {requests.filter(r => r.status === 'pending').length === 0 ? (
                      <Text style={[styles.emptyRequestsText, { fontFamily: fonts.regular, fontSize: 14 }]}>
                        No pending requests
                      </Text>
                    ) : (
                      requests
                        .filter(r => r.status === 'pending')
                        .map((request) => (
                          <View key={request.id} style={styles.requestItem}>
                            <View style={styles.requestHeader}>
                              <View style={styles.requestInfo}>
                                <Text style={[styles.requestOwnerName, { fontFamily: fonts.medium, fontSize: 16 }]}>
                                  {request.cardOwnerName || 'Card Owner'}
                                </Text>
                                {request.cardTitle && (
                                  <Text style={[styles.requestCardTitle, { fontFamily: fonts.regular, fontSize: 14 }]}>
                                    Card: {request.cardTitle}
                                  </Text>
                                )}
                                {request.message && (
                                  <Text style={[styles.requestMessage, { fontFamily: fonts.regular, fontSize: 13 }]}>
                                    "{request.message}"
                                  </Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.requestActions}>
                              <TouchableOpacity
                                style={[
                                  styles.approveButton,
                                  processingRequestId === request.id && { opacity: 0.6 },
                                ]}
                                onPress={() => handleApproveRequest(request.id)}
                                disabled={processingRequestId === request.id}
                              >
                                {processingRequestId === request.id ? (
                                  <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                                ) : (
                                  <>
                                    <MaterialCommunityIcons
                                      name="check"
                                      size={16}
                                      color={colors.buttonPrimaryText}
                                    />
                                    <Text style={[styles.requestButtonText, { fontFamily: fonts.medium, fontSize: 14 }]}>
                                      Approve
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.rejectButton,
                                  processingRequestId === request.id && { opacity: 0.6 },
                                ]}
                                onPress={() => handleRejectRequest(request.id)}
                                disabled={processingRequestId === request.id}
                              >
                                {processingRequestId === request.id ? (
                                  <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                                ) : (
                                  <>
                                    <MaterialCommunityIcons
                                      name="close"
                                      size={16}
                                      color={colors.buttonPrimaryText}
                                    />
                                    <Text style={[styles.requestButtonText, { fontFamily: fonts.medium, fontSize: 14 }]}>
                                      Reject
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                    )}
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <MaterialCommunityIcons name="account-outline" size={64} color={colors.placeholder} />
              <Text style={[styles.emptyText, { fontFamily: fonts.medium, fontSize: 20 }]}>No contacts found</Text>
              <Text style={[styles.emptySubText, { fontFamily: fonts.regular, fontSize: 14 }]}>Scan cards to save contacts</Text>
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