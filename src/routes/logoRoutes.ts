import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { uploadSingle } from '../middlewares/upload';
import { uploadLogo } from '../controllers/logoController';
// Import jsdom/dompurify dinamicamente dentro do handler to avoid startup errors

const router = Router();

// Faz apenas um upload: multer -> controller (Cloudinary)
router.post('/', uploadSingle('logo'), uploadLogo);

// Proxy seguro para SVG (ex.: Cloudinary) com CORS habilitado
router.get('/svg-proxy', async (req: Request, res: Response) => {
	try {
		const url = (req.query.url as string) || '';
		if (!url) return res.status(400).send('Missing url');

		const parsed = new URL(url);
		const allowedHosts = new Set([
			'res.cloudinary.com',
			'cloudinary-res.cloudinary.com',
		]);
		if (!(parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname))) {
			return res.status(400).send('Host não permitido');
		}

		const upstream = await fetch(url);
		if (!upstream.ok) {
			return res.status(upstream.status).send(`Upstream error: ${upstream.statusText}`);
		}

		const contentType = upstream.headers.get('content-type') || '';
		res.setHeader('Cache-Control', 'public, max-age=300');
		if (contentType.includes('image/svg')) {
			// Passa SVG como texto, mantendo tipo correto
			const svgText = await upstream.text();

			// Sanitizar o SVG server-side para mitigar XSS (scripts, on* attributes, etc.)
			try {
				// Carregar dinamicamente para evitar erro no startup quando dependências não estiverem resolvidas
				const jsdomMod = await import('jsdom');
				const dompurifyMod = await import('dompurify');
				const JSDOM = jsdomMod.JSDOM;
				const createDOMPurify = dompurifyMod.default || dompurifyMod;
				const window = new JSDOM('').window as any;
				const DOMPurify = createDOMPurify(window as any);
				const clean = DOMPurify.sanitize(svgText, { WHOLE_DOCUMENT: true, USE_PROFILES: { svg: true } });

				// Cabeçalhos de segurança adicionais
				res.setHeader('X-Content-Type-Options', 'nosniff');
				res.setHeader('X-Frame-Options', 'DENY');
				res.setHeader('Referrer-Policy', 'no-referrer');
				// CSP de defesa em profundidade (não permite scripts/styles)
				res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'none';");

				res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
				return res.status(200).send(clean);
			} catch (sanErr) {
				// Se sanitização falhar por algum motivo, logar e retornar erro
				console.error('SVG sanitization error:', sanErr);
				return res.status(500).send('SVG sanitization error');
			}
		}

		// Para outros tipos (ex.: PNG/JPEG), repassa binário e Content-Type original
		if (contentType) {
			res.setHeader('Content-Type', contentType);
		}
		const arrayBuffer = await (upstream as any).arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		return res.status(200).send(buffer);
	} catch (e: any) {
		return res.status(500).send(e?.message || 'Proxy error');
	}
});

export default router;
