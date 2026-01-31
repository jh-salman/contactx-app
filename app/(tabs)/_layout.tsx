// import { TabBarProvider, useTabBar } from '@/contexts/TabBarContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TabBarProvider, useTabBar } from '@/context/TabBar';
import { useThemeColors, useThemeFonts } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';



function TabsInner() {
  const { hidden } = useTabBar();
  const colors = useThemeColors();
  const fonts = useThemeFonts();
  const tabBarHeight = useSharedValue(70);

  useEffect(() => {
    tabBarHeight.value = withTiming(hidden ? 0 : 70, { duration: 250 });
  }, [hidden]);

  const animatedBarStyle = useAnimatedStyle(() => {
    const translateY = interpolate(tabBarHeight.value, [0, 70], [70, 0]);
    return {
      height: tabBarHeight.value,
      transform: [{ translateY }],
      opacity: tabBarHeight.value === 0 ? 0 : 1,
    };
  });

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarLabelStyle: { fontSize: 12 },
      })}
      tabBar={({ state, descriptors, navigation }) => (
        <Animated.View
          style={[
            animatedBarStyle,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.tabBar,
              borderTopWidth: 1,
              borderTopColor: colors.tabBarBorder,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
              paddingBottom: 6,
            },
          ]}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const color = isFocused ? colors.tabIconSelected : colors.tabIconDefault;
            const size = 24;

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={{ alignItems: 'center', flex: 1 }}
              >
                {options.tabBarIcon?.({ color, size, focused: isFocused })}
                <Text 
                  style={{ fontSize: 12, color, marginTop: 2, fontFamily: fonts.regular }}
                >
                  {options.title ?? route.name}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    >
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cards',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cards" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="qrcode-scan" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="contacts" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  const colors = useThemeColors();
  return (
    <ProtectedRoute>
      <TabBarProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <TabsInner />
        </View>
      </TabBarProvider>
    </ProtectedRoute>
  );
}