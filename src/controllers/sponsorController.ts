import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import logger from '../config/logger';
import { UploadService } from '../services/uploadService';

const uploadService = new UploadService();

export class SponsorController {
    /**
     * POST /api/admin/sponsors
     * Upload a new sponsor logo
     */
    async create(req: Request, res: Response) {
        try {
            const { name } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ error: 'Image file is required' });
            }

            if (!name) {
                return res.status(400).json({ error: 'Sponsor name is required' });
            }

            // Gera nome SEO para o arquivo
            const seoFilename = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            // Upload via service (Buffer -> Cloudinary)
            const imageUrl = await uploadService.uploadFile(file, 'sponsors', seoFilename);

            const sponsor = await prisma.sponsorLogo.create({
                data: {
                    name,
                    imageUrl: imageUrl,
                    userId: req.userId!
                }
            });

            res.json(sponsor);
        } catch (error) {
            logger.error({ error }, 'Error creating sponsor');
            res.status(500).json({ error: 'Failed to create sponsor' });
        }
    }

    /**
     * GET /api/admin/sponsors
     * List all sponsors for the user
     */
    async list(req: Request, res: Response) {
        try {
            const sponsors = await prisma.sponsorLogo.findMany({
                where: { userId: req.userId },
                orderBy: { createdAt: 'desc' }
            });
            res.json(sponsors);
        } catch (error) {
            logger.error({ error }, 'Error listing sponsors');
            res.status(500).json({ error: 'Failed to list sponsors' });
        }
    }

    /**
     * DELETE /api/admin/sponsors/:id
     * Remove a sponsor logo
     */
    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            // Ensure ownership
            const sponsor = await prisma.sponsorLogo.findFirst({
                where: { id: String(id), userId }
            });

            if (!sponsor) {
                return res.status(404).json({ error: 'Sponsor not found' });
            }

            // Optional: Delete from Cloudinary if needed, but for now we just remove DB record
            await prisma.sponsorLogo.delete({ where: { id: String(id) } });

            res.json({ message: 'Sponsor deleted' });
        } catch (error) {
            logger.error({ error }, 'Error deleting sponsor');
            res.status(500).json({ error: 'Failed to delete sponsor' });
        }
    }
}

export default new SponsorController();
