import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import logger from '../config/logger';

export class SitemapController {
  async getSitemap(req: Request, res: Response) {
    try {
      const baseUrl = (process.env.FRONTEND_URL || 'https://xproducoes.com.br').replace(/\/$/, '');
      
      // Static pages that should be indexed
      const staticRoutes = [
        '',
        '/sobre',
        '/contato',
        '/faq',
        '/equipamentos', 
        '/kits',
        '/portfolio',
        '/privacidade',
        '/termos'
      ];

      // Fetch dynamic data concurrently
      const [categories, equipments, kits, portfolios] = await Promise.all([
        prisma.category.findMany({ 
          where: { active: true }, 
          select: { slug: true, updatedAt: true } 
        }),
        prisma.equipment.findMany({ 
          where: { status: 'ACTIVE' }, 
          select: { id: true, slug: true, updatedAt: true } 
        }),
        prisma.kit.findMany({ 
          where: { status: 'ACTIVE' }, 
          select: { id: true, slug: true, updatedAt: true } 
        }),
        prisma.portfolio.findMany({ 
          select: { id: true, slug: true, updatedAt: true } 
        })
      ]);

      // Helper to format date
      const formatDate = (date: Date) => date.toISOString();

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      // Static routes
      staticRoutes.forEach(route => {
        xml += `
  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`;
      });

      // Categories
      categories.forEach(cat => {
        if (cat.slug) {
          xml += `
  <url>
    <loc>${baseUrl}/equipamentos/categoria/${cat.slug}</loc>
    <lastmod>${formatDate(cat.updatedAt)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
        }
      });

      // Equipments
      equipments.forEach(eq => {
        const identifier = eq.slug || eq.id;
        xml += `
  <url>
    <loc>${baseUrl}/equipamento/${identifier}</loc>
    <lastmod>${formatDate(eq.updatedAt)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;
      });

      // Kits
      kits.forEach(k => {
        const identifier = k.slug || k.id;
        xml += `
  <url>
    <loc>${baseUrl}/kits/${identifier}</loc>
    <lastmod>${formatDate(k.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
      });

      // Portfolio
      portfolios.forEach(p => {
        const identifier = p.slug || p.id;
        xml += `
  <url>
    <loc>${baseUrl}/portfolio/${identifier}</loc>
    <lastmod>${formatDate(p.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      });

      xml += `
</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(xml);

    } catch (error) {
      logger.error({ err: error }, 'Sitemap generation error');
      res.status(500).send('Error generating sitemap');
    }
  }
}

export const sitemapController = new SitemapController();
