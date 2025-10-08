import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";

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
      } catch (error: any) {
        if (error?.code === 'EMAIL_NOT_VERIFIED') {
          res.status(403).json({
            message: 'E-mail não verificado. Verifique sua caixa de entrada.',
            code: 'EMAIL_NOT_VERIFIED',
          });
          return;
        }
        if (error instanceof Error && (error.message === "Credenciais inválidas." || error.message === 'Usuário não encontrado' || error.message === 'Senha inválida')) {
          res.status(401).json({ message: 'Credenciais inválidas.' });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error("Erro no login:", error);
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
    } catch (error) {
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
      } catch (e: any) {
        res.status(400).json({ message: e?.message || 'Token inválido' });
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
      } catch (e: any) {
        res.status(400).json({ message: e?.message || 'Falha ao completar registro' });
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
      const { userData } = req.body;

      // Validações de tipo para evitar usos inseguros (ex: userData.email.split)
      if (!userData || typeof userData !== 'object') {
        res.status(400).json({ message: "Dados de utilizador inválidos" });
        return;
      }

      const email = (userData.email && typeof userData.email === 'string') ? userData.email : null;
      if (!email) {
        res.status(400).json({ message: "Dados de utilizador inválidos" });
        return;
      }

  // Implementação simplificada
  // TODO Enterprise: validar o id_token/authorization_code com o provedor (Google, Facebook, etc.)
  // e estabelecer verificação de domínio/appId, uso de PKCE e state anti-CSRF no frontend.

      try {
        // Buscar usuário pelo email
        const user = await this.authService.findUserByEmail(userData.email);

        if (user) {
          // Se existe, fazer login
          const result = await this.authService.loginById(user.id);
          res.status(200).json(result);
        } else {
          // Se não existe, criar novo utilizador
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

          res.status(201).json(result);
        }
      } catch (error) {
        console.error("Erro no login social:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error("Erro no processamento de login social:", error);
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
