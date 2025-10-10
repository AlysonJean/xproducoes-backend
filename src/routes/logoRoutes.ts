import { Router, Request, Response } from 'express';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';
import { uploadSingle } from '../middlewares/upload';
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';
import { uploadLogo } from '../controllers/logoController';
import { safeFetch } from '../utils/safeFetch';
import logger from "../config/logger";

// Import jsdom/dompurify dinamicamente dentro do handler to avoid startup errors

const router = Router();

// Faz apenas um upload: multer -> controller (Cloudinary)
router.post('/', uploadRateLimit, uploadSingle('logo'), uploadLogo);

// Proxy seguro para SVG (ex.: Cloudinary) com CORS habilitado
router.get('/svg-proxy', uploadRateLimit, async (req: Request, res: Response) => {
	// Validação e proteção do parâmetro `url` e do conteúdo upstream
	try {
		const url = (req.query.url as string) || '';
		if (!url || typeof url !== 'string') return res.status(400).send('Missing or invalid url');
		if (url.length > 2048) return res.status(400).send('URL too long');

		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return res.status(400).send('Invalid URL');
		}

		// Validações adicionais de segurança contra SSRF
		if (parsed.username || parsed.password) {
			return res.status(400).send('URL contains credentials which are not allowed');
		}

		// Bloquear esquemas perigosos
		const dangerousSchemes = ['file:', 'dict:', 'ftp:', 'gopher:', 'ldap:', 'ldaps:', 'data:', 'javascript:'];
		if (dangerousSchemes.includes(parsed.protocol)) {
			return res.status(400).send('Dangerous URL scheme not allowed');
		}

		// Validar porta se especificada
		if (parsed.port) {
			const port = parseInt(parsed.port, 10);
			// Bloquear portas suspeitas/comuns para serviços internos
			const suspiciousPorts = [22, 23, 25, 53, 110, 143, 993, 995, 3306, 5432, 6379, 27017];
			if (suspiciousPorts.includes(port)) {
				return res.status(400).send('Suspicious port not allowed');
			}
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
					// Adicionar ranges adicionais de IPs privados/reservados
					if (parts[0] === 0) return true; // 0.0.0.0/8
					if (parts[0] >= 224) return true; // 224.0.0.0/4 (multicast)
					return false;
				}
				if (net.isIP(addr) === 6) {
					// Simples checagens IPv6: loopback (::1), link-local (fe80::/10), unique local fc00::/7
					if (addr === '::1') return true;
					const lower = addr.toLowerCase();
					if (lower.startsWith('fe80') || lower.startsWith('fe80:')) return true;
					if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00/7
					if (lower.startsWith('::ffff:')) return true; // IPv4 mapped
					return false;
				}
				return false;
			};

			for (const a of addresses) {
				if (isPrivate(a.address)) {
					logger.warn({obj:{ hostname: parsed.hostname, address: a.address }}, '[SSRF] Rejected request - hostname resolves to private IP');
					return res.status(400).send('Host resolves to internal address');
				}
			}
		} catch (dnsErr) {
			// Em caso de falha no DNS, recusar para evitar comportamento inseguro
			logger.error({obj:dnsErr}, 'DNS lookup failed for svg-proxy:');
			return res.status(400).send('DNS lookup failed');
		}

		// Require a token for this proxy endpoint (mutual auth / simple token)
		const token = process.env.SVG_PROXY_TOKEN;
		const provided = req.header('x-svg-proxy-token') || '';
		if (token && (!provided || provided !== token)) {
			return res.status(401).send('Unauthorized');
		}

		let upstreamResp;
		try {
			upstreamResp = await safeFetch(url, { allowedHosts: allowedHosts });
		} catch (err: any) {
			if (err.message === 'Host not allowed' || err.message === 'Host resolves to internal address' || err.message === 'Redirect to unsupported protocol' || err.message === 'URL contains credentials which are not allowed' || err.message === 'Only https protocol allowed') {
				logger.warn({obj:err.message}, '[SSRF] Rejected request in svg-proxy:');
				return res.status(400).send(err.message);
			}
			if (err.name === 'AbortError') return res.status(504).send('Upstream request timed out');
			logger.error({obj:err}, 'Fetch error in svg-proxy:');
			return res.status(502).send('Bad Gateway');
		}
		const upstream = upstreamResp;
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
				const clean = DOMPurify.sanitize(svgText, { USE_PROFILES: { svg: true } });

				// CSP de defesa em profundidade (não permite scripts/styles)
				res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; script-src 'none'; style-src 'none';");

				res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
				return res.status(200).send(clean);
			} catch (sanErr) {
				// Se sanitização falhar por algum motivo, logar e retornar erro
				logger.error({obj:sanErr}, 'SVG sanitization error:');
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
			logger.error({obj:errBuffer}, 'Error proxying image buffer:');
			return res.status(500).send('Proxy error');
		}
	} catch (e: any) {
		return res.status(500).send(e?.message || 'Proxy error');
	}
});

export default router;
