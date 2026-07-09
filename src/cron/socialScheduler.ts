import cron from 'node-cron';
import { prisma } from '../config/prisma';
import logger from '../config/logger';
import instagramService from '../services/social/InstagramService';
import { cacheService } from '../services/cacheService';

// Run every 2 minutes to respect rate limits
// Changed from '*/2 * * * *' (every 2 mins) to hourly to save Neon DB compute tier
const POLL_INTERVAL = '0 * * * *';

const LOCK_KEY = 'social-scheduler';
// Deve cobrir o tempo máximo esperado de uma execução — mesmo raciocínio de
// sendReminders.ts: rede de segurança caso o processo trave sem liberar o lock.
const LOCK_TTL_SECONDS = 10 * 60;

export const startSocialScheduler = () => {
    if (process.env.ENABLE_CRON_JOBS !== 'true') {
        logger.info('[SocialScheduler] Disabled (ENABLE_CRON_JOBS !== true). Skipping to save Neon DB compute hours.');
        return;
    }
    logger.info('[SocialScheduler] Starting scheduler...');

    cron.schedule(POLL_INTERVAL, async () => {
        // Lock distribuído (Redis em produção): o `isRunning` anterior era uma variável
        // local ao processo — não impede duas instâncias diferentes (ex.: durante um
        // rolling deploy) de rodarem este job ao mesmo tempo, consumindo rate limit da
        // API do Instagram em dobro e arriscando gravação duplicada.
        const acquired = await cacheService.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
        if (!acquired) {
            logger.warn('[SocialScheduler] Outra instância já está processando este ciclo. Pulando.');
            return;
        }

        try {
            // optimized: Only fetch settings that have a hashtag defined
            const settings = await prisma.eventSocialSetting.findMany({
                where: {
                    hashtag: { not: '' },
                    OR: [
                        { userId: { not: null } },
                        { bookingId: { not: null } }
                    ]
                }
            });

            if (settings.length === 0) {
                return; // Nothing to sync, avoid logging and API overhead
            }

            logger.info({ count: settings.length }, '[SocialScheduler] Running polling job');

            for (const setting of settings) {
                try {
                    logger.info({ settingId: setting.id }, '[SocialScheduler] Syncing wall');
                    const count = await instagramService.fetchRecentMedia(setting.id);
                    logger.info({ settingId: setting.id, newPosts: count }, '[SocialScheduler] Sync complete');
                } catch (err: any) {
                    logger.error({ settingId: setting.id, error: err.message }, '[SocialScheduler] Sync failed for wall');
                }
            }

        } catch (error) {
            logger.error({ error }, '[SocialScheduler] Job failed');
        } finally {
            await cacheService.releaseLock(LOCK_KEY);
        }
    });
};
