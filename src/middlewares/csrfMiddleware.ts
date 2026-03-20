import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { allowedOrigins } from '../config/cors.js';

/**
 * CSRF Protection Middleware - Double-Submit Cookie Pattern (2026 standard)
 * 
 * Implements dual mechanisms:
 * 1. Double-Submit Cookie: Random token in cookie + header validation
 * 2. Token Validation: Ensures token consistency across requests
 * 
 * Benefits:
 * - Stateless (no server-side session needed)
 * - XSS-resilient when using httpOnly cookies
 * - CSRF-token in custom header prevents form hijacking
 * - Compatible with SPA architectures
 */

interface CsrfRequest extends Request {
  csrfToken?: string;
  csrfValid?: boolean;
  id?: string;
  userId?: string;
}

const CSRF_COOKIE_NAME = 'X-CSRF-Token';
const CSRF_HEADER_NAMES = ['x-csrf-token', 'csrf-token'];
const CSRF_TOKEN_LENGTH = 32;

/**
 * Validate Origin/Referer header (defense-in-depth)
 * Ensures request comes from an allowed origin, additional to CSRF token
 */
function validateOrigin(req: CsrfRequest): boolean {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return false; // Reject if no origin header (strict)

  // Extract domain from origin or referer
  let domain = '';
  try {
    if (req.headers.origin) {
      domain = new URL(req.headers.origin).origin;
    } else if (req.headers.referer) {
      domain = new URL(req.headers.referer).origin;
    }
  } catch (_e) {
    return false; // Invalid URL format
  }

  // Check if origin is in allowedOrigins
  const isAllowed = allowedOrigins.includes(domain);
  
  if (!isAllowed) {
    logger.warn(
      { origin: domain, allowedOrigins, method: req.method, path: req.path },
      'Origin validation failed - possible CSRF attempt'
    );
  }
  
  return isAllowed;
}

/**
 * Generate a new CSRF token (cryptographically secure random)
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF Token Generation Middleware
 * Generates and sets CSRF token on every request
 * Token is stored in httpOnly cookie for validation
 */
export const csrfTokenGenerator = (req: CsrfRequest, res: Response, next: NextFunction) => {
  try {
    // Reuse existing token if already present in the cookie.
    // Regenerating on every request causes the frontend-cached token to go stale
    // when parallel GET requests overwrite the cookie before a POST fires.
    const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
    if (existingToken) {
      req.csrfToken = existingToken;
      // Slide the expiry window so the session stays alive on active use
      res.cookie(CSRF_COOKIE_NAME, existingToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });
      return next();
    }

    // No token yet – generate a fresh one
    const token = generateCsrfToken();

    // Store token in httpOnly cookie
    // httpOnly prevents JS access (XSS protection)
    // secure flag ensures HTTPS-only in production
    // sameSite=strict prevents CSRF
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
      path: '/',
    });

    // Store token in request for verification
    req.csrfToken = token;

    next();
  } catch (error) {
    logger.error({ error }, 'CSRF token generation failed');
    return res.status(500).json({ success: false, message: 'Security initialization failed' });
  }
};

/**
 * Route patterns that are exempt from CSRF validation
 * These are public endpoints that don't require authentication
 * Users accessing these don't have a CSRF token yet
 */
const CSRF_EXEMPT_PATTERNS = [
  /^\/auth\/(login|register|refresh|social\/.*|request-password-reset|reset-password|resend-verification|complete-registration|facebook\/data-deletion)$/,
  /^\/public\//,
  /^\/health/,
  /^\/csrf-token$/,
];

function isCsrfExempt(path: string): boolean {
  return CSRF_EXEMPT_PATTERNS.some(pattern => pattern.test(path));
}

/**
 * CSRF Token Validation Middleware
 * Validates CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
 * 
 * Implementation details:
 * - Skips GET/HEAD/OPTIONS requests (idempotent)
 * - Skips public/exempt endpoints (login, register, etc)
 * - Requires token in X-CSRF-Token header
 * - Validates against cookie token
 * - Returns 403 on mismatch (CSRF attack detected)
 */
export const csrfTokenValidator = (req: CsrfRequest, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Skip validation for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip validation for exempt public endpoints (auth, register, password reset, etc)
  if (isCsrfExempt(req.path)) {
    return next();
  }

  try {
    // ✅ 2026 SECURITY: Validate Origin header first (defense-in-depth)
    if (!validateOrigin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Request origin not authorized. CSRF validation failed.',
      });
    }

    // Get token from cookie
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    if (!cookieToken) {
      logger.warn(
        { method: req.method, path: req.path, requestId: req.id },
        'CSRF cookie missing'
      );
      return res.status(403).json({
        success: false,
        message: 'CSRF cookie not found. Please refresh and try again.',
      });
    }

    // Get token from headers (try multiple header names for compatibility)
    let headerToken: string | undefined;
    for (const headerName of CSRF_HEADER_NAMES) {
      headerToken = req.headers[headerName] as string;
      if (headerToken) break;
    }

    if (!headerToken) {
      logger.warn(
        { method: req.method, path: req.path, requestId: req.id },
        'CSRF header missing'
      );
      return res.status(403).json({
        success: false,
        message: 'CSRF token missing from request header.',
      });
    }

    // Validate tokens match (constant-time comparison to prevent timing attacks)
    const isValid = secureCompare(cookieToken, headerToken);
    if (!isValid) {
      logger.warn(
        { method: req.method, path: req.path, requestId: req.id, userId: req.userId },
        'CSRF token mismatch - possible attack detected'
      );
      return res.status(403).json({
        success: false,
        message: 'CSRF token validation failed. Possible security breach.',
      });
    }

    // Valid CSRF token
    req.csrfValid = true;
    next();
  } catch (error) {
    logger.error({ error, path: req.path }, 'CSRF validation error');
    return res.status(500).json({
      success: false,
      message: 'Security validation failed',
    });
  }
};

/**
 * Constant-time comparison to prevent timing attacks
 * Compares two strings without early exit
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get CSRF token for frontend to use in headers
 * Endpoint for SPA to retrieve token on page load
 */
export const getCsrfToken = (req: CsrfRequest, res: Response) => {
  try {
    const token = req.csrfToken || generateCsrfToken();
    
    // Ensure cookie is set
    if (!req.cookies[CSRF_COOKIE_NAME]) {
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000,
        path: '/',
      });
    }

    // Return token (frontend will send it in headers)
    // Token is redundant since it's in cookie, but frontend still needs it for headers
    return res.json({
      success: true,
      data: {
        csrfToken: token,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to retrieve CSRF token');
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve CSRF token',
    });
  }
};

export default {
  csrfTokenGenerator,
  csrfTokenValidator,
  getCsrfToken,
};
