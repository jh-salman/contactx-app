import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useThemeColors } from "@/context/ThemeContext";

export default function Index() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <Link href="/(tabs)/cards">Go to Cards</Link>
      <Link href="/auth/login">Go to Login</Link>
    </View>
  );
}
