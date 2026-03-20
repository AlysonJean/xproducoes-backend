import { SocialPostStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import logger from '../../config/logger';
import { UploadService } from '../uploadService';
import { NotFoundError } from '../../utils/errors';

const uploadService = new UploadService();

// Instagram Graph API types
interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  username: string;
  children?: {
    data: Array<{
      id: string;
      media_type: string;
      media_url: string;
    }>
  };
}

interface InstagramResponse {
  data: InstagramMedia[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export class InstagramService {
  private static readonly GRAPH_API_URL = 'https://graph.instagram.com/v18.0';

  /**
   * Fetch recent media for a specific event setting
   * @param settingId The ID of the EventSocialSetting
   */
  async fetchRecentMedia(settingId: string): Promise<number> {
    const setting = await prisma.eventSocialSetting.findUnique({
      where: { id: settingId },
      include: {
        user: {
           include: {
               socialCredentials: {
                   where: { platform: 'INSTAGRAM' },
                   take: 1
               }
           }
        },
        booking: {
          include: {
            creator: {
              include: {
                socialCredentials: {
                  where: { platform: 'INSTAGRAM' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!setting) {
      throw new NotFoundError(`EventSocialSetting ${settingId} not found`);
    }

    let credential;
    if (setting.booking?.creator?.socialCredentials?.[0]) {
        credential = setting.booking.creator.socialCredentials[0];
    } else if (setting.user?.socialCredentials?.[0]) {
        credential = setting.user.socialCredentials[0];
    }

    if (!credential) {
      logger.warn({ settingId }, 'No Instagram credentials found for event (checked creator and owner)');
      return 0;
    }

    // Determine the hashtag ID if not stored yet, or just search by hashtag name
    // Note: Instagram Graph API requires getting the hashtag ID first via the IG User ID
    // For simplicity/robustness, we assume specific flow:
    // 1. Get User's linked IG Business Account
    // 2. Search for Hashtag ID
    // 3. Get Recent Media for Hashtag
    
    // Simplification for this implementation context: 
    // We'll implementing the fetch logic assuming we can get the media. 
    // If the Hashtag search API is complex, we might simulate for "mock" success 
    // if strictly required by constraints, but I will write properly.

    try {
      // 1. Get IG User ID (usually stored, but let's assume we use the access token to get "me")
      // Actually we need the Page Code / Business ID.
      // Let's assume fetching media directly if we had a proper Hashtag ID, 
      // but typically we need to search the hashtag ID first.
      
      const hashtagId = await this.getHashtagId(setting.hashtag, credential.accessToken, credential.userId);
      
      if (!hashtagId) {
        logger.warn({ hashtag: setting.hashtag }, 'Hashtag ID not found');
        return 0;
      }

      const mediaList = await this.getHashtagMedia(hashtagId, credential.accessToken);
      
      let newPostsCount = 0;

      for (const media of mediaList) {
        // Skip existing
        const exists = await prisma.socialPost.findUnique({
          where: { platformId: media.id }
        });

        if (exists) continue;

        // Determine media URL (handle carousels if needed, taking first image)
        let originalMediaUrl = media.media_url;
        if (media.media_type === 'CAROUSEL_ALBUM' && media.children && media.children.data.length > 0) {
           originalMediaUrl = media.children.data[0].media_url;
        }

        // Upload to Cloudinary to prevent link expiration
        let finalMediaUrl = originalMediaUrl;
        try {
            // Use external UploadService (imported instance)
            // Note: We need to import the instance, assuming 'uploadService' default export is an instance
            // checking imports... we need to add import if missing.
            // For now assuming we add the import at top.
            
            // Optimization: If we are in mock mode, use specific mock URLs or skip upload
            if (process.env.MOCK_INSTAGRAM !== 'true') {
                 // Use the post ID as filename to avoid duplicates/re-uploads if we re-run logic
                 finalMediaUrl = await uploadService.uploadFromUrl(originalMediaUrl, 'social', media.id);
            }
        } catch (uploadErr) {
            logger.error({ error: uploadErr, mediaId: media.id }, 'Failed to upload IG media to Cloudinary, skipping post');
            continue; 
        }

        // Create post
        await prisma.socialPost.create({
          data: {
            settingId: setting.id,
            platformId: media.id,
            mediaUrl: finalMediaUrl,
            permalink: media.permalink,
            caption: media.caption,
            author: media.username,
            postedAt: new Date(media.timestamp),
            status: setting.autoApprove ? SocialPostStatus.APPROVED : SocialPostStatus.PENDING
          }
        });
        
        newPostsCount++;
      }

      return newPostsCount;

    } catch (error: unknown) {
      const parsedError = error instanceof Error ? error : new Error(String(error));
      logger.error({ 
        error: parsedError.message,
        settingId,
        stack: parsedError.stack 
      }, 'Failed to fetch Instagram media');
      throw parsedError;
    }
  }

  private async getHashtagId(hashtag: string, token: string, userId: string): Promise<string | null> {
    // Simplified search - in production this needs specific permission 'instagram_manage_insights' etc.
    // GET /ig_hashtag_search?user_id={user-id}&q={hashtag}
    try {
      const u = new URL(`${InstagramService.GRAPH_API_URL}/ig_hashtag_search`);
      u.searchParams.append('user_id', userId); // This must be the IG Business User ID
      u.searchParams.append('q', hashtag.replace('#', '')); // Instagram API expects hashtag without #
      u.searchParams.append('access_token', token);

      const res = await fetch(u.toString());
      const data = await res.json();
      
      if (data.data && data.data.length > 0) {
        return data.data[0].id;
      }
      
      if (data.error) {
        logger.error({ igError: data.error, hashtag }, 'Instagram Hashtag Search API error');
      }
      
      return null;
    } catch (e) {
      logger.error({ error: e, hashtag }, 'Error fetching hashtag ID');
      return null;
    }
  }
  
  private async getHashtagMedia(hashtagId: string, token: string): Promise<InstagramMedia[]> {
    // GET /{hashtag-id}/recent_media?user_id={user-id}&fields=...
    try {
        if (process.env.MOCK_INSTAGRAM === 'true') {
            return this.getMockMedia();
        }

        const u = new URL(`${InstagramService.GRAPH_API_URL}/${hashtagId}/recent_media`);
        u.searchParams.append('user_id', 'ME'); 
        u.searchParams.append('fields', 'id,media_type,media_url,permalink,caption,timestamp,username,children{media_url,media_type}');
        u.searchParams.append('access_token', token);
        
        const res = await fetch(u.toString());
        if (!res.ok) {
             const err = await res.json();
             logger.error({ igError: err, hashtagId }, 'Instagram Recent Media API error');
             return [];
        }
        const data = await res.json() as InstagramResponse;
        return data.data || [];
    } catch (e) {
        logger.error({ error: e, hashtagId }, 'Error fetching hashtag media');
        return [];
    }
  }

  private getMockMedia(): InstagramMedia[] {
    const users = ['noiva_feliz', 'fotografo_x', 'convidado_vip', 'decoracao_top'];
    const captions = [
        'Que dia inesquecível! #casamento #felicidade',
        'Tudo perfeito nesta celebração. #eventos #xproducoes',
        'Agradeço por fazer parte deste momento. #gratidao',
        'Detalhes que encantam. #decor #festa'
    ];
    const images = [
        'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1080&q=80',
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1080&q=80',
        'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1080&q=80',
        'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1080&q=80',
        'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1080&q=80'
    ];

    return Array.from({ length: 6 }).map((_, i) => ({
        id: `mock_${Date.now()}_${i}`,
        media_type: 'IMAGE',
        media_url: images[i % images.length],
        permalink: `https://instagram.com/p/mock${i}`,
        caption: captions[i % captions.length],
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        username: users[i % users.length]
    }));
  }
}

export default new InstagramService();
