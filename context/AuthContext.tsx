import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/lib/logger";
import { authService } from "@/services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const userData = await AsyncStorage.getItem("userData");
      
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      logger.error("Error checking auth status", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: any) => {
    try {
      // Extract user object if nested, otherwise use userData directly
      const user = userData.user || userData;
      const token = userData.token || userData.data?.token;
      
      // Store auth token and user data
      await AsyncStorage.setItem("authToken", token || "authenticated");
      await AsyncStorage.setItem("userData", JSON.stringify(user));
      setIsAuthenticated(true);
      setUser(user); // Store user object directly, not the whole userData
      
      logger.info('Login successful', {
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
      });
    } catch (error) {
      logger.error("Error during login", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call API to sign out from server
      try {
        await authService.logout();
      } catch (apiError) {
        // Even if API call fails, clear local storage
        logger.error("Error calling logout API", apiError);
      }
      
      // Clear local storage
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userData");
      
      // Update state
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      logger.error("Error during logout", error);
      // Clear local storage even if there's an error
      try {
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("userData");
        setIsAuthenticated(false);
        setUser(null);
      } catch (storageError) {
        logger.error("Error clearing storage", storageError);
      }
      throw error;
    }
  };

  const api = useMemo(
    () => ({
      isAuthenticated,
      user,
      login,
      logout,
      isLoading,
    }),
    [isAuthenticated, user, isLoading]
  );

  return (
    <AuthContext.Provider value={api}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

