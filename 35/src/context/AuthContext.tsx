import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/models';
import { AuthService } from '../services/AuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await SecureStore.getItemAsync('user_data');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await AuthService.login(email, password);
    setUser(result.user);
    await SecureStore.setItemAsync('user_data', JSON.stringify(result.user));
    await SecureStore.setItemAsync('auth_token', result.token);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const result = await AuthService.register(email, password, name);
    setUser(result.user);
    await SecureStore.setItemAsync('user_data', JSON.stringify(result.user));
    await SecureStore.setItemAsync('auth_token', result.token);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await SecureStore.deleteItemAsync('user_data');
    await SecureStore.deleteItemAsync('auth_token');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
