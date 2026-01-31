import VisitorShareRequests from '@/components/VisitorShareRequests'
import { useThemeColors } from '@/context/ThemeContext'
import { Stack } from 'expo-router'

export default function VisitorShareRequestsScreen() {
  const colors = useThemeColors()
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Share Requests', 
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }} 
      />
      <VisitorShareRequests />
    </>
  )
}



