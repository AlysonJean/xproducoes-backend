import cron from 'node-cron';
import { prisma } from '../config/prisma';
import logger from '../config/logger';
import instagramService from '../services/social/InstagramService';

// Run every 2 minutes to respect rate limits
const POLL_INTERVAL = '*/2 * * * *'; 

export const startSocialScheduler = () => {
    logger.info('[SocialScheduler] Starting scheduler...');
    
    cron.schedule(POLL_INTERVAL, async () => {
        logger.info('[SocialScheduler] Running polling job');
        try {
            // Fetch active walls (created in last 24h or explictly active?)
            // For now, fetch all that have 'hashtag' and connected credentials
            // Limit to simpler scope: 
            // 1. Walls updated recently OR 
            // 2. Just all active ones (assuming small number for now)
            
            // Let's iterate all standalone walls and active bookings
            const settings = await prisma.eventSocialSetting.findMany({
                where: {
                    // Optimized: Only fetch if we have either a user or a booking attached
                    OR: [
                        { userId: { not: null } },
                        { bookingId: { not: null } }
                    ]
                }
            });

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
        }
    });
};
