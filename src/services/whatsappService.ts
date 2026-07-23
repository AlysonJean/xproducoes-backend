import pkg from 'whatsapp-web.js';
import type { Client as ClientType, ClientOptions } from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import logger from '../config/logger.js';

class WhatsappService {
  private client: ClientType;
  private isReady = false;

  private currentQr: string | null = null;
  private listenersAttached = false;

  constructor() {
    const puppeteerOptions: NonNullable<ClientOptions['puppeteer']> = {
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--no-zygote',
        '--single-process', // Reduz overhead de múltiplos processos
        '--disable-extensions',
        '--disable-component-update',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--js-flags="--max-old-space-size=256"', // Limita heap do JS no Chromium
      ],
      headless: true
    };

    // No Render/Linux, o cache pode estar em um local fixo se configurado via .puppeteerrc
    logger.info('Inicializando cliente WhatsApp com Puppeteer...', {
      args: puppeteerOptions.args,
      node_env: process.env.NODE_ENV
    });

    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: puppeteerOptions
    });
  }

  // Achado (auditoria de produto): fora do modo dev, NADA no sistema chamava
  // initialize() — nem no boot (guardado a NODE_ENV==='development' logo abaixo desta
  // classe), nem restart()/logout() (que chamavam this.client.initialize() bruto,
  // pulando este método por completo). Resultado real em produção: os listeners
  // qr/ready/authenticated nunca eram anexados, então `isReady` nunca virava true, e
  // TODO envio de WhatsApp falhava silenciosamente ("Cliente não está pronto"),
  // independente de restart. Extraído para um método próprio, idempotente
  // (listenersAttached), para que restart()/logout() possam garantir que os listeners
  // existem sem depender de initialize() já ter rodado antes — e sem duplicar
  // listeners a cada novo restart.
  private attachListeners() {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    this.client.on('qr', (qr: string) => {
      logger.info('QR Code do WhatsApp gerado! Escaneie no terminal ou na página Admin:');
      this.currentQr = qr;
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      logger.info('Cliente WhatsApp está pronto!');
      this.isReady = true;
      this.currentQr = null;
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp autenticado com sucesso!');
      this.currentQr = null;
    });

    this.client.on('auth_failure', (msg: string) => {
      logger.error('Falha na autenticação do WhatsApp:', msg);
    });

    this.client.on('disconnected', (reason: string) => {
       logger.warn('WhatsApp desconectado:', reason);
       this.isReady = false;
       this.currentQr = null;
       // Opcional: Reiniciar automaticamente após desconexão
       // this.client.initialize();
    });
  }

  public initialize() {
    if (this.isReady || this.currentQr) return; // Already running or starting

    // Guard against OOM on Render free tier (512MB limit):
    // Chromium can spike to 500-800MB; restart when approaching limit.
    const memoryGuard = setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.heapUsed > 400 * 1024 * 1024) { // 400MB threshold
        logger.warn({ heapMB: Math.round(usage.heapUsed / 1024 / 1024) }, 'WhatsApp heap alto — reiniciando cliente');
        clearInterval(memoryGuard);
        void this.restart();
      }
    }, 30_000);
    // Don't keep event loop alive (Neon scale-to-zero)
    memoryGuard.unref();

    this.attachListeners();

    this.client.initialize().catch((err: unknown) => {
      logger.error('Erro ao inicializar cliente WhatsApp:', err);
    });
  }

  public async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.isReady) {
      logger.warn('Tentativa de envio de WhatsApp falhou: Cliente não está pronto.');
      return false;
    }

    try {
      // Formatação básica para número brasileiro (assumindo 55 se não tiver DDI)
      let phone = to.replace(/\D/g, '');
      
      if (phone.length === 0) return false;

      // Se tiver 10 ou 11 dígitos, assume BR e adiciona 55
      if (phone.length === 10 || phone.length === 11) {
        phone = `55${phone}`;
      }

      // Adiciona sufixo do ID do WhatsApp
      const chatId = `${phone}@c.us`;

      await this.client.sendMessage(chatId, message);
      logger.info(`WhatsApp enviado para ${phone}`);
      return true;

    } catch (error) {
      logger.error(`Erro ao enviar WhatsApp para ${to}:`, error);
      return false;
    }
  }

  public getStatus() {
      return {
          isReady: this.isReady,
          qrCode: this.currentQr
      };
  }

  public async logout() {
      try {
          await this.client.logout();
          this.isReady = false;
          this.currentQr = null;
          // Após logout, pode ser necessário reinicializar para gerar novo QR
          this.attachListeners();
          setTimeout(() => {
             this.client.initialize().catch((e: unknown) => logger.error('Erro ao reinicializar pós-logout', e));
          }, 1000);
          return true;
      } catch (error) {
          logger.error('Erro ao fazer logout do WhatsApp', error);
          return false;
      }
  }

  public async restart() {
      try {
          await this.client.destroy();
          this.isReady = false;
          this.currentQr = null;
          this.attachListeners();
          await this.client.initialize();
          return true;
      } catch (error) {
           logger.error('Erro ao reiniciar WhatsApp', error);
           return false;
      }
  }

  /**
   * Envia notificação de confirmação de reserva
   */
  public async sendBookingConfirmation(booking: {
    id: string;
    client?: ({ phone?: string | null; user?: ({ phone?: string | null } & Record<string, unknown>) | null } & Record<string, unknown>) | null;
    clientContact?: string | null;
    eventDate: Date | string;
    clientName?: string | null;
    eventTitle?: string | null;
    location?: string | null;
    totalPrice?: unknown;
  }) {
    // Tenta pegar telefone do cliente (user ou client profile)
    // BookingService usually provides populated bookings with client->user
    const clientPhone = booking.client?.phone || booking.client?.user?.phone || booking.clientContact;

    if (!clientPhone) {
      logger.warn(`Reserva ${booking.id} sem telefone para WhatsApp.`);
      return;
    }

    const eventDate = new Date(booking.eventDate).toLocaleDateString('pt-BR');
    const eventTime = new Date(booking.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const message = 
`🎉 *Reserva Confirmada!*

Olá *${booking.clientName || 'Cliente'}*,
Sua reserva para *${booking.eventTitle || 'Evento'}* foi confirmada.

📅 *Data:* ${eventDate} às ${eventTime}
📍 *Local:* ${booking.location || 'A definir'}
💲 *Valor:* R$ ${Number(booking.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

Acesse os detalhes em: ${process.env.FRONTEND_URL}/cliente/reservas/${booking.id}

Obrigado pela preferência! 🚀`;

    await this.sendMessage(clientPhone, message);
  }

  /**
   * Pede avaliação no Google após o evento concluído (achado: negócio pediu isso pra
   * ajudar no ranqueamento do "pacote local" do Google — avaliações recentes pesam muito
   * mais que SEO de conteúdo pra negócio local). Não bloqueia nem falha o fluxo se
   * GOOGLE_REVIEW_LINK não estiver configurado — só registra e não envia.
   */
  public async sendReviewRequest(booking: {
    id: string;
    client?: ({ phone?: string | null; user?: ({ phone?: string | null } & Record<string, unknown>) | null } & Record<string, unknown>) | null;
    clientContact?: string | null;
    clientName?: string | null;
    eventTitle?: string | null;
  }) {
    const reviewLink = process.env.GOOGLE_REVIEW_LINK;
    if (!reviewLink) {
      logger.debug('GOOGLE_REVIEW_LINK não configurado — pulando pedido de avaliação.');
      return;
    }

    const clientPhone = booking.client?.phone || booking.client?.user?.phone || booking.clientContact;
    if (!clientPhone) {
      logger.warn(`Reserva ${booking.id} sem telefone para pedido de avaliação.`);
      return;
    }

    const message =
`Olá *${booking.clientName || 'Cliente'}*! 🙌

Esperamos que seu evento${booking.eventTitle ? ` "${booking.eventTitle}"` : ''} tenha sido um sucesso!

Se puder dedicar 1 minutinho pra avaliar nosso trabalho no Google, isso ajuda demais a gente a chegar em mais gente:

⭐ ${reviewLink}

Muito obrigado pela confiança! 🙏`;

    await this.sendMessage(clientPhone, message);
  }
}

export const whatsappService = new WhatsappService();

// Inicializa automaticamente APENAS em desenvolvimento para economizar recursos no Render/Produção
// Em produção, o serviço deve ser iniciado via Admin ou quando houver mensagens pendentes
if (process.env.NODE_ENV === 'development' && !process.env.JEST_WORKER_ID) {
  whatsappService.initialize();
}
