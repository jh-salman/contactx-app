import { ThemeMode } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme, useThemeColors, useThemeFonts } from '@/context/ThemeContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const fonts = useThemeFonts();
  const { isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

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
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.input,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    headerTitle: {
      marginLeft: 16,
    },
    content: {
      padding: 16,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.input,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    settingItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingLabel: {
      marginLeft: 12,
      flex: 1,
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.input,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    themeOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.background,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    themeOptionContent: {
      marginLeft: 12,
      flex: 1,
    },
    themeOptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    themeOptionSubtitle: {
      fontSize: 12,
    },
    logoutButton: {
      backgroundColor: colors.primaryDark,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginTop: 20,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    logoutButtonText: {
      color: colors.buttonPrimaryText, // Dynamic button text color
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: fonts.bold, fontSize: 32, color: colors.text }]}>
            Settings
          </Text>
        </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Theme Mode Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 20, color: colors.text }]}>
            Theme Mode
          </Text>

          {/* Light Mode */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              themeMode === 'light' && styles.themeOptionSelected,
            ]}
            onPress={() => handleThemeModeChange('light')}
          >
            <MaterialIcons
              name="light-mode"
              size={24}
              color={themeMode === 'light' ? colors.primary : colors.placeholder}
            />
            <View style={styles.themeOptionContent}>
              <Text style={[styles.themeOptionTitle, { fontFamily: fonts.medium, fontSize: 16, color: colors.text }]}>
                Light
              </Text>
              <Text style={[styles.themeOptionSubtitle, { fontFamily: fonts.regular, fontSize: 12, color: colors.placeholder }]}>
                Always use light theme
              </Text>
            </View>
            {themeMode === 'light' && (
              <MaterialIcons name="check-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* Dark Mode */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              themeMode === 'dark' && styles.themeOptionSelected,
            ]}
            onPress={() => handleThemeModeChange('dark')}
          >
            <MaterialIcons
              name="dark-mode"
              size={24}
              color={themeMode === 'dark' ? colors.primary : colors.placeholder}
            />
            <View style={styles.themeOptionContent}>
              <Text style={[styles.themeOptionTitle, { fontFamily: fonts.medium, fontSize: 16, color: colors.text }]}>
                Dark
              </Text>
              <Text style={[styles.themeOptionSubtitle, { fontFamily: fonts.regular, fontSize: 12, color: colors.placeholder }]}>
                Always use dark theme
              </Text>
            </View>
            {themeMode === 'dark' && (
              <MaterialIcons name="check-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* Auto Mode */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              themeMode === 'auto' && styles.themeOptionSelected,
            ]}
            onPress={() => handleThemeModeChange('auto')}
          >
            <MaterialIcons
              name="brightness-auto"
              size={24}
              color={themeMode === 'auto' ? colors.primary : colors.placeholder}
            />
            <View style={styles.themeOptionContent}>
              <Text style={[styles.themeOptionTitle, { fontFamily: fonts.medium, fontSize: 16, color: colors.text }]}>
                Auto
              </Text>
              <Text style={[styles.themeOptionSubtitle, { fontFamily: fonts.regular, fontSize: 12, color: colors.placeholder }]}>
                Follow system setting
              </Text>
            </View>
            {themeMode === 'auto' && (
              <MaterialIcons name="check-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Toggle Section */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <MaterialIcons name="palette" size={24} color={colors.primary} />
              <Text style={[styles.settingLabel, { fontFamily: fonts.regular, fontSize: 16, color: colors.text }]}>
                Quick Toggle Theme
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isDark ? colors.primary : colors.input}
            />
          </View>
        </View>

        {/* Share Requests Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fonts.medium, fontSize: 20, color: colors.text }]}>
            Contact Sharing
          </Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/visitor-share-requests' as any)}
          >
            <View style={styles.settingItemLeft}>
              <MaterialIcons name="person-add" size={24} color={colors.primary} />
              <Text style={[styles.settingLabel, { fontFamily: fonts.regular, fontSize: 16, color: colors.text }]}>
                Share Requests
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <View style={[styles.settingItemLeft, { justifyContent: 'center' }]}>
              <MaterialIcons name="logout" size={24} color={colors.buttonPrimaryText} />
              <Text style={[styles.logoutButtonText, { marginLeft: 12, fontFamily: fonts.medium }]}>
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

