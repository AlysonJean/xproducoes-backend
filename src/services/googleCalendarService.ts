import { google } from 'googleapis';
import { prisma } from '../config/prisma';
import logger from '../config/logger';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export class GoogleCalendarService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Gera a URL para o usuário autorizar
  generateAuthUrl(userId: string) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Importante para receber refresh_token
      scope: SCOPES,
      state: userId, // Passamos o ID do usuário para saber quem é no callback
      prompt: 'consent' // Força o Google a pedir consentimento (e refresh token) novamente
    });
  }

  // Processa o callback do Google
  async handleCallback(code: string, userId: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Salva no banco
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleRefreshToken: tokens.refresh_token,
          // Opcional: Pegar o email do usuário do token ID se necessário
        }
      });
      
      // Busca informações do perfil para salvar o email do calendário (UX)
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      if (userInfo.data.email) {
        await prisma.user.update({
          where: { id: userId },
          data: { googleCalendarEmail: userInfo.data.email }
        });
      }

      return true;
    } catch (error) {
      logger.error('Erro ao autenticar com Google Calendar', error);
      throw new Error('Falha na integração com Google Calendar');
    }
  }

  // Cria um evento no calendário do usuário
  async createEvent(userId: string, eventData: any) {
    try {
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { googleRefreshToken: true }
      });

      if (!user?.googleRefreshToken) {
        logger.warn(`Usuário ${userId} tentou criar evento mas não tem calendário conectado.`);
        return null;
      }

      // Configura credenciais com Refresh Token (Access Token é gerado auto)
      this.oauth2Client.setCredentials({
        refresh_token: user.googleRefreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: new Date(eventData.startDate).toISOString(),
        },
        end: {
          dateTime: new Date(eventData.endDate).toISOString(),
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      return response.data;
    } catch (error) {
      logger.error(`Erro ao criar evento para usuário ${userId}`, error);
      // Não joga erro para não travar o fluxo principal do app (soft fail)
      return null;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
