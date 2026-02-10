import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import logger from "../config/logger";
import { setAuthCookies, clearAuthCookies } from "../config/cookies";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from "../utils/errors";

// Função para validar access token do Google
async function validateGoogleToken(accessToken: string): Promise<{
  valid: boolean;
  email?: string;
  name?: string;
  sub?: string;
  picture?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!response.ok) {
      return { valid: false, error: 'Token inválido ou expirado' };
    }
    
    const data = await response.json();
    
    if (!data.email) {
      return { valid: false, error: 'Token não contém email' };
    }
    
    return {
      valid: true,
      email: data.email,
      name: data.name,
      sub: data.sub,
      picture: data.picture
    };
  } catch (error) {
    logger.error({ error }, 'Erro ao validar token Google');
    return { valid: false, error: 'Erro ao validar token com Google' };
  }
}

// Função para validar access token do Facebook
async function validateFacebookToken(accessToken: string): Promise<{
  valid: boolean;
  email?: string;
  name?: string;
  id?: string;
  picture?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${encodeURIComponent(accessToken)}`
    );
    
    if (!response.ok) {
      return { valid: false, error: 'Token Facebook inválido ou expirado' };
    }
    
    const data = await response.json();
    
    if (!data.email) {
      return { valid: false, error: 'Permissão de email não concedida. Por favor, permita acesso ao email.' };
    }
    
    return {
      valid: true,
      email: data.email,
      name: data.name,
      id: data.id,
      picture: data.picture?.data?.url
    };
  } catch (error) {
    logger.error({ error }, 'Erro ao validar token Facebook');
    return { valid: false, error: 'Erro ao validar token com Facebook' };
  }
}


export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { name, email, password, role, phone, companyName } = req.body;
    if (!name || !email || !password) {
      throw new BadRequestError('Nome, e-mail e senha são obrigatórios');
    }
    const result = await this.authService.register({
      name,
      email,
      password,
      role,
      phone,
      companyName,
    });
    res.status(201).json(result);
  };

  login = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequestError("Email e senha são obrigatórios");
    }

    try {
      const result = await this.authService.login({ email, password });
      
      setAuthCookies(res, result.token, result.refreshToken);
      
      res.status(200).json({
        user: result.user,
        redirectTo: result.redirectTo,
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      if (error.code === 'EMAIL_NOT_VERIFIED' || error.message?.includes('verificado')) {
        throw new ForbiddenError('E-mail não verificado. Verifique sua caixa de entrada.', 'EMAIL_NOT_VERIFIED');
      }
      
      if (error.message === "Credenciais inválidas." || error.message?.includes('not found') || error.message?.includes('invalid')) {
        throw new UnauthorizedError('Credenciais inválidas.');
      }
      
      throw error;
    }
  };

  requestPasswordReset = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { email } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;
    
    try {
      const result = await this.authService.requestPasswordReset(email, ipAddress, userAgent);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Usuário não encontrado') {
        throw new NotFoundError('Não encontramos nenhuma conta com este e-mail.');
      }
      throw error;
    }
  };

  resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { token, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const result = await this.authService.resetPassword(token, password, ipAddress);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // Endpoint público para verificar email via token
  verifyEmail = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const token = (req.query.token as string) || req.body.token;
    if (!token) throw new BadRequestError('Token é obrigatório');
    
    try {
      await (await import('../services/userService')).verifyEmailByToken(token);
      res.status(200).json({ success: true });
    } catch (e: any) {
      throw new BadRequestError(e.message || 'Token inválido');
    }
  };

  // Endpoint público para usuário solicitar reenvio de verificação
  resendVerificationPublic = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { email } = req.body;
    if (!email) throw new BadRequestError('Email é obrigatório');
    
    const user = await this.authService.findUserByEmail(email);
    if (!user) throw new NotFoundError('Usuário não encontrado');
    
    await (await import('../services/userService')).resendEmailVerification(user.id);
    res.json({ success: true });
  };

  getProfile = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (!req.userId) {
      throw new UnauthorizedError("ID do utilizador não encontrado no token.");
    }
    const user = await this.authService.getProfile(req.userId);
    res.json(user);
  };

  updateProfile = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (!req.userId) {
      throw new UnauthorizedError("ID do utilizador não encontrado no token.");
    }
    const { name, avatarUrl } = req.body;
    const user = await this.authService.updateProfile(req.userId, {
      name,
      avatarUrl,
    });
    res.json(user);
  };

  inviteCollaborator = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { name, email, collaboratorRole, hourlyRate, specialties } =
      req.body;
    const result = await this.authService.inviteCollaborator({
      name,
      email,
      collaboratorRole,
      hourlyRate,
      specialties,
    });
    res.status(201).json(result);
  };

  // Método para colaboradores completarem o registo
  completeRegistration = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { token, password } = req.body;
    if (!token || !password) {
      throw new BadRequestError('Token e password são obrigatórios');
    }
    try {
      await this.authService.resetPassword(token, password);
      res.status(200).json({ success: true });
    } catch (e: any) {
      throw new BadRequestError(e.message || 'Falha ao completar registro');
    }
  };

  socialLogin = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { accessToken, userData } = req.body;
    
    // Detectar provider pela rota
    const isFacebook = req.path.includes('facebook');
    const provider = isFacebook ? 'Facebook' : 'Google';
    
    // Validar token com o provider apropriado
    if (accessToken) {
      logger.info(`Validando access token com ${provider}`);
      
      const validation = isFacebook 
        ? await validateFacebookToken(accessToken)
        : await validateGoogleToken(accessToken);
      
      if (!validation.valid) {
        logger.warn({ error: validation.error }, `Token ${provider} inválido`);
        throw new UnauthorizedError(validation.error || "Token inválido");
      }
      
      const email = validation.email!;
      const name = validation.name || email.split('@')[0];
      const avatarUrl = (validation as any).picture || null;
      
      logger.info({ email, name }, `Token ${provider} validado com sucesso`);
      
      // Vincular ou criar usuário local
      const { prisma } = await import('../config/prisma');
      let user = await prisma.user.findUnique({ where: { email } });
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
            verified: true,
            avatarUrl,
          },
        });
        try { await prisma.client.create({ data: { userId: user.id } }); } catch {}
      } else if (avatarUrl && !user.avatarUrl) {
        await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
      }

      // Login para obter tokens
      const result = await this.authService.loginById(user.id);
      
      // Verificar se perfil está completo
      const clientProfile = await prisma.client.findUnique({ where: { userId: user.id } });
      const shouldCompleteProfile = isNewUser || !clientProfile?.phone;

      res.status(user ? 200 : 201).json({
        ...result,
        shouldCompleteProfile
      });
      return;
    }
    
    // Fallback: userData enviado diretamente (legado - menos seguro)
    logger.warn("Login social sem validação de token - modo legado");
    
    if (!userData || typeof userData !== 'object') {
      throw new BadRequestError("Token ou dados de usuário são obrigatórios");
    }

    const email = (userData.email && typeof userData.email === 'string') ? userData.email : null;
    if (!email) throw new BadRequestError("E-mail é obrigatório");

    const user = await this.authService.findUserByEmail(email);

    if (user) {
      // Se existe, fazer login
      logger.info({ userId: user.id }, "Usuário encontrado, fazendo login por ID");
      const result = await this.authService.loginById(user.id);
      res.status(200).json(result);
    } else {
      // Se não existe, criar novo utilizador
      logger.info("Usuário não encontrado, criando novo");
      const randomPassword = Math.random().toString(36).slice(-8);
      // Calcular nome seguro
      let safeName: string;
      if (userData.name && typeof userData.name === 'string' && userData.name.trim()) {
        safeName = userData.name.trim();
      } else if (email.includes('@')) {
        safeName = email.split('@')[0];
      } else {
        safeName = email;
      }

      const result = await this.authService.register({
        name: safeName,
        email: email,
        password: randomPassword,
        role: "CLIENT",
      });
      logger.info({ result }, "Registro realizado com sucesso");

      // Após registro, fazer login para obter token
      const loginResult = await this.authService.loginById(result.id);
      res.status(201).json(loginResult);
    }
  };

  // helper para construir redirectUri do backend
  private getBackendRedirect(req: Request, provider: 'google' | 'facebook') {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    return `${proto}://${host}/api/auth/oauth/${provider}/callback`;
  }

  // OAuth: iniciar autorização Google (gera URL com PKCE e state)
  googleAuthorize = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const redirectUri = (process.env.GOOGLE_REDIRECT_URI || this.getBackendRedirect(req, 'google')).toString();
      const svc = await import('../services/oauthService');
      const { url } = await svc.getGoogleAuthorizationUrl({ redirectUri });
      res.json({ url });
    } catch (error) {
      next(error);
    }
  };

  // OAuth: callback do Google
  googleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
  const { code, state } = req.query as any;
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || this.getBackendRedirect(req, 'google')).toString();
      const svc = await import('../services/oauthService');
      const result = await svc.handleGoogleCallback({ code, state, redirectUri });
      // If browser requested (HTML), redirect to frontend with token in fragment
      const accept = (req.headers['accept'] as string) || '';
      const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      if (accept.includes('text/html')) {
        const redirect = `${frontend}/auth/oauth-complete#token=${encodeURIComponent(result.token)}`;
        res.redirect(302, redirect);
        return;
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // OAuth: iniciar autorização Facebook
  facebookAuthorize = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const redirectUri = (process.env.FACEBOOK_REDIRECT_URI || this.getBackendRedirect(req, 'facebook')).toString();
      const svc = await import('../services/oauthService');
      const { url } = await svc.getFacebookAuthorizationUrl({ redirectUri });
      res.json({ url });
    } catch (error) {
      next(error);
    }
  };

  // OAuth: callback do Facebook
  facebookCallback = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
  const { code, state } = req.query as any;
  const redirectUri = (process.env.FACEBOOK_REDIRECT_URI || this.getBackendRedirect(req, 'facebook')).toString();
      const svc = await import('../services/oauthService');
      const result = await svc.handleFacebookCallback({ code, state, redirectUri });
      const accept = (req.headers['accept'] as string) || '';
      const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      if (accept.includes('text/html')) {
        const redirect = `${frontend}/auth/oauth-complete#token=${encodeURIComponent(result.token)}`;
        res.redirect(302, redirect);
        return;
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    if (!req.userId) {
      throw new UnauthorizedError("Não autorizado");
    }
    
    const user = await this.authService.getProfile(req.userId);
    res.json(user);
  };

  logout = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Limpar cookies httpOnly
      clearAuthCookies(res);
      
      // Para JWT, o logout também pode implementar blacklist de tokens se necessário
      res.status(200).json({ message: "Logout realizado com sucesso." });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const refreshToken = req.cookies?.x_refresh_token || req.body.refreshToken;
    
    if (!refreshToken) {
      throw new BadRequestError('Refresh token é obrigatório');
    }

    const jwt = require('jsonwebtoken');
    const config = require('../config/environment').config;

    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;

      const user = await this.authService.getProfile(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('Usuário não encontrado');
      }

      const newToken = jwt.sign(
        { userId: user.id, role: user.role },
        config.jwtSecret,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id, role: user.role },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      setAuthCookies(res, newToken, newRefreshToken);

      res.status(200).json({
        accessToken: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch {
      clearAuthCookies(res);
      throw new UnauthorizedError('Refresh token inválido');
    }
  };

  /**
   * Facebook Data Deletion Callback
   * Endpoint exigido pelo Facebook para permitir que usuários solicitem exclusão de dados
   * Documentação: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
   */
  facebookDataDeletion = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const signedRequest = req.body.signed_request;
    
    if (!signedRequest) {
      throw new BadRequestError('signed_request é obrigatório');
    }

    // Decodificar o signed_request do Facebook
    const parts = signedRequest.split('.');
    if (parts.length !== 2) throw new BadRequestError('signed_request inválido');
    
    const payload = parts[1];
    
    // Decodificar o payload (base64url)
    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    );
    
    const userId = data.user_id;
    
    if (!userId) {
      throw new BadRequestError('user_id não encontrado no signed_request');
    }
    
    logger.info({ facebookUserId: userId }, 'Solicitação de exclusão de dados do Facebook recebida');
    
    const confirmationCode = `FB-DEL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    logger.info({ facebookId: userId }, 'Solicitação de exclusão registrada (Facebook ID não mapeado para usuário local)');
    
    const statusUrl = `${process.env.FRONTEND_URL || 'https://xproducoeseeventos.com.br'}/data-deletion-status?code=${confirmationCode}`;
    
    res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode
    });
  };
}
