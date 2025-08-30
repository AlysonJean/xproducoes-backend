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
exports.getGoogleAuthorizationUrl = getGoogleAuthorizationUrl;
exports.handleGoogleCallback = handleGoogleCallback;
exports.getFacebookAuthorizationUrl = getFacebookAuthorizationUrl;
exports.handleFacebookCallback = handleFacebookCallback;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const environment_1 = require("../config/environment");
const JWT_SECRET = environment_1.config.jwtSecret;
function base64url(input) {
    return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sha256(buffer) {
    return crypto_1.default.createHash('sha256').update(buffer).digest();
}
async function getGoogleAuthorizationUrl(opts) {
    const { redirectUri, scope = ['openid', 'profile', 'email'] } = opts;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
    }
    // Lazy import para evitar quebrar build em ambientes sem a dependência instalada
    // @ts-ignore - módulo pode não estar instalado em ambientes de teste
    const mod = await Promise.resolve().then(() => __importStar(require('openid-client'))).catch(() => null);
    if (!mod || !mod.Issuer) {
        throw new Error('Dependência openid-client ausente. Instale com: npm install openid-client');
    }
    const Issuer = mod.Issuer;
    const generators = mod.generators;
    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    const client = new googleIssuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [redirectUri],
        response_types: ['code'],
    });
    // PKCE
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const nonce = base64url(crypto_1.default.randomBytes(16));
    // State JWT para manter verifier/nonce sem sessão no servidor
    const state = jsonwebtoken_1.default.sign({ v: codeVerifier, n: nonce }, JWT_SECRET, { expiresIn: '10m' });
    const url = client.authorizationUrl({
        scope: scope.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
    });
    return { url };
}
async function handleGoogleCallback(params) {
    const { code, state, redirectUri } = params;
    if (!code || !state)
        throw new Error('Parâmetros inválidos');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
    }
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(state, JWT_SECRET);
    }
    catch {
        throw new Error('STATE inválido');
    }
    const codeVerifier = payload?.v;
    const expectedNonce = payload?.n;
    if (!codeVerifier || !expectedNonce)
        throw new Error('STATE inválido');
    // @ts-ignore - módulo pode não estar instalado em ambientes de teste
    const mod = await Promise.resolve().then(() => __importStar(require('openid-client'))).catch(() => null);
    if (!mod || !mod.Issuer) {
        throw new Error('Dependência openid-client ausente. Instale com: npm install openid-client');
    }
    const Issuer = mod.Issuer;
    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    const client = new googleIssuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [redirectUri],
        response_types: ['code'],
    });
    const tokenSet = await client.callback(redirectUri, { code, state }, { code_verifier: codeVerifier });
    const claims = tokenSet.claims();
    // Validações básicas de segurança
    if (!claims || claims.nonce && claims.nonce !== expectedNonce) {
        throw new Error('Nonce inválido');
    }
    const email = claims.email || '';
    const emailVerified = !!claims.email_verified;
    if (!email)
        throw new Error('Email não disponível pelo provedor');
    // Vincular ou criar usuário local
    let user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma_1.prisma.user.create({
            data: {
                name: claims.name || email.split('@')[0],
                email,
                passwordHash: base64url(crypto_1.default.randomBytes(24)), // placeholder, login social
                verified: emailVerified || true,
            },
        });
        try {
            await prisma_1.prisma.client.create({ data: { userId: user.id } });
        }
        catch { }
    }
    else if (!user.verified && emailVerified) {
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { verified: true } });
    }
    // Emitir JWT da aplicação
    const appToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token: appToken,
    };
}
async function getFacebookAuthorizationUrl(opts) {
    const { redirectUri, scope = ['email', 'public_profile'] } = opts;
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('Facebook OAuth não configurado. Defina FACEBOOK_CLIENT_ID e FACEBOOK_CLIENT_SECRET.');
    }
    // PKCE (nem todas as apps FB exigem; adicionar para fortalecer segurança)
    const codeVerifier = base64url(crypto_1.default.randomBytes(32));
    const codeChallenge = base64url(sha256(Buffer.from(codeVerifier)));
    const nonce = base64url(crypto_1.default.randomBytes(16));
    const state = jsonwebtoken_1.default.sign({ v: codeVerifier, n: nonce }, JWT_SECRET, { expiresIn: '10m' });
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        scope: scope.join(','),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });
    const url = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    return { url };
}
async function handleFacebookCallback(params) {
    const { code, state, redirectUri } = params;
    if (!code || !state)
        throw new Error('Parâmetros inválidos');
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('Facebook OAuth não configurado. Defina FACEBOOK_CLIENT_ID e FACEBOOK_CLIENT_SECRET.');
    }
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(state, JWT_SECRET);
    }
    catch {
        throw new Error('STATE inválido');
    }
    const codeVerifier = payload?.v;
    const expectedNonce = payload?.n;
    if (!codeVerifier || !expectedNonce)
        throw new Error('STATE inválido');
    // Troca de código por access_token
    const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
    });
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
        throw new Error(`Falha ao obter access_token do Facebook: ${tokenJson?.error?.message || tokenRes.statusText}`);
    }
    const accessToken = tokenJson.access_token;
    // Buscar perfil básico
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
    const me = await meRes.json();
    if (!meRes.ok || !me?.id) {
        throw new Error(`Falha ao obter perfil do Facebook: ${me?.error?.message || meRes.statusText}`);
    }
    const email = me.email || '';
    if (!email)
        throw new Error('Email não disponível pelo provedor');
    // Vincular ou criar usuário local
    let user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma_1.prisma.user.create({
            data: {
                name: me.name || email.split('@')[0],
                email,
                passwordHash: base64url(crypto_1.default.randomBytes(24)),
                verified: true, // Facebook não expõe email_verified; assume-se consentido
            },
        });
        try {
            await prisma_1.prisma.client.create({ data: { userId: user.id } });
        }
        catch { }
    }
    const appToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: appToken };
}
