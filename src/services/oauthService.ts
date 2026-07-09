import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config as envConfig } from '../config/environment';
import bcrypt from 'bcrypt';
import { AppError, BadRequestError } from '../utils/errors';
import logger from '../config/logger';

const JWT_SECRET = envConfig.jwtSecret;

// Contrato mínimo usado deste pacote (importado dinamicamente pois é opcional -
// pode não estar instalado em todos os ambientes, ex. testes)
interface OpenIdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  nonce?: string;
}

interface OpenIdTokenSet {
  claims: () => OpenIdTokenClaims;
}

interface OpenIdClientInstance {
  authorizationUrl: (params: Record<string, unknown>) => string;
  callback: (
    redirectUri: string,
    params: Record<string, unknown>,
    checks: Record<string, unknown>,
  ) => Promise<OpenIdTokenSet>;
}

interface OpenIdClientModule {
  Issuer?: {
    discover: (issuer: string) => Promise<{
      Client: new (metadata: Record<string, unknown>) => OpenIdClientInstance;
    }>;
  };
  generators?: {
    codeVerifier: () => string;
    codeChallenge: (verifier: string) => string;
  };
}

interface StateJwtPayload {
  v: string;
  n: string;
}

interface FacebookTokenResponse {
  access_token?: string;
  error?: { message?: string };
}

interface FacebookProfileResponse {
  id?: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
  error?: { message?: string };
}

function base64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

export type GoogleAuthorizeOptions = {
  redirectUri: string;
  scope?: string[];
};

export async function getGoogleAuthorizationUrl(opts: GoogleAuthorizeOptions) {
  const { redirectUri, scope = ['openid', 'profile', 'email'] } = opts;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new BadRequestError('Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
  }

  // Lazy import para evitar quebrar build em ambientes sem a dependência instalada
  // @ts-ignore - módulo pode não estar instalado em ambientes de teste
  const mod: OpenIdClientModule | null = await import('openid-client').catch(() => null);
  if (!mod || !mod.Issuer || !mod.generators) {
    throw new AppError('Dependência openid-client ausente. Instale com: npm install openid-client', 500);
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
  const nonce = base64url(crypto.randomBytes(16));

  // State JWT para manter verifier/nonce sem sessão no servidor
  const state = jwt.sign({ v: codeVerifier, n: nonce }, JWT_SECRET, { expiresIn: '10m' });

  const url = client.authorizationUrl({
    scope: scope.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  return { url };
}

export async function handleGoogleCallback(params: { code?: string; state?: string; redirectUri: string }) {
  const { code, state, redirectUri } = params;
  if (!code || !state) throw new BadRequestError('Parâmetros inválidos');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new BadRequestError('Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
  }

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(state, JWT_SECRET);
  } catch {
    throw new BadRequestError('STATE inválido');
  }
  const statePayload = typeof payload === 'object' ? (payload as jwt.JwtPayload & StateJwtPayload) : null;
  const codeVerifier = statePayload?.v;
  const expectedNonce = statePayload?.n;
  if (!codeVerifier || !expectedNonce) throw new BadRequestError('STATE inválido');

  // @ts-ignore - módulo pode não estar instalado em ambientes de teste
  const mod: OpenIdClientModule | null = await import('openid-client').catch(() => null);
  if (!mod || !mod.Issuer) {
    throw new AppError('Dependência openid-client ausente. Instale com: npm install openid-client', 500);
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
    throw new BadRequestError('Nonce inválido');
  }
  const email = claims.email || '';
  const emailVerified = !!claims.email_verified;
  if (!email) throw new BadRequestError('Email não disponível pelo provedor');

  // Vincular ou criar usuário local
  let isNewUser = false;
  let user = await prisma.user.findUnique({ where: { email } });
  const avatarUrl = claims.picture || null;

  const googleSubjectId = claims.sub || null;

  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: {
        name: claims.name || email.split('@')[0],
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        verified: emailVerified || true,
        socialProvider: 'google',
        socialProviderId: googleSubjectId,
        avatarUrl,
      },
    });
    try {
      await prisma.client.create({ data: { userId: user.id } });
    } catch (err) {
      // Não relança: a conta de usuário já foi criada com sucesso, e falhar o login
      // inteiro por causa do perfil de cliente secundário seria pior que segui-lo sem
      // ele. Mas silenciar totalmente escondia isso — sem log, o próximo sintoma seria
      // um erro obscuro de "perfil de cliente não encontrado" em algum lugar bem depois.
      logger.error(
        { err, userId: user.id, socialProvider: user.socialProvider },
        'Falha ao criar perfil de Client para novo usuário via login social',
      );
    }
  } else {
    // Atualiza avatar se houver um novo e o atual for nulo
    if (avatarUrl && !user.avatarUrl) {
      await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
    }
    if (!user.verified && emailVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { verified: true } });
    }
    if (!user.socialProvider) {
      await prisma.user.update({ where: { id: user.id }, data: { socialProvider: 'google', socialProviderId: googleSubjectId } });
    } else if (user.socialProvider === 'google' && !user.socialProviderId && googleSubjectId) {
      // Backfill para contas que logaram antes desta correção existir.
      await prisma.user.update({ where: { id: user.id }, data: { socialProviderId: googleSubjectId } });
    }
  }

  // Verificar se o perfil está completo (ex: tem telefone)
  const clientProfile = await prisma.client.findUnique({ where: { userId: user.id } });
  const shouldCompleteProfile = isNewUser || !clientProfile?.phone;

  // Emitir JWT da aplicação
  const appToken = jwt.sign({ userId: user.id, role: user.role, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id, role: user.role, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

  return {
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      avatarUrl: user.avatarUrl 
    },
    token: appToken,
    refreshToken,
    shouldCompleteProfile,
    redirectTo: user.role === 'ADMIN' ? '/admin/painel' : '/dashboard'
  };
}

