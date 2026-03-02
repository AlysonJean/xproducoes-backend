import cron from 'node-cron';
import { prisma } from '../config/prisma';
import logger from '../config/logger';
import instagramService from '../services/social/InstagramService';

// Run every 2 minutes to respect rate limits
// Changed from '*/2 * * * *' (every 2 mins) to hourly to save Neon DB compute tier
const POLL_INTERVAL = '0 * * * *';

let isRunning = false;

export const startSocialScheduler = () => {
    logger.info('[SocialScheduler] Starting scheduler...');

    cron.schedule(POLL_INTERVAL, async () => {
        if (isRunning) {
            logger.warn('[SocialScheduler] Previous job is still processing. Skipping this cycle to save DB connections.');
            return;
        }

        isRunning = true;
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
            isRunning = false;
        }
    });
};
