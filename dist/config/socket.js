"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = initializeSocket;
exports.getSocketIO = getSocketIO;
// Configuração do Socket.IO
const socket_io_1 = require("socket.io");
let io = null;
function initializeSocket(server) {
    io = new socket_io_1.Server(server, {
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
function getSocketIO() {
    if (!io) {
        throw new Error('Socket.IO não foi inicializado');
    }
    return io;
}
