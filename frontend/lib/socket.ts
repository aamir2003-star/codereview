import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

let socketInstance: Socket | null = null;

export function getSocket(token?: string | null): Socket {
  const realToken = token && token !== 'cookie-session' ? token : undefined;
  const currentToken = (socketInstance?.auth as { token?: string } | undefined)?.token;

  if (!socketInstance || currentToken !== realToken) {
    if (socketInstance) {
      socketInstance.disconnect();
    }

    socketInstance = io(SOCKET_URL, {
      auth: realToken ? { token: realToken } : {},
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }

  if (socketInstance.disconnected) {
    socketInstance.connect();
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
