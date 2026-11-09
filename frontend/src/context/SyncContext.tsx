import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.js';

export interface SyncEvent {
  type: 'FILE_CREATED' | 'VERSION_UPLOADED' | 'RESOURCE_SHARED' | 'RESOURCE_DELETED' | 'PERMISSION_REVOKED' | 'CONNECTED';
  resourceType?: 'file' | 'folder';
  resourceId?: string;
  resourceName?: string;
  parentId?: string | null;
  actorId?: string;
  timestamp?: string;
  data?: any;
}

interface SyncContextType {
  lastEvent: SyncEvent | null;
  isConnected: boolean;
}

const SyncContext = createContext<SyncContextType>({ lastEvent: null, isConnected: false });

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const [lastEvent, setLastEvent] = useState<SyncEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem('opera_drive_token');
    if (!token) return;

    let isUnmounted = false;
    let reconnectTimeout: any = null;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:4000/api/v1/sync/ws?token=${encodeURIComponent(token!)}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isUnmounted) setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: SyncEvent = JSON.parse(event.data);
          if (!isUnmounted) {
            setLastEvent(data);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user]);

  return (
    <SyncContext.Provider value={{ lastEvent, isConnected }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
