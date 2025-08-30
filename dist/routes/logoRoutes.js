"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_fetch_1 = __importDefault(require("node-fetch"));
const dns_1 = __importDefault(require("dns"));
const util_1 = require("util");
const net_1 = __importDefault(require("net"));
const upload_1 = require("../middlewares/upload");
const logoController_1 = require("../controllers/logoController");
// Import jsdom/dompurify dinamicamente dentro do handler to avoid startup errors
const router = (0, express_1.Router)();
// Faz apenas um upload: multer -> controller (Cloudinary)
router.post('/', (0, upload_1.uploadSingle)('logo'), logoController_1.uploadLogo);
// Proxy seguro para SVG (ex.: Cloudinary) com CORS habilitado
router.get('/svg-proxy', async (req, res) => {
    // Validação e proteção do parâmetro `url` e do conteúdo upstream
    try {
        const url = req.query.url || '';
        if (!url || typeof url !== 'string')
            return res.status(400).send('Missing or invalid url');
        if (url.length > 2048)
            return res.status(400).send('URL too long');
        let parsed;
        try {
            parsed = new URL(url);
        }
        catch (err) {
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
        const lookup = (0, util_1.promisify)(dns_1.default.lookup);
        try {
            const addresses = await lookup(parsed.hostname, { all: true });
            const isPrivate = (addr) => {
                if (net_1.default.isIP(addr) === 4) {
                    const parts = addr.split('.').map((p) => parseInt(p, 10));
                    if (parts[0] === 10)
                        return true; // 10.0.0.0/8
                    if (parts[0] === 127)
                        return true; // 127.0.0.0/8
                    if (parts[0] === 169 && parts[1] === 254)
                        return true; // 169.254.0.0/16
                    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
                        return true; // 172.16.0.0/12
                    if (parts[0] === 192 && parts[1] === 168)
                        return true; // 192.168.0.0/16
                    return false;
                }
                if (net_1.default.isIP(addr) === 6) {
                    // Simples checagens IPv6: loopback (::1), link-local (fe80::/10), unique local fc00::/7
                    if (addr === '::1')
                        return true;
                    const lower = addr.toLowerCase();
                    if (lower.startsWith('fe80') || lower.startsWith('fe80:'))
                        return true;
                    if (lower.startsWith('fc') || lower.startsWith('fd'))
                        return true; // fc00/7
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
        }
        catch (dnsErr) {
            // Em caso de falha no DNS, recusar para evitar comportamento inseguro
            console.error('DNS lookup failed for svg-proxy:', dnsErr);
            return res.status(400).send('DNS lookup failed');
        }
        // Usar AbortController para timeout do fetch
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s
        let upstream;
        try {
            upstream = await (0, node_fetch_1.default)(url, { signal: controller.signal });
        }
        catch (fetchErr) {
            if (fetchErr.name === 'AbortError') {
                return res.status(504).send('Upstream request timed out');
            }
            console.error('Fetch error in svg-proxy:', fetchErr);
            return res.status(502).send('Bad Gateway');
        }
        finally {
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
                const jsdomMod = await Promise.resolve().then(() => __importStar(require('jsdom')));
                const dompurifyMod = await Promise.resolve().then(() => __importStar(require('dompurify')));
                const JSDOM = jsdomMod.JSDOM;
                const createDOMPurify = dompurifyMod.default || dompurifyMod;
                const window = new JSDOM('').window;
                const DOMPurify = createDOMPurify(window);
                const clean = DOMPurify.sanitize(svgText, { WHOLE_DOCUMENT: true, USE_PROFILES: { svg: true } });
                // CSP de defesa em profundidade (não permite scripts/styles)
                res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; script-src 'none'; style-src 'none';");
                res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
                return res.status(200).send(clean);
            }
            catch (sanErr) {
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
            const arrayBuffer = await upstream.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return res.status(200).send(buffer);
        }
        catch (errBuffer) {
            console.error('Error proxying image buffer:', errBuffer);
            return res.status(500).send('Proxy error');
        }
    }
    catch (e) {
        return res.status(500).send(e?.message || 'Proxy error');
    }
});
exports.default = router;
