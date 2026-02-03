import CardItem from '@/components/card/CardItem'
import CreateCardItem from '@/components/card/CreateCardItem'
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const cards = () => {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const colors = useThemeColors()
  const fonts = useThemeFonts()
  const { isDark } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
 
  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    }
  })

  const hasLoadedRef = React.useRef(false)
  const isFetchingRef = React.useRef(false)
  const lastFetchTimeRef = React.useRef<number>(0)
  const FETCH_COOLDOWN = 3000 // 3 seconds cooldown between fetches

  const fetchCards = useCallback(async (force = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current && !force) {
      console.log('⏸️ Already fetching, skipping...')
      return
    }

    // Check cooldown period (unless forced)
    if (!force) {
      const now = Date.now()
      const timeSinceLastFetch = now - lastFetchTimeRef.current
      if (timeSinceLastFetch < FETCH_COOLDOWN && lastFetchTimeRef.current > 0) {
        console.log(`⏸️ Cooldown active (${Math.round((FETCH_COOLDOWN - timeSinceLastFetch) / 1000)}s remaining), skipping fetch`)
        return
      }
      lastFetchTimeRef.current = now
    }

    try {
      isFetchingRef.current = true
      setLoading(true)
      setError(null)
      
      // Fetch cards directly from API - no local storage caching
      const response = await apiService.getAllCards()
      console.log('📡 API Response:', {
        hasData: !!response.data,
        hasCards: !!response.cards,
        success: response.success,
        responseKeys: Object.keys(response)
      })
      
      // Handle different response structures
      const cardsData = response.data || response.cards || response || []
      console.log('📋 Cards data from API:', {
        isArray: Array.isArray(cardsData),
        length: Array.isArray(cardsData) ? cardsData.length : 0
      })
      
      // Set cards from API response
      if (Array.isArray(cardsData)) {
        setCards(cardsData)
        setError(null)
      } else {
        setCards([])
        setError(null)
      }
    } catch (err: any) {
      // Check if server returned success: true with empty data (graceful error handling)
      if (err.response?.data?.success === true && Array.isArray(err.response?.data?.data)) {
        setCards(err.response.data.data)
        setError(null)
        return
      }
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load cards'
      
      // Handle database errors (500) as empty state - server handles them gracefully
      if (err.response?.status === 500 || 
          errorMessage.toLowerCase().includes('column') ||
          errorMessage.toLowerCase().includes('table') ||
          errorMessage.toLowerCase().includes('database') ||
          errorMessage.toLowerCase().includes('prisma')) {
        // Server already handled the error gracefully, return empty array
        setCards([])
        setError(null)
        return
      }
      
      // Handle "No card found" as empty state, not an error
      if (errorMessage.toLowerCase().includes('no card found') || 
          errorMessage.toLowerCase().includes('no cards')) {
        setCards([])
        setError(null)
        return
      }
      
      // Only show error for actual errors (not database/500 errors)
      setError(errorMessage)
      // Don't show alert for database errors or "no cards found"
      if (!errorMessage.toLowerCase().includes('no card found') && 
          !errorMessage.toLowerCase().includes('no cards') &&
          !errorMessage.toLowerCase().includes('column') &&
          !errorMessage.toLowerCase().includes('table') &&
          !errorMessage.toLowerCase().includes('database') &&
          !errorMessage.toLowerCase().includes('prisma')) {
        Alert.alert(
          'Error',
          errorMessage
        )
      }
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedRef.current) {
      fetchCards(true) // Force initial fetch
      hasLoadedRef.current = true
    }
  }, [fetchCards])

  // Refresh cards when screen comes into focus, but respect cooldown period
  // This prevents excessive API calls when navigating between screens
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we've already loaded once
      if (hasLoadedRef.current) {
        // Add a small delay to ensure navigation animation completes
        const timeoutId = setTimeout(() => {
          fetchCards(false) // Don't force - respect cooldown
        }, 300)
        return () => clearTimeout(timeoutId)
      }
    }, [fetchCards])
  )

  // Expose refresh function for manual refresh (e.g., after create/update/delete)
  const refreshCards = useCallback(() => {
    lastFetchTimeRef.current = 0 // Reset cooldown
    fetchCards(true) // Force refresh
  }, [fetchCards])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.placeholder,
    },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      padding: 20,
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
      marginTop: 8,
    },
    createButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    header: {
      position: 'absolute',
      zIndex: 10,
    },
    settingsButton: {
      padding: 12,
      borderRadius: 24,
      backgroundColor: colors.input,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  })

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { fontFamily: fonts.regular, fontSize: 16 }]}>Loading cards...</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // Show error only if it's a real error (not "no cards found")
  if (error && cards.length === 0 && !error.toLowerCase().includes('no card found')) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={[styles.errorText, { color: colors.primaryDark, fontFamily: fonts.regular, fontSize: 16 }]}>{error}</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // Show empty state if no cards
  if (cards.length === 0 && !loading && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaView 
          style={{ flex: 1, justifyContent: "center", alignItems: "center", position: "relative" }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          {/* Settings Button - Positioned with safe area insets */}
          <View style={[
            styles.header,
            {
              top: insets.top + (Platform.OS === 'ios' ? 8 : 12),
              right: insets.right + 4,
            }
          ]}>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="settings" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.centerContent}>
            <MaterialCommunityIcons name="card-account-details-outline" size={64} color={colors.placeholder} />
            <Text style={[styles.emptyText, { fontFamily: fonts.medium, fontSize: 20 }]}>No cards found</Text>
            <Text style={[styles.emptySubText, { fontFamily: fonts.regular, fontSize: 14 }]}>Create your first card to get started</Text>
            <TouchableOpacity 
              style={[styles.createButton, { marginTop: 24 }]}
              onPress={() => router.push('/create-card')}
              activeOpacity={0.7}
            >
              <Text style={[styles.createButtonText, { color: colors.buttonPrimaryText, fontFamily: fonts.medium, fontSize: 16 }]}>Create Card</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // Prepare data with "Create New Card" as last item
  const cardsWithCreate = [...cards, { id: 'create-new-card', isCreateCard: true }]

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView 
        style={{ flex: 1, justifyContent: "center", alignItems: "center", position: "relative" }}
        edges={['top', 'bottom', 'left', 'right']}
      >
        {/* Settings Button - Positioned with safe area insets */}
        <View style={[
          styles.header,
          {
            top: insets.top + (Platform.OS === 'ios' ? 8 : 12),
            right: insets.right + 4,
          }
        ]}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="settings" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={{ height: "5%" }} />
        <View style={{ justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
          <Animated.FlatList
            data={cardsWithCreate}
            renderItem={({ item, index }) => {
              // If it's the create card item, render CreateCardItem
              if (item.isCreateCard) {
                return <CreateCardItem index={index} scrollX={scrollX} />
              }
              // Otherwise render normal CardItem
              return <CardItem item={item} index={index} scrollX={scrollX} onRefresh={refreshCards} />
            }}
            keyExtractor={(item, index) => {
              if (item.isCreateCard) {
                return 'create-new-card'
              }
              return item.id?.toString() || item._id?.toString() || `card-${index}`
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={{ backgroundColor: colors.background }}
          />
        </View>
      </SafeAreaView>
    </View>
  )
}

export default cards