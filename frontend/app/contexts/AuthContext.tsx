// frontend/app/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
} from 'react';
import type { ReactNode } from "react";
import api from '../services/api';
import type { User } from '../types'; // **FIX**: Import the updated User type.

// **REMOVED**: No longer need the local User interface definition.
// interface User { ... }

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (name: string) => Promise<void>;
  logout: () => void;
  updateUser: (newData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('ticTacToeUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (name: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { name });
      // The `userData` will now contain the full user object with scores.
      const userData: User = response.data.user;
      setUser(userData);
      localStorage.setItem('ticTacToeUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ticTacToeUser');
  };

  const updateUser = (newData: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...newData };
    setUser(updatedUser);
    localStorage.setItem('ticTacToeUser', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
