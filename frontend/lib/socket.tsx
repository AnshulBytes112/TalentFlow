'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/authToken';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type SocketContextValue = {
  socket: Socket | null;
};

const SocketContext = createContext<SocketContextValue>({ socket: null });

let socketSingleton: Socket | null = null;

const getSocket = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!socketSingleton) {
    socketSingleton = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }

  return socketSingleton;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const accessToken = (session?.user as any)?.accessToken || getAccessToken();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const instance = getSocket();
    setSocket(instance);

    if (!instance) {
      return;
    }

    if (status === 'authenticated' && accessToken) {
      instance.auth = { token: accessToken };
      if (!instance.connected) {
        instance.connect();
      }
    } else if (instance.connected) {
      instance.disconnect();
    }

    return () => {
      instance.disconnect();
    };
  }, [accessToken, status]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext).socket;

export { getSocket };
