import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIO(io: Server): void {
  ioInstance = io;
}

export function getIO(): Server | null {
  return ioInstance;
}

export function isSocketInitialized(): boolean {
  return ioInstance !== null;
}