// ===== Facebook OAuth 2.0 (Graph API) =====
export type FacebookAuthorizeOptions = {
  redirectUri: string;
  scope?: string[];
};

export async function getFacebookAuthorizationUrl(opts: FacebookAuthorizeOptions) {
  const { redirectUri, scope = ['email', 'public_profile'] } = opts;
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new BadRequestError('Facebook OAuth não configurado. Defina FACEBOOK_CLIENT_ID e FACEBOOK_CLIENT_SECRET.');
  }

  // PKCE (nem todas as apps FB exigem; adicionar para fortalecer segurança)
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(sha256(Buffer.from(codeVerifier)));
  const nonce = base64url(crypto.randomBytes(16));
  const state = jwt.sign({ v: codeVerifier, n: nonce }, JWT_SECRET, { expiresIn: '10m' });

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

export async function handleFacebookCallback(params: { code?: string; state?: string; redirectUri: string }) {
  const { code, state, redirectUri } = params;
  if (!code || !state) throw new BadRequestError('Parâmetros inválidos');

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new BadRequestError('Facebook OAuth não configurado. Defina FACEBOOK_CLIENT_ID e FACEBOOK_CLIENT_SECRET.');
  }

  let payload: string | jwt.JwtPayload;
  try { payload = jwt.verify(state, JWT_SECRET); } catch { throw new BadRequestError('STATE inválido'); }
  const statePayload = typeof payload === 'object' ? (payload as jwt.JwtPayload & StateJwtPayload) : null;
  const codeVerifier = statePayload?.v;
  const expectedNonce = statePayload?.n;
  if (!codeVerifier || !expectedNonce) throw new BadRequestError('STATE inválido');

  // Troca de código por access_token
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });
  const tokenRes = await (await import('../utils/safeFetch')).safeFetch('https://graph.facebook.com/v19.0/oauth/access_token', {
    allowedHosts: new Set(['graph.facebook.com']),
    init: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenParams.toString() }
  });
  const tokenJson: FacebookTokenResponse = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new AppError(`Falha ao obter access_token do Facebook: ${tokenJson?.error?.message || tokenRes.statusText}`, 502);
  }
  const accessToken = tokenJson.access_token;

  // Buscar perfil básico
  const meRes = await (await import('../utils/safeFetch')).safeFetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`, { allowedHosts: new Set(['graph.facebook.com']) });
  const me: FacebookProfileResponse = await meRes.json();
  if (!meRes.ok || !me?.id) {
    throw new AppError(`Falha ao obter perfil do Facebook: ${me?.error?.message || meRes.statusText}`, 502);
  }
  const email = me.email || '';
  if (!email) throw new BadRequestError('Email não disponível pelo provedor');

  // Vincular ou criar usuário local
  let isNewUser = false;
  let user = await prisma.user.findUnique({ where: { email } });
  const avatarUrl = me.picture?.data?.url || null;

  const facebookUserId = me.id || null;

  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: {
        name: me.name || email.split('@')[0],
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        verified: true,
        socialProvider: 'facebook',
        socialProviderId: facebookUserId,
        avatarUrl,
      },
    });
    try {
      await prisma.client.create({ data: { userId: user.id } });
    } catch (err) {
      // Não relança: a conta de usuário já foi criada com sucesso, e falhar o login
      // inteiro por causa do perfil de cliente secundário seria pior que segui-lo sem
      // ele. Mas silenciar totalmente escondia isso — sem log, o próximo sintoma seria
      // um erro obscuro de "perfil de cliente não encontrado" em algum lugar bem depois.
      logger.error(
        { err, userId: user.id, socialProvider: user.socialProvider },
        'Falha ao criar perfil de Client para novo usuário via login social',
      );
    }
  } else {
    if (avatarUrl && !user.avatarUrl) {
      await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
    }
    if (!user.socialProvider) {
      await prisma.user.update({ where: { id: user.id }, data: { socialProvider: 'facebook', socialProviderId: facebookUserId } });
    } else if (user.socialProvider === 'facebook' && !user.socialProviderId && facebookUserId) {
      // Backfill para contas que logaram antes desta correção existir — sem isso, o
      // callback de exclusão de dados da Meta nunca conseguiria localizar a conta.
      await prisma.user.update({ where: { id: user.id }, data: { socialProviderId: facebookUserId } });
    }
  }

  const clientProfile = await prisma.client.findUnique({ where: { userId: user.id } });
  const shouldCompleteProfile = isNewUser || !clientProfile?.phone;

  const appToken = jwt.sign({ userId: user.id, role: user.role, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id, role: user.role, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

  return { 
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      avatarUrl: user.avatarUrl
    }, 
    token: appToken,
    refreshToken,
    shouldCompleteProfile,
    redirectTo: user.role === 'ADMIN' ? '/admin/painel' : '/dashboard'
  };
}
