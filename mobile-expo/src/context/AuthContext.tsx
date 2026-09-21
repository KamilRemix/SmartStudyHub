import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToAuthChanges, loginAsGuest, logout } from '../services/auth';
import type { User } from '../services/auth';
import { cloudSyncService } from '../services/cloudSync';

export interface AuthContextType {
  user: (User & { isOfflineDemo?: boolean }) | any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginAsGuest: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  loginAsGuest: async () => {},
  logoutUser: async () => {},
});

export const useAuth = (): AuthContextType => {
  return useContext(AuthContext);
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      if (currentUser?.uid && !currentUser?.isAnonymous && !currentUser?.isOfflineDemo) {
        cloudSyncService.syncAll(currentUser.uid).catch((err) => {
          console.warn('[AuthContext] background sync error:', err);
        });
      }
    });
    return unsubscribe;
  }, []);

  const handleLoginAsGuest = async () => {
    setIsLoading(true);
    try {
      const res = await loginAsGuest();
      if (res && 'user' in res) {
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginAsGuest: handleLoginAsGuest,
        logoutUser: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

