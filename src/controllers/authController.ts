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
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Credenciais inválidas."
        ) {
          res.status(401).json({ message: error.message });
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
      const result = await this.authService.requestPasswordReset(email);
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
      const result = await this.authService.resetPassword(token, password);
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

      if (!userData?.email) {
        res.status(400).json({ message: "Dados de utilizador inválidos" });
        return;
      }

      // Por enquanto, implementação simplificada
      // Em produção, seria necessário validar o token com a API do provedor

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
          const result = await this.authService.register({
            name: userData.name || userData.email.split("@")[0],
            email: userData.email,
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
}
