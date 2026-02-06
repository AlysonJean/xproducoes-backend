import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import logger from '../config/logger';
import { getSocketIO } from '../config/socket'; // Assuming this exists or similar getter
import { triggerImmediateSync } from '../config/jobQueue';
import { SocialPostStatus } from '@prisma/client';

export class SocialController {
    
    // --- Admin Endpoints ---

    /**
     * GET /api/admin/social/posts
     * Fetch posts for moderation
     */
    async getPosts(req: Request, res: Response) {
        try {
            const getParam = (p: any): string | undefined => typeof p === 'string' ? p : undefined;
            
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 50;
            const status = req.query.status as SocialPostStatus | undefined;
            
            const eventId = getParam(req.query.eventId);
            const slug = getParam(req.query.slug);
            const querySettingId = getParam(req.query.settingId);
            
            const where: any = {};
            
            // Resolve Setting ID
            let settingId: string | undefined;

            if (eventId) {
                const setting = await prisma.eventSocialSetting.findFirst({
                    where: { bookingId: eventId }
                });
                if (setting) settingId = setting.id;
            } else if (slug) {
                const setting = await prisma.eventSocialSetting.findUnique({
                    where: { slug }
                });
                if (setting) settingId = setting.id;
            } else if (querySettingId) {
                settingId = querySettingId;
            }

            if (!settingId) {
                 return res.json({ data: [], meta: { total: 0, page: 1 } });
            }

            where.settingId = String(settingId);
            
            if (status) {
                where.status = status;
            }

            const posts = await prisma.socialPost.findMany({
                where,
                orderBy: { postedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            });

            const total = await prisma.socialPost.count({ where });

            res.json({
                data: posts,
                settingId, // Return for frontend context
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            logger.error({ error }, 'Error fetching social posts');
            res.status(500).json({ error: 'Failed to fetch posts' });
        }
    }

    /**
     * GET /api/social/leaderboard
     * Get top contributors
     */
    async getLeaderboard(req: Request, res: Response) {
        try {
            const getParam = (p: any): string | undefined => typeof p === 'string' ? p : undefined;
            const eventId = getParam(req.query.eventId);
            const slug = getParam(req.query.slug);
            const settingId = getParam(req.query.settingId);

            let targetSettingId: string | undefined = settingId;

            if (!targetSettingId) {
                if (eventId) {
                    const setting = await prisma.eventSocialSetting.findFirst({ where: { bookingId: eventId } });
                    if (setting) targetSettingId = setting.id;
                } else if (slug) {
                    const setting = await prisma.eventSocialSetting.findUnique({ where: { slug } });
                    if (setting) targetSettingId = setting.id;
                }
            }

            if (!targetSettingId) return res.status(400).json({ error: 'Setting context required' });

            // Group by author and count posts
            const groupResult = await prisma.socialPost.groupBy({
                by: ['author'],
                where: { 
                    settingId: targetSettingId,
                    status: 'APPROVED'
                },
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: 5
            });

            // Now we need to fetch the latest avatar for each author
            // This is N+1 but for top 5 it's negligible.
            const leaderboard = await Promise.all(groupResult.map(async (item) => {
                const recentPost = await prisma.socialPost.findFirst({
                    where: { 
                        settingId: targetSettingId,
                        author: item.author,
                        status: 'APPROVED'
                    },
                    orderBy: { postedAt: 'desc' },
                    select: { mediaUrl: true } // We don't have authorImage field! We have to infer or use recent post image as avatar?
                    // Actually, Instagram Graph API returns User Info, but we might not store it explicitly as `authorImage`.
                    // Checking schema... Schema has `author` but no `authorAvatar`.
                    // Plan: Use the image of their LATEST post as the "Avatar" for now, or use a placeholder.
                    // Ideally we should have stored authorAvatar. 
                    // For now, let's use a generic avatar or the post image itself if we want to be fancy?
                    // Let's use the mediaUrl of their latest post as the "background" of their badge, or no avatar.
                    // User Request: "Leaderboard of Contributors".
                    // I will return the latest post image as a proxy for visual interest.
                });

                return {
                    username: item.author,
                    avatarUrl: recentPost?.mediaUrl, // Using latest post visual
                    count: item._count.id
                };
            }));

            res.json({ data: leaderboard });
        } catch (error) {
            logger.error({ error }, 'Error fetching leaderboard');
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }

    /**
     * PUT /api/admin/social/posts/:id/moderate
     * Approve or Reject a post
     */
    async moderatePost(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const status = String(req.body.status); // APPROVED | REJECTED

            if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const post = await prisma.socialPost.update({
                where: { id: String(id) },
                data: { 
                    status: status as SocialPostStatus,
                    moderatedBy: (req as any).user?.id,
                    moderatedAt: new Date()
                },
                include: { setting: true }
            });

            // Real-time Update Logic using Socket.io
            // Emit to event-specific room - now using settingId for room if possible, or fallback to event:{id} for legacy?
            // Let's standardise on `wall:{settingId}` but keep `event:{bookingId}` for backward compat if booking exists.
            
            const io = getSocketIO();
            const setting = (post as any).setting; // Requires include: { setting: true } which we did
            
            if (post.status === 'APPROVED') {
                 if (setting) {
                    // Standard Room
                    io.to(`wall:${setting.id}`).emit('post:new', post);
                    
                    // Legacy/Booking Room
                    if (setting.bookingId) {
                        io.to(`event:${setting.bookingId}`).emit('post:new', post);
                    }
                    
                    logger.info({ settingId: setting.id, postId: post.id }, 'Emitted post:new event');
                 }
            } else if (post.status === 'REJECTED' || post.status === 'PENDING') {
                 if (setting) {
                    io.to(`wall:${setting.id}`).emit('post:remove', { id: post.id });
                    if (setting.bookingId) {
                        io.to(`event:${setting.bookingId}`).emit('post:remove', { id: post.id });
                    }
                 }
            }

            res.json({ data: post });
        } catch (error) {
            logger.error({ error }, 'Error moderating post');
            res.status(500).json({ error: 'Failed to moderate post' });
        }
    }

    /**
     * POST /api/admin/social/sync
     * Trigger manual sync
     */
    async syncNow(req: Request, res: Response) {
        try {
            const { eventId, settingId } = req.body;
            let setting;

            if (settingId) {
                setting = await prisma.eventSocialSetting.findUnique({ where: { id: settingId } });
            } else if (eventId) {
                setting = await prisma.eventSocialSetting.findFirst({ where: { bookingId: eventId } });
            }
            
            if (!setting) return res.status(404).json({ error: 'Settings not found' });

            await triggerImmediateSync({
                settingId: setting.id,
                hashtag: setting.hashtag
            });

            res.json({ message: 'Sync triggered' });
        } catch {
             res.status(500).json({ error: 'Sync failed' });
        }
    }

    /**
     * POST /api/admin/social/create
     * Create a new Standalone Social Wall
     */
    async createWall(req: Request, res: Response) {
        try {
            const { name, slug, hashtag, autoApprove } = req.body;

            // Basic validation
            if (!hashtag) return res.status(400).json({ error: 'Hashtag is required' });

            // Ensure unique slug if provided
            if (slug) {
                const existing = await prisma.eventSocialSetting.findUnique({ where: { slug } });
                if (existing) return res.status(400).json({ error: 'Slug already taken' });
            }

            const wall = await prisma.eventSocialSetting.create({
                data: {
                    name: name || 'Untitled Wall',
                    slug: slug || undefined,
                    hashtag,
                    autoApprove: !!autoApprove,
                    layoutMode: req.body.layoutMode || 'LANDSCAPE',
                    
                    // Mosaic Features
                    enableMosaic: req.body.enableMosaic !== undefined ? req.body.enableMosaic : true,
                    mosaicFrequency: Number(req.body.mosaicFrequency) || 15,

                    // Gamification
                    enableGamification: req.body.enableGamification !== undefined ? Boolean(req.body.enableGamification) : false,

                    bookingId: null, // Explicitly null for standalone
                    userId: (req as any).user?.id, // Link to creator

                    sponsors: req.body.sponsorIds ? {
                        connect: req.body.sponsorIds.map((id: string) => ({ id }))
                    } : undefined
                }
            });

            res.json({ data: wall });
        } catch (err) {
            logger.error({ error: err }, 'Error creating social wall');
            res.status(500).json({ error: 'Failed to create social wall' });
        }
    }

    /**
     * GET /api/admin/social/walls
     * List all social walls
     */
    async listWalls(req: Request, res: Response) {
        try {
            const walls = await prisma.eventSocialSetting.findMany({
                orderBy: { createdAt: 'desc' },
                include: { booking: { select: { eventTitle: true, eventDate: true } } }
            });

            res.json({ data: walls });
        } catch {
             res.status(500).json({ error: 'Failed to list walls' });
        }
    }

    // --- Announcement Endpoints ---

    /**
     * GET /api/events/:id/social/announcements
     * List announcements for a setting
     */
    async getAnnouncements(req: Request, res: Response) {
        try {
            const { id } = req.params; // Can be eventId or settingId or slug? Plan said :id
            // Logic to resovle settingId similar to getPosts
            
            let settingId = String(id);

            // Check if it looks like an EventID (UUID vs CUID) or just try both
            const settingByEvent = await prisma.eventSocialSetting.findFirst({ where: { bookingId: String(id) } });
            if (settingByEvent) settingId = settingByEvent.id;

            const announcements = await prisma.socialAnnouncement.findMany({
                where: { settingId },
                orderBy: { createdAt: 'desc' }
            });

            res.json({ data: announcements });
        } catch (error) {
            logger.error({ error }, 'Error fetching announcements');
            res.status(500).json({ error: 'Failed to fetch announcements' });
        }
    }

    /**
     * POST /api/events/:id/social/announcements
     * Create announcement
     */
    async createAnnouncement(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { title, message, type, imageUrl, duration, frequency, isActive } = req.body;

            let settingId = String(id);
            const settingByEvent = await prisma.eventSocialSetting.findFirst({ where: { bookingId: String(id) } });
            if (settingByEvent) settingId = settingByEvent.id;

            const announcement = await prisma.socialAnnouncement.create({
                data: {
                    settingId,
                    title,
                    message,
                    type: type || 'TEXT',
                    imageUrl,
                    duration: Number(duration) || 10,
                    frequency: Number(frequency) || 10,
                    isActive: isActive !== undefined ? isActive : true
                }
            });

            res.json({ data: announcement });
        } catch (error) {
             logger.error({ error }, 'Error creating announcement');
             res.status(500).json({ error: 'Failed to create announcement' });
        }
    }

    /**
     * PUT /api/announcements/:id
     * Update announcement
     */
    async updateAnnouncement(req: Request, res: Response) {
         try {
            const { id } = req.params;
            const data = req.body;

            const announcement = await prisma.socialAnnouncement.update({
                where: { id: String(id) },
                data: {
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    imageUrl: data.imageUrl,
                    duration: data.duration ? Number(data.duration) : undefined,
                    frequency: data.frequency ? Number(data.frequency) : undefined,
                    isActive: data.isActive
                }
            });

            res.json({ data: announcement });
         } catch {
             res.status(500).json({ error: 'Failed to update announcement' });
         }
    }

    /**
     * DELETE /api/announcements/:id
     * Delete announcement
     */
    async deleteAnnouncement(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.socialAnnouncement.delete({ where: { id: String(id) } });
            res.json({ success: true });
        } catch {
            res.status(500).json({ error: 'Failed to delete announcement' });
        }
    }

    // --- TV Endpoints ---

    /**
     * POST /api/tv/pair
     * Pair a TV using a short code
     */
    async pairDevice(req: Request, res: Response) {
        try {
            const { pairingCode, eventId, deviceName, settingId } = req.body;
            
            // Determine the target settingId
            let targetSettingId: string | undefined = settingId;

            if (eventId && !targetSettingId) {
                const setting = await prisma.eventSocialSetting.findFirst({
                    where: { bookingId: eventId }
                });
                if (setting) {
                    targetSettingId = setting.id;
                } else {
                    return res.status(404).json({ error: 'Event social settings not found for the provided eventId.' });
                }
            }

            if (!targetSettingId) {
                return res.status(400).json({ error: 'Either eventId or settingId must be provided for pairing.' });
            }

            // Implementing the Admin side of pairing here:
            const device = await prisma.tVDevice.upsert({
                where: { pairingCode },
                update: {
                    bookingId: eventId || null, // Optional
                    settingId: targetSettingId,
                    name: deviceName,
                    lastSeen: new Date()
                },
                create: {
                    pairingCode,
                    bookingId: eventId || null,
                    settingId: targetSettingId,
                    name: deviceName || 'New TV'
                }
            });
            
            res.json({ data: device });
        } catch (error) {
             logger.error({ error }, 'Error pairing device');
             res.status(500).json({ error: 'Pairing failed' });
        }
    }

    /**
     * GET /api/tv/config
     * Called by TV to check status
     */
    async getDeviceConfig(req: Request, res: Response) {
         try {
            const getParam = (p: any): string | undefined => typeof p === 'string' ? p : undefined;
            const pairingCode = getParam(req.query.pairingCode);
            const slug = getParam(req.query.slug);
            
            // 1. Support Public Slug Access
            if (slug) {
                const setting = await prisma.eventSocialSetting.findUnique({ 
                    where: { slug: String(slug) } 
                });
                
                if (!setting) {
                    return res.status(404).json({ error: 'Mural não encontrado' });
                }

                return res.json({ 
                    linked: true,
                    settingId: setting.id,
                    slug: setting.slug,
                    eventName: setting.name || 'Mural Social'
                });
            }

            // 2. Legacy/Device Pairing Code Access
            if (!pairingCode) return res.status(400).json({ error: 'Código de pareamento ou slug obrigatório' });

            const code = String(pairingCode);

            const device = await prisma.tVDevice.findUnique({
                where: { pairingCode: code },
                include: { booking: true }
            });

            if (!device || (!device.bookingId && !device.settingId)) {
                return res.json({ linked: false });
            }

            let settingId = device.settingId;
            let eventName = device.booking?.eventTitle || device.name || 'Evento';
            let settingSlug = null;

            // Resolve Setting if only bookingId is present (legacy)
            if (!settingId && device.bookingId) {
                 const setting = await prisma.eventSocialSetting.findFirst({ where: { bookingId: device.bookingId } });
                 if (setting) {
                     settingId = setting.id;
                     settingSlug = setting.slug;
                     // Auto-heal
                     await prisma.tVDevice.update({ where: { id: device.id }, data: { settingId } });
                 }
            } else if (settingId) {
                 const setting = await prisma.eventSocialSetting.findUnique({ where: { id: settingId } });
                 if (setting) {
                     eventName = setting.name || eventName;
                     settingSlug = setting.slug;
                 }
            }

            // Return the long-lived token (deviceToken) and event info
            res.json({ 
                linked: true,
                deviceToken: device.deviceToken,
                eventId: device.bookingId, // Keep for legacy
                settingId: settingId,      // New standard
                slug: settingSlug,
                eventName: eventName
            });

        } catch {
             res.status(500).json({ error: 'Falha ao carregar configuração' });
         }
    }
}

export default new SocialController();
