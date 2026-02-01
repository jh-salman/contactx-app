import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/context/ThemeContext";

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useThemeColors();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect to tabs if authenticated
        router.replace("/(tabs)/cards");
      } else {
        // Redirect to login if not authenticated
        router.replace("/auth/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth status
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
