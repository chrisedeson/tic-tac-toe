// frontend/app/contexts/SocketContext.tsx
import React, { createContext, useEffect, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { EVENTS } from '../../../backend/src/socket/events';

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

  // Presence tracking
  useEffect(() => {
    if (!(isAuthenticated && user?.userID)) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const sendPresence = async (status: 'online' | 'offline') => {
      try {
        await fetch(`${apiUrl}/api/users/${user.userID}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            lastSeen: status === 'offline' ? new Date().toISOString() : undefined,
          }),
        });
      } catch (err) {
      }
    };

    // Visibility change
    const onVisibilityChange = () => {
      sendPresence(document.hidden ? 'offline' : 'online');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Before unload
    const onBeforeUnload = () => {
      navigator.sendBeacon(
        `${apiUrl}/api/users/${user.userID}/presence`,
        JSON.stringify({ status: 'offline', lastSeen: new Date().toISOString() })
      );
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // Initial mark online
    sendPresence('online');

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      sendPresence('offline');
    };
  }, [isAuthenticated, user]);

  // Socket connection
  useEffect(() => {
    if (isAuthenticated && user?.userID && user.username) {
      const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        query: {
          userId: user.userID,
          username: user.username,
        },
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        newSocket.emit(EVENTS.USER_ONLINE, {
          userId: user.userID,
          username: user.username,
        });
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        setIsConnected(false);
      };
    } else if (socket) {
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
