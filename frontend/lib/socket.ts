import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

let socketInstance: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socketInstance || (token && socketInstance.auth && (socketInstance.auth as { token: string }).token !== token)) {
    if (socketInstance) {
      socketInstance.disconnect();
    }

    socketInstance = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
