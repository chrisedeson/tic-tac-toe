// frontend/app/contexts/SocketContext.tsx
import React, { createContext, useEffect, useState, useContext } from 'react';
import type { ReactNode } from 'react'
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext'; // To get user ID for socket query

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5173';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.id && user?.username) {
      const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: { userId: user.id, username: user.username } // Send user info on connection
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected:', newSocket.id);
        // Emit USER_ONLINE directly here as query params are for initial handshake
        newSocket.emit('user:online', { userId: user.id, username: user.username });
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        console.log('Socket disconnected:', reason);
        // USER_OFFLINE handled server-side on disconnect
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        setIsConnected(false);
      };
    } else if (socket) { // If user logs out, disconnect existing socket
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
    }
  }, [isAuthenticated, user]); // Reconnect if user changes

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};