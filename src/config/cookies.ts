/**
 * 🍪 COOKIE CONFIGURATION
 * Configuração segura para httpOnly cookies
 */

import { CookieOptions, Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// Configurações base para cookies
// In production, Vercel proxy makes API calls same-origin → sameSite:'lax' is safe
// This is more secure than 'none' as it prevents cross-site cookie sending
const baseOptions: CookieOptions = {
  httpOnly: true, // Previne acesso via JavaScript (XSS)
  secure: isProduction, // HTTPS apenas em produção
  sameSite: 'lax', // Same-origin via Vercel proxy — 'lax' is the 2026 gold standard
  path: '/',
};

// Configuração para access token (curta duração)
export const accessTokenCookieOptions: CookieOptions = {
  ...baseOptions,
  maxAge: 15 * 60 * 1000, // 15 minutos
};

// Configuração para refresh token (longa duração)
export const refreshTokenCookieOptions: CookieOptions = {
  ...baseOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
};

// Nomes dos cookies
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'x_access_token',
  REFRESH_TOKEN: 'x_refresh_token',
} as const;

/**
 * Define os tokens de autenticação como httpOnly cookies
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, accessTokenCookieOptions);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, refreshTokenCookieOptions);
}

/**
 * Remove os cookies de autenticação (logout)
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
}

/**
 * Extrai token do cookie ou header (fallback para compatibilidade)
 */
export function extractToken(
  cookies: Record<string, string | undefined>,
  authHeader: string | undefined
): { accessToken: string | null; refreshToken: string | null; source: 'cookie' | 'header' | null } {
  // Prioridade 1: cookies httpOnly
  const accessFromCookie = cookies[COOKIE_NAMES.ACCESS_TOKEN];
  const refreshFromCookie = cookies[COOKIE_NAMES.REFRESH_TOKEN];
  
  if (accessFromCookie) {
    return {
      accessToken: accessFromCookie,
      refreshToken: refreshFromCookie || null,
      source: 'cookie',
    };
  }
  
  // Fallback: Authorization header (para apps mobile ou transição)
  if (authHeader?.startsWith('Bearer ')) {
    return {
      accessToken: authHeader.substring(7),
      refreshToken: null,
      source: 'header',
    };
  }
  
  return { accessToken: null, refreshToken: null, source: null };
}
