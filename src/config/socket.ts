// Configuração do Socket.IO
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initializeSocket(server: any) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO não foi inicializado');
  }
  return io;
}
