import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import logger from "../config/logger";
import { isAppError, getErrorMessage, getErrorCode } from "../types/common";

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
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { name, email, password, role, phone, companyName } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios' });
        return;
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
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: "Email e senha são obrigatórios" });
        return;
      }

      try {
        const result = await this.authService.login({ email, password });
        res.status(200).json(result);
      } catch (error: unknown) {
        if (getErrorCode(error) === 'EMAIL_NOT_VERIFIED') {
          res.status(403).json({
            message: 'E-mail não verificado. Verifique sua caixa de entrada.',
            code: 'EMAIL_NOT_VERIFIED',
          });
          return;
        }
        const errMsg = getErrorMessage(error);
        if (errMsg === "Credenciais inválidas." || errMsg === 'Usuário não encontrado' || errMsg === 'Senha inválida') {
          res.status(401).json({ message: 'Credenciais inválidas.' });
          return;
        }
        throw error;
      }
    } catch (error) {
      logger.error({obj:error}, "Erro no login:");
      next(error);
    }
  };

  requestPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get('user-agent') || undefined;
      const result = await this.authService.requestPasswordReset(email, ipAddress, userAgent);
      res.status(200).json(result);
    } catch (error: unknown) {
      if (getErrorMessage(error) === 'Usuário não encontrado') {
        res.status(404).json({ message: 'Não encontramos nenhuma conta com este e-mail.' });
        return;
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
    try {
      const token = (req.query.token as string) || req.body.token;
  if (!token) { res.status(400).json({ message: 'Token é obrigatório' }); return; }
      try {
        await (await import('../services/userService')).verifyEmailByToken(token);
        res.status(200).json({ success: true });
      } catch (e: unknown) {
        res.status(400).json({ message: getErrorMessage(e) || 'Token inválido' });
      }
    } catch (error) {
      next(error);
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
  if (!email) { res.status(400).json({ message: 'Email é obrigatório' }); return; }
  const user = await this.authService.findUserByEmail(email);
  if (!user) { res.status(404).json({ message: 'Usuário não encontrado' }); return; }
  await (await import('../services/userService')).resendEmailVerification(user.id);
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
        res
          .status(401)
          .json({ message: "ID do utilizador não encontrado no token." });
        return;
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
        res
          .status(401)
          .json({ message: "ID do utilizador não encontrado no token." });
        return;
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

  // Método para administradores convidarem colaboradores
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
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        res.status(400).json({ message: 'Token e password são obrigatórios' });
        return;
      }
      try {
        await this.authService.resetPassword(token, password);
        res.status(200).json({ success: true });
      } catch (e: unknown) {
        res.status(400).json({ message: getErrorMessage(e) || 'Falha ao completar registro' });
      }
    } catch (error) {
      next(error);
    }
  };

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
        logger.info(`Validando access token com ${provider}`);
        
        const validation = isFacebook 
          ? await validateFacebookToken(accessToken)
          : await validateGoogleToken(accessToken);
        
        if (!validation.valid) {
          logger.warn({ error: validation.error }, `Token ${provider} inválido`);
          res.status(401).json({ message: validation.error || "Token inválido" });
          return;
        }
        
        const email = validation.email!;
        const name = validation.name || email.split('@')[0];
        
        logger.info({ email, name }, "Token Google validado com sucesso");
        
        try {
          // Buscar usuário pelo email
          const user = await this.authService.findUserByEmail(email);

          if (user) {
            // Se existe, fazer login
            logger.info({ userId: user.id }, "Usuário encontrado, fazendo login");
            const result = await this.authService.loginById(user.id);
            res.status(200).json(result);
          } else {
            // Se não existe, criar novo utilizador
            const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
            
            const registerResult = await this.authService.register({
              name,
              email,
              password: randomPassword,
              role: "CLIENT",
            });
            
            // Após registro, fazer login para obter token
            const loginResult = await this.authService.loginById(registerResult.id);
            res.status(201).json(loginResult);
          }
        } catch (error) {
          logger.error({ error }, "Erro no login social");
          if (error instanceof Error) {
            res.status(400).json({ message: error.message });
            return;
          }
          throw error;
        }
        return;
      }
      
      // Fallback: userData enviado diretamente (legado - menos seguro)
      logger.warn("Login social sem validação de token - modo legado");
      
      if (!userData || typeof userData !== 'object') {
        res.status(400).json({ message: "Token ou dados de usuário são obrigatórios" });
        return;
      }

      const email = (userData.email && typeof userData.email === 'string') ? userData.email : null;
      if (!email) {
        res.status(400).json({ message: "E-mail é obrigatório" });
        return;
      }

      try {
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
          // Calcular nome seguro: priorizar userData.name quando for string válida
          let safeName: string;
          if (userData.name && typeof userData.name === 'string' && userData.name.trim()) {
            safeName = userData.name.trim();
          } else if (email.includes('@')) {
            // dividir apenas em string já validada
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
        logger.error({obj:error, errorMessage: error instanceof Error ? error.message : String(error)}, "Erro no login social:");
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
          return;
        }
        throw error;
      }
    } catch (error) {
      logger.error({obj:error}, "Erro no processamento de login social:");
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
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ message: "Não autorizado" });
        return;
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
      // Para JWT, o logout é do lado do cliente (remover token)
      // Aqui podemos implementar uma blacklist de tokens se necessário
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
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ message: 'Refresh token é obrigatório' });
        return;
      }

      // Verificar se o refresh token é válido
      const jwt = require('jsonwebtoken');
      const config = require('../config/environment').config;

      try {
        const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;

        // Buscar usuário para confirmar que ainda existe
        const user = await this.authService.getProfile(decoded.userId);
        if (!user) {
          res.status(401).json({ message: 'Usuário não encontrado' });
          return;
        }

        // Gerar novo access token
        const newToken = jwt.sign(
          { userId: user.id, role: user.role },
          config.jwtSecret,
          { expiresIn: '15m' }
        );

        // Gerar novo refresh token
        const newRefreshToken = jwt.sign(
          { userId: user.id, role: user.role },
          config.jwtSecret,
          { expiresIn: '7d' }
        );

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
      } catch (tokenError) {
        res.status(401).json({ message: 'Refresh token inválido' });
        return;
      }
    } catch (error) {
      next(error);
    }
  };
}
