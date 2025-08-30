import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';
import { uploadSingle } from '../middlewares/upload';
import { uploadLogo } from '../controllers/logoController';
// Import jsdom/dompurify dinamicamente dentro do handler to avoid startup errors

const router = Router();

// Faz apenas um upload: multer -> controller (Cloudinary)
router.post('/', uploadSingle('logo'), uploadLogo);

// Proxy seguro para SVG (ex.: Cloudinary) com CORS habilitado
router.get('/svg-proxy', async (req: Request, res: Response) => {
	// Validação e proteção do parâmetro `url` e do conteúdo upstream
	try {
		const url = (req.query.url as string) || '';
		if (!url || typeof url !== 'string') return res.status(400).send('Missing or invalid url');
		if (url.length > 2048) return res.status(400).send('URL too long');

		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch (err) {
			return res.status(400).send('Invalid URL');
		}

		const allowedHosts = new Set([
			'res.cloudinary.com',
			'cloudinary-res.cloudinary.com',
		]);
		if (!(parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname))) {
			return res.status(400).send('Host não permitido');
		}

		// Proteção adicional contra SSRF: resolver hostname e garantir que não aponta para IPs internos
		const lookup = promisify(dns.lookup);
		try {
			const addresses = await lookup(parsed.hostname, { all: true });
			const isPrivate = (addr: string) => {
				if (net.isIP(addr) === 4) {
					const parts = addr.split('.').map((p) => parseInt(p, 10));
					if (parts[0] === 10) return true; // 10.0.0.0/8
					if (parts[0] === 127) return true; // 127.0.0.0/8
					if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16
					if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
					if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
					return false;
				}
				if (net.isIP(addr) === 6) {
					// Simples checagens IPv6: loopback (::1), link-local (fe80::/10), unique local fc00::/7
					if (addr === '::1') return true;
					const lower = addr.toLowerCase();
					if (lower.startsWith('fe80') || lower.startsWith('fe80:')) return true;
					if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00/7
					return false;
				}
				return false;
			};

			for (const a of addresses) {
				if (isPrivate(a.address)) {
					console.warn('[SSRF] Rejected request - hostname resolves to private IP', { hostname: parsed.hostname, address: a.address });
					return res.status(400).send('Host resolves to internal address');
				}
			}
		} catch (dnsErr) {
			// Em caso de falha no DNS, recusar para evitar comportamento inseguro
			console.error('DNS lookup failed for svg-proxy:', dnsErr);
			return res.status(400).send('DNS lookup failed');
		}

		// Usar AbortController para timeout do fetch
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000); // 10s
		let upstream;
		try {
			upstream = await fetch(url, { signal: controller.signal });
		} catch (fetchErr: any) {
			if (fetchErr.name === 'AbortError') {
				return res.status(504).send('Upstream request timed out');
			}
			console.error('Fetch error in svg-proxy:', fetchErr);
			return res.status(502).send('Bad Gateway');
		} finally {
			clearTimeout(timeout);
		}
		if (!upstream.ok) {
			return res.status(upstream.status).send(`Upstream error: ${upstream.statusText}`);
		}

		// Limitar tamanho do recurso upstream para evitar DoS
		const contentLengthHeader = upstream.headers.get('content-length');
		if (contentLengthHeader) {
			const contentLength = parseInt(contentLengthHeader, 10);
			const MAX_BYTES = 5 * 1024 * 1024; // 5MB
			if (!Number.isNaN(contentLength) && contentLength > MAX_BYTES) {
				return res.status(413).send('Upstream resource too large');
			}
		}

		const contentType = (upstream.headers.get('content-type') || '').toLowerCase();

		// Sempre aplicar cabeçalhos de segurança por defesa em profundidade
		res.setHeader('Cache-Control', 'public, max-age=300');
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('X-Frame-Options', 'DENY');
		res.setHeader('Referrer-Policy', 'no-referrer');

		// Rejeitar respostas não-imagem (por exemplo HTML) que poderiam levar a XSS
		if (!contentType.startsWith('image/')) {
			return res.status(415).send('Unsupported media type');
		}

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

				// CSP de defesa em profundidade (não permite scripts/styles)
				res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; script-src 'none'; style-src 'none';");

				res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
				return res.status(200).send(clean);
			} catch (sanErr) {
				// Se sanitização falhar por algum motivo, logar e retornar erro
				console.error('SVG sanitization error:', sanErr);
				return res.status(500).send('SVG sanitization error');
			}
		}

		// Para outros tipos de imagem (ex.: PNG/JPEG), repassa binário e Content-Type original
		try {
			if (contentType) {
				res.setHeader('Content-Type', contentType);
			}
			const arrayBuffer = await (upstream as any).arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			return res.status(200).send(buffer);
		} catch (errBuffer) {
			console.error('Error proxying image buffer:', errBuffer);
			return res.status(500).send('Proxy error');
		}
	} catch (e: any) {
		return res.status(500).send(e?.message || 'Proxy error');
	}
});

export default router;
