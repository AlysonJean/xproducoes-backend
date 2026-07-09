import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config as envConfig } from '../config/environment';
import bcrypt from 'bcrypt';
import { AppError, BadRequestError } from '../utils/errors';
import logger from '../config/logger';

const JWT_SECRET = envConfig.jwtSecret;

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
  const mod = await import('openid-client').catch(() => null as any);
  if (!mod || !mod.Issuer) {
    throw new AppError('Dependência openid-client ausente. Instale com: npm install openid-client', 500);
  }
  const Issuer = (mod as any).Issuer as any;
  const generators = (mod as any).generators as any;

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

  let payload: any;
  try {
    payload = jwt.verify(state, JWT_SECRET);
  } catch {
    throw new BadRequestError('STATE inválido');
  }
  const codeVerifier = payload?.v as string;
  const expectedNonce = payload?.n as string;
  if (!codeVerifier || !expectedNonce) throw new BadRequestError('STATE inválido');

  // @ts-ignore - módulo pode não estar instalado em ambientes de teste
  const mod = await import('openid-client').catch(() => null as any);
  if (!mod || !mod.Issuer) {
    throw new AppError('Dependência openid-client ausente. Instale com: npm install openid-client', 500);
  }
  const Issuer = (mod as any).Issuer as any;

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
  if (!claims || (claims as any).nonce && (claims as any).nonce !== expectedNonce) {
    throw new BadRequestError('Nonce inválido');
  }
  const email = (claims as any).email as string || '';
  const emailVerified = !!(claims as any).email_verified;
  if (!email) throw new BadRequestError('Email não disponível pelo provedor');

  // Vincular ou criar usuário local
  let isNewUser = false;
  let user = await prisma.user.findUnique({ where: { email } });
  const avatarUrl = (claims as any).picture as string || null;

  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: {
        name: ((claims as any).name as string) || email.split('@')[0],
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        verified: emailVerified || true,
        socialProvider: 'google',
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
      await prisma.user.update({ where: { id: user.id }, data: { socialProvider: 'google' } });
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
  } as any);
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

  let payload: any;
  try { payload = jwt.verify(state, JWT_SECRET); } catch { throw new BadRequestError('STATE inválido'); }
  const codeVerifier = payload?.v as string;
  const expectedNonce = payload?.n as string;
  if (!codeVerifier || !expectedNonce) throw new BadRequestError('STATE inválido');

  // Troca de código por access_token
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  } as any);
  const tokenRes = await (await import('../utils/safeFetch')).safeFetch('https://graph.facebook.com/v19.0/oauth/access_token', {
    allowedHosts: new Set(['graph.facebook.com']),
    init: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenParams.toString() }
  });
  const tokenJson: any = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new AppError(`Falha ao obter access_token do Facebook: ${tokenJson?.error?.message || tokenRes.statusText}`, 502);
  }
  const accessToken = tokenJson.access_token as string;

  // Buscar perfil básico
  const meRes = await (await import('../utils/safeFetch')).safeFetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`, { allowedHosts: new Set(['graph.facebook.com']) });
  const me: any = await meRes.json();
  if (!meRes.ok || !me?.id) {
    throw new AppError(`Falha ao obter perfil do Facebook: ${me?.error?.message || meRes.statusText}`, 502);
  }
  const email = (me.email as string) || '';
  if (!email) throw new BadRequestError('Email não disponível pelo provedor');

  // Vincular ou criar usuário local
  let isNewUser = false;
  let user = await prisma.user.findUnique({ where: { email } });
  const avatarUrl = me.picture?.data?.url || null;

  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: {
        name: (me.name as string) || email.split('@')[0],
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        verified: true,
        socialProvider: 'facebook',
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
      await prisma.user.update({ where: { id: user.id }, data: { socialProvider: 'facebook' } });
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
