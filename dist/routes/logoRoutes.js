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
const upload_1 = require("../middlewares/upload");
const logoController_1 = require("../controllers/logoController");
// Import jsdom/dompurify dinamicamente dentro do handler to avoid startup errors
const router = (0, express_1.Router)();
// Faz apenas um upload: multer -> controller (Cloudinary)
router.post('/', (0, upload_1.uploadSingle)('logo'), logoController_1.uploadLogo);
// Proxy seguro para SVG (ex.: Cloudinary) com CORS habilitado
router.get('/svg-proxy', async (req, res) => {
    try {
        const url = req.query.url || '';
        if (!url)
            return res.status(400).send('Missing url');
        const parsed = new URL(url);
        const allowedHosts = new Set([
            'res.cloudinary.com',
            'cloudinary-res.cloudinary.com',
        ]);
        if (!(parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname))) {
            return res.status(400).send('Host não permitido');
        }
        const upstream = await (0, node_fetch_1.default)(url);
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
                const jsdomMod = await Promise.resolve().then(() => __importStar(require('jsdom')));
                const dompurifyMod = await Promise.resolve().then(() => __importStar(require('dompurify')));
                const JSDOM = jsdomMod.JSDOM;
                const createDOMPurify = dompurifyMod.default || dompurifyMod;
                const window = new JSDOM('').window;
                const DOMPurify = createDOMPurify(window);
                const clean = DOMPurify.sanitize(svgText, { WHOLE_DOCUMENT: true, USE_PROFILES: { svg: true } });
                // Cabeçalhos de segurança adicionais
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('X-Frame-Options', 'DENY');
                res.setHeader('Referrer-Policy', 'no-referrer');
                // CSP de defesa em profundidade (não permite scripts/styles)
                res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'none';");
                res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
                return res.status(200).send(clean);
            }
            catch (sanErr) {
                // Se sanitização falhar por algum motivo, logar e retornar erro
                console.error('SVG sanitization error:', sanErr);
                return res.status(500).send('SVG sanitization error');
            }
        }
        // Para outros tipos (ex.: PNG/JPEG), repassa binário e Content-Type original
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        const arrayBuffer = await upstream.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return res.status(200).send(buffer);
    }
    catch (e) {
        return res.status(500).send(e?.message || 'Proxy error');
    }
});
exports.default = router;
