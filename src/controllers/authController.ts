import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService.js";
import logger from "../config/logger.js";
import { setAuthCookies, clearAuthCookies } from "../config/cookies.js";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from "../utils/errors.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config/environment.js";

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


interface SocialTokenValidation {
  valid: boolean;
  email?: string;
  name?: string;
  sub?: string;
  picture?: string;
  error?: string;
}

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { name, email, password, role, phone, companyName } = req.body;

      const result = await this.authService.register({
        name,
        email,
        password,
        role,
        phone,
        companyName,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { email, password } = req.body;


    try {
      const result = await this.authService.login({ email, password });
      
      setAuthCookies(res, result.token, result.refreshToken);
      
      res.status(200).json({
        user: result.user,
        redirectTo: result.redirectTo,
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } catch (error: unknown) {
      if (error instanceof Error && ('code' in error && error.code === 'EMAIL_NOT_VERIFIED' || error.message.includes('verificado'))) {
        return next(new ForbiddenError('E-mail não verificado. Verifique sua caixa de entrada.', 'EMAIL_NOT_VERIFIED'));
      }
      
      if (error instanceof Error && (error.message === "Credenciais inválidas." || error.message.includes('not found') || error.message.includes('não encontrado') || error.message.includes('invalid'))) {
        return next(new UnauthorizedError('Credenciais inválidas.'));
      }
      
      next(error);
    }
  };

  requestPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { email } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;
    
    try {
      const result = await this.authService.requestPasswordReset(email, ipAddress, userAgent);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Usuário não encontrado') {
        return next(new NotFoundError('Não encontramos nenhuma conta com este e-mail.'));
      }
      next(error);
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
    next: NextFunction,
  ): Promise<void> => {
    const token = (req.query.token as string) || req.body.token;
    if (!token) return next(new BadRequestError('Token é obrigatório'));
    
    try {
      await (await import('../services/userService.js')).verifyEmailByToken(token);
      res.status(200).json({ success: true });
    } catch (e: any) {
      next(new BadRequestError(e.message || 'Token inválido'));
    }
  };

  // Endpoint público para usuário solicitar reenvio de verificação
  resendVerificationPublic = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email) return next(new BadRequestError('Email é obrigatório'));
      
      const user = await this.authService.findUserByEmail(email);
      if (!user) return next(new NotFoundError('Usuário não encontrado'));
      
      await (await import('../services/userService.js')).resendEmailVerification(user.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.userId) {
        return next(new UnauthorizedError("ID do utilizador não encontrado no token."));
      }
      const user = await this.authService.getProfile(req.userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.userId) {
        return next(new UnauthorizedError("ID do utilizador não encontrado no token."));
      }
      const { name, avatarUrl } = req.body;
      const user = await this.authService.updateProfile(req.userId, {
        name,
        avatarUrl,
      });
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  inviteCollaborator = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
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
    } catch (error) {
      next(error);
    }
  };

  // Método para colaboradores completarem o registo
  completeRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { token, password } = req.body;
    if (!token || !password) {
      return next(new BadRequestError('Token e password são obrigatórios'));
    }
    try {
      await this.authService.resetPassword(token, password);
      res.status(200).json({ success: true });
    } catch (e: any) {
      next(new BadRequestError(e.message || 'Falha ao completar registro'));
    }
  };

  /**
   * Login Social (Google ou Facebook) robusto e seguro
   */
  socialLogin = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { accessToken, userData } = req.body;
      
      // Detectar provider pela rota
      const isFacebook = req.path.includes('facebook');
      const provider = isFacebook ? 'Facebook' : 'Google';
      
      // Validar token com o provider apropriado
      if (accessToken) {
        logger.info({ provider }, "Processando login social");
        
        const validation: SocialTokenValidation = isFacebook 
          ? await validateFacebookToken(accessToken)
          : await validateGoogleToken(accessToken);
        
        if (!validation.valid) {
          logger.warn({ error: validation.error }, `Token ${provider} inválido`);
          return next(new UnauthorizedError(validation.error || "Token inválido"));
        }
        
        const email = validation.email!;
        const name = validation.name || email.split('@')[0];
        const avatarUrl = validation.picture || null;
        
        // Vincular ou criar usuário local
        const { prisma } = await import('../config/prisma.js');
        let user = await prisma.user.findUnique({ where: { email } });
        let isNewUser = false;

        if (!user) {
          isNewUser = true;
          // Gerar um hash de senha real (bcrypt) para consistência
          const randomPassword = crypto.randomBytes(32).toString('hex');
          const passwordHash = await bcrypt.hash(randomPassword, 10);
          
          user = await prisma.user.create({
            data: {
              name,
              email,
              passwordHash,
              verified: true,
              avatarUrl,
              role: 'CLIENT', // Novos usuários via social são clientes por padrão
            },
          });
          
          // Criar perfil de cliente se for CLIENT
          try {
            await prisma.client.create({ data: { userId: user.id } });
          } catch (e) {
            logger.warn({ err: e }, 'Falha ao criar perfil de cliente (não crítico)');
          }
        } else if (avatarUrl && !user.avatarUrl) {
          await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
        }

        // Login para obter tokens usando o AuthService
        const result = await this.authService.loginById(user.id);
        
        // Definir cookies httpOnly para segurança adicional
        const { setAuthCookies } = await import('../config/cookies.js');
        setAuthCookies(res, result.token, result.refreshToken);

        // Calcular rota de redirecionamento baseada no role
        let redirectTo = '/dashboard';
        switch (user.role) {
          case 'ADMIN': redirectTo = '/admin/painel'; break;
          case 'COLLABORATOR': redirectTo = '/colaborador/painel'; break;
          case 'CLIENT': redirectTo = '/cliente/painel'; break;
        }

        // Admin não precisa completar perfil no fluxo de cliente
        const clientProfile = user.role === 'CLIENT' 
          ? await prisma.client.findUnique({ where: { userId: user.id } })
          : null;
          
        const shouldCompleteProfile = user.role === 'CLIENT' && (isNewUser || !clientProfile?.phone);

        res.status(isNewUser ? 201 : 200).json({
          ...result,
          redirectTo,
          shouldCompleteProfile
        });
        return;
      }
    
    // Fallback: userData enviado diretamente (legado - menos seguro)
    logger.warn("Login social sem validação de token - modo legado");
    


    const email = (userData.email && typeof userData.email === 'string') ? userData.email : null;
    // Email validate by Zod


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
    } catch (error) {
      logger.error({ err: error }, "Erro no socialLogin");
      next(error);
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
      const svc = await import('../services/oauthService.js');
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
      const svc = await import('../services/oauthService.js');
      const result = await svc.handleGoogleCallback({ code, state, redirectUri });
      // If browser requested (HTML), redirect to frontend with token in fragment
      const accept = (req.headers['accept'] as string) || '';
      const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      if (accept.includes('text/html')) {
        const redirect = `${frontend}/auth/oauth-concluido#token=${encodeURIComponent(result.token)}`;
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
      const svc = await import('../services/oauthService.js');
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
      const svc = await import('../services/oauthService.js');
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
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) {
        return next(new UnauthorizedError("Não autorizado"));
      }
      
      const user = await this.authService.getProfile(req.userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
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
    next: NextFunction,
  ): Promise<void> => {
    const refreshToken = req.cookies?.x_refresh_token || req.body.refreshToken;
    
    if (!refreshToken) {
      return next(new BadRequestError('Refresh token é obrigatório'));
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;

      const user = await this.authService.getProfile(decoded.userId);
      if (!user) {
        return next(new UnauthorizedError('Usuário não encontrado'));
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
      next(new UnauthorizedError('Refresh token inválido'));
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
    next: NextFunction,
  ): Promise<void> => {
    try {
      const signedRequest = req.body.signed_request;
      
      if (!signedRequest) {
        return next(new BadRequestError('signed_request é obrigatório'));
      }

      // Decodificar o signed_request do Facebook
      const parts = signedRequest.split('.');
      if (parts.length !== 2) return next(new BadRequestError('signed_request inválido'));
      
      const payload = parts[1];
      
      // Decodificar o payload (base64url)
      const data = JSON.parse(
        Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
      );
      
      const userId = data.user_id;
      
      if (!userId) {
        return next(new BadRequestError('user_id não encontrado no signed_request'));
      }
      
      logger.info({ facebookUserId: userId }, 'Solicitação de exclusão de dados do Facebook recebida');
      
      const confirmationCode = `FB-DEL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      logger.info({ facebookId: userId }, 'Solicitação de exclusão registrada (Facebook ID não mapeado para usuário local)');
      
      const statusUrl = `${process.env.FRONTEND_URL || 'https://xproducoeseeventos.com.br'}/data-deletion-status?code=${confirmationCode}`;
      
      res.status(200).json({
        url: statusUrl,
        confirmation_code: confirmationCode
      });
    } catch (error) {
      next(error);
    }
  };
}
