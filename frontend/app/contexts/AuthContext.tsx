// frontend/app/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react'
import api from '../services/api'; // Your API service

interface User {
  id: string;
  username: string;
  // other properties like wins, losses, etc. can be added later
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to load user from localStorage (e.g., if you store a session token or basic info)
    if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('ticTacToeUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }
  setIsLoading(false);
}, []);

  const login = async (name: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { name });
      const userData: User = response.data.user; // Assuming backend returns { user: {id, username} }
      setUser(userData);
      localStorage.setItem('ticTacToeUser', JSON.stringify(userData));
    } catch (error) {
      console.error("Login failed:", error);
      // Handle error (e.g., show notification)
      throw error; // Re-throw to allow component to handle it
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ticTacToeUser');
    // Notify backend/socket that user is logging out if necessary
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};