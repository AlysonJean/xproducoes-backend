/**
 * 📧 JOB QUEUE CONFIGURATION
 * Sistema de filas para processamento assíncrono com BullMQ
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import logger from './logger';

// Conexão Redis
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // BullMQ requer isso
    enableReadyCheck: false,
  });
};

// Configuração padrão para filas
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 24 * 3600, // 24 horas
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // 7 dias
  },
};

// ==========================================
// TIPOS DE JOBS
// ==========================================

export interface EmailJobData {
  type: 'password-reset' | 'verification' | 'notification' | 'booking-confirmation' | 'welcome';
  to: string;
  subject?: string;
  templateData: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ==========================================
// FILAS
// ==========================================

let emailQueue: Queue<EmailJobData> | null = null;
let notificationQueue: Queue<NotificationJobData> | null = null;
let emailWorker: Worker<EmailJobData> | null = null;
let notificationWorker: Worker<NotificationJobData> | null = null;

// Inicializar filas apenas se Redis estiver disponível
export async function initializeQueues(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Em desenvolvimento sem Redis, usar processamento síncrono
  if (!isProduction && !process.env.REDIS_URL) {
    logger.info('Redis not configured - email jobs will run synchronously');
    return;
  }

  try {
    const connection = getRedisConnection();
    
    // Fila de emails
    emailQueue = new Queue<EmailJobData>('email', {
      connection,
      defaultJobOptions,
    });

    // Fila de notificações
    notificationQueue = new Queue<NotificationJobData>('notifications', {
      connection,
      defaultJobOptions,
    });

    logger.info('Job queues initialized successfully');

    // Inicializar workers
    await initializeWorkers(connection);
  } catch (error) {
    logger.error({ error }, 'Failed to initialize job queues - falling back to sync processing');
  }
}

// ==========================================
// WORKERS
// ==========================================

async function initializeWorkers(connection: IORedis): Promise<void> {
  // Worker de emails
  emailWorker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      logger.info({ jobId: job.id, type: job.data.type }, 'Processing email job');
      
      const emailService = (await import('../services/emailService')).default;
      const { type, to, templateData } = job.data;

      switch (type) {
        case 'password-reset':
          await emailService.sendPasswordResetEmail(
            to,
            templateData.name as string,
            templateData.resetUrl as string,
            templateData.ipAddress as string | undefined,
            templateData.userAgent as string | undefined
          );
          break;
        
        case 'verification':
          await emailService.sendVerificationEmail(to, templateData.verifyUrl as string);
          break;
        
        case 'notification':
          // Usar sendMail genérico para notificações
          await emailService.sendMail(
            to,
            templateData.subject as string,
            templateData.message as string
          );
          break;

        case 'booking-confirmation':
          await emailService.sendBookingConfirmation(
            templateData.user,
            templateData.booking
          );
          break;
        
        case 'welcome':
          // Usar sendMail para boas-vindas
          await emailService.sendMail(
            to,
            'Bem-vindo à X Produções!',
            `<h1>Olá ${templateData.name}!</h1><p>Seja bem-vindo à X Produções e Eventos.</p>`
          );
          break;

        default:
          logger.warn({ type }, 'Unknown email job type');
      }

      return { sent: true, to, type };
    },
    {
      connection,
      concurrency: 5,
    }
  );

  emailWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Email job completed');
  });

  emailWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Email job failed');
  });

  // Worker de notificações
  notificationWorker = new Worker<NotificationJobData>(
    'notifications',
    async (job: Job<NotificationJobData>) => {
      logger.info({ jobId: job.id, type: job.data.type }, 'Processing notification job');
      
      // Implementar lógica de notificação (push, socket, etc.)
      // Por enquanto, apenas logar
      logger.info({ notification: job.data }, 'Notification processed');

      return { processed: true };
    },
    {
      connection,
      concurrency: 10,
    }
  );

  logger.info('Job workers started');
}

// ==========================================
// API PÚBLICA
// ==========================================

/**
 * Adiciona um job de email à fila (ou processa sincronamente se Redis não disponível)
 */
export async function queueEmail(data: EmailJobData): Promise<void> {
  if (emailQueue) {
    await emailQueue.add(data.type, data, {
      priority: data.type === 'password-reset' ? 1 : 2, // Password reset tem prioridade
    });
    logger.debug({ type: data.type, to: data.to }, 'Email job queued');
  } else {
    // Fallback: processar sincronamente
    logger.debug({ type: data.type, to: data.to }, 'Processing email synchronously (no queue)');
    const emailService = (await import('../services/emailService')).default;
    
    try {
      switch (data.type) {
        case 'password-reset':
          await emailService.sendPasswordResetEmail(
            data.to,
            data.templateData.name as string,
            data.templateData.resetUrl as string,
            data.templateData.ipAddress as string | undefined,
            data.templateData.userAgent as string | undefined
          );
          break;
        case 'verification':
          await emailService.sendVerificationEmail(data.to, data.templateData.verifyUrl as string);
          break;
        case 'welcome':
          await emailService.sendMail(
            data.to,
            'Bem-vindo à X Produções!',
            `<h1>Olá ${data.templateData.name}!</h1><p>Seja bem-vindo à X Produções e Eventos.</p>`
          );
          break;
        // Outros tipos...
      }
    } catch (error) {
      logger.warn({ error, type: data.type }, 'Email send failed (non-blocking)');
    }
  }
}

/**
 * Adiciona um job de notificação à fila
 */
export async function queueNotification(data: NotificationJobData): Promise<void> {
  if (notificationQueue) {
    await notificationQueue.add(data.type, data);
    logger.debug({ type: data.type, userId: data.userId }, 'Notification job queued');
  } else {
    logger.debug({ notification: data }, 'Notification logged (no queue)');
  }
}

/**
 * Obter status das filas
 */
export async function getQueueStats(): Promise<{
  email: { waiting: number; active: number; completed: number; failed: number } | null;
  notifications: { waiting: number; active: number; completed: number; failed: number } | null;
}> {
  const getStats = async (queue: Queue | null) => {
    if (!queue) return null;
    
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  };

  return {
    email: await getStats(emailQueue),
    notifications: await getStats(notificationQueue),
  };
}

/**
 * Fechar conexões gracefully
 */
export async function closeQueues(): Promise<void> {
  const closeTasks = [];
  
  if (emailWorker) closeTasks.push(emailWorker.close());
  if (notificationWorker) closeTasks.push(notificationWorker.close());
  if (emailQueue) closeTasks.push(emailQueue.close());
  if (notificationQueue) closeTasks.push(notificationQueue.close());
  
  await Promise.all(closeTasks);
  logger.info('Job queues closed');
}
