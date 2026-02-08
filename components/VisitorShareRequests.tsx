import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { useThemeColors, useThemeFonts } from '@/context/ThemeContext'
import { logger } from '@/lib/logger'
import { apiService } from '@/services/apiService'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from 'expo-router'

export default function VisitorShareRequests() {
  const [shares, setShares] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const colors = useThemeColors()
  const fonts = useThemeFonts()

  const fetchShares = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      const response = await apiService.getPendingVisitorShares()
      const sharesData = response.data || response || []
      setShares(Array.isArray(sharesData) ? sharesData : [])
    } catch (error: any) {
      logger.error('Error fetching shares', error)
      Alert.alert('Error', 'Failed to load share requests')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchShares()
    }, [])
  )

  const handleApprove = async (shareId: string) => {
    Alert.alert(
      'Approve Share',
      'Save this visitor\'s contact to your contacts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await apiService.approveVisitorShare(shareId)
              Alert.alert('Success', 'Visitor contact saved successfully!')
              fetchShares()
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to approve')
            }
          }
        }
      ]
    )
  }

  const handleReject = async (shareId: string) => {
    Alert.alert(
      'Reject Share',
      'Are you sure you want to reject this share request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.rejectVisitorShare(shareId)
              Alert.alert('Rejected', 'Share request rejected')
              fetchShares()
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to reject')
            }
          }
        }
      ]
    )
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      fontFamily: fonts.bold,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
      fontFamily: fonts.regular,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      fontFamily: fonts.regular,
    },
    shareItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.card,
    },
    shareHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    shareName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 12,
      flex: 1,
      fontFamily: fonts.medium,
    },
    shareInfo: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      fontFamily: fonts.regular,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    approveButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    rejectButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.error,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.buttonPrimaryText,
      fontFamily: fonts.medium,
    },
  })

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Share Requests</Text>
        <Text style={styles.subtitle}>Visitors who want to share their contact</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchShares(true)
            }}
          />
        }
      >
        {shares.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-off" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No pending share requests</Text>
          </View>
        ) : (
          shares.map((share) => (
            <View key={share.id} style={styles.shareItem}>
              <View style={styles.shareHeader}>
                <MaterialCommunityIcons name="account" size={32} color={colors.primary} />
                <Text style={styles.shareName}>
                  {share.visitorCard?.personalInfo?.firstName || ''} {share.visitorCard?.personalInfo?.lastName || ''}
                </Text>
              </View>
              <Text style={styles.shareInfo}>
                Phone: {share.visitorCard?.personalInfo?.phoneNumber || 'N/A'}
              </Text>
              <Text style={styles.shareInfo}>
                Email: {share.visitorCard?.personalInfo?.email || 'N/A'}
              </Text>
              {share.location?.city && (
                <Text style={styles.shareInfo}>
                  Location: {share.location.city}, {share.location.country}
                </Text>
              )}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(share.id)}
                >
                  <Text style={styles.buttonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(share.id)}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}







