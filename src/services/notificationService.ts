import { getSocketIO } from "../config/socket";

export class NotificationService {
  /**
   * Envia uma notificação para um utilizador específico.
   * @param userId - O ID do utilizador que deve receber a notificação.
   * @param eventName - O nome do evento (ex: 'booking_confirmed').
   * @param data - Os dados a serem enviados com a notificação.
   */
  sendToUser(userId: string, eventName: string, data: any) {
    // O Socket.IO não tem um método direto para enviar para um userId.
    // Uma abordagem comum é fazer com que cada cliente, ao conectar-se,
    // entre numa "sala" com o seu próprio ID.
    // Por agora, vamos emitir para todos, e o frontend irá filtrar.
    try {
      getSocketIO().emit(eventName, { userId, ...data });
      console.log(
        `Notificação '${eventName}' enviada para o utilizador ${userId}`,
      );
    } catch (err) {
      console.error("Erro ao emitir notificação via Socket.IO:", err);
    }
  }
}
