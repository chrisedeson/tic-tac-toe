// frontend/app/contexts/SocketContext.tsx
import React, { createContext, useEffect, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { EVENTS } from '../../../backend/src/socket/events'; // Optional: use shared constants

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.id && user?.username) {
      const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        query: {
          userId: user.id,
          username: user.username,
        },
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('✅ Socket connected:', newSocket.id);
        newSocket.emit(EVENTS.USER_ONLINE, {
          userId: user.id,
          username: user.username,
        });
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        console.warn('⚠️ Socket disconnected:', reason);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        setIsConnected(false);
      };
    } else if (socket) {
      // Logout or auth cleared
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
