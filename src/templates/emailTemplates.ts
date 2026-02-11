// Email templates profissionais para X Produções e Eventos

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface PasswordResetData {
  userName: string;
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
  userAgent?: string;
}

export class EmailTemplates {
  private static readonly COMPANY_NAME = 'X Produções e Eventos';
  private static readonly COMPANY_LOGO = 'https://xproducoeseeventos.com.br/logo.png';
  private static readonly SUPPORT_EMAIL = 'suporte@xproducoeseeventos.com.br';
  private static readonly PRIMARY_COLOR = '#6366f1'; // indigo-500
  
  /**
   * Template profissional para reset de senha
   * Inspirado em: Google, Facebook, GitHub
   */
  static passwordReset(data: PasswordResetData): EmailTemplate {
    const { userName, resetUrl, expiresIn, ipAddress, userAgent } = data;
    
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse:collapse;border-spacing:0;border:0;margin:0;}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;">
  <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <!-- Container principal -->
        <table role="presentation" style="width:600px;border-collapse:collapse;border:0;border-spacing:0;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          
          <!-- Header com logo -->
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg, ${this.PRIMARY_COLOR} 0%, #4f46e5 100%);border-radius:16px 16px 0 0;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                🔐 Redefinir Senha
              </h1>
            </td>
          </tr>

          <!-- Conteúdo principal -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:24px;color:#111827;">
                Olá <strong>${userName}</strong>,
              </p>
              
              <p style="margin:0 0 20px;font-size:16px;line-height:24px;color:#374151;">
                Recebemos uma solicitação para redefinir a senha da sua conta em <strong>${this.COMPANY_NAME}</strong>.
              </p>

              <p style="margin:0 0 30px;font-size:16px;line-height:24px;color:#374151;">
                Se você não solicitou esta alteração, <strong>ignore este e-mail</strong> e sua senha permanecerá a mesma.
              </p>

              <!-- Botão principal -->
              <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;margin-bottom:30px;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" 
                       style="display:inline-block;padding:16px 40px;background-color:${this.PRIMARY_COLOR};color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.5px;box-shadow:0 2px 4px rgba(99,102,241,0.3);transition:background-color 0.2s;">
                      Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link alternativo -->
              <p style="margin:0 0 30px;font-size:14px;line-height:20px;color:#6b7280;">
                Ou copie e cole este link no seu navegador:
              </p>
              <p style="margin:0 0 30px;padding:12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;color:#6366f1;word-break:break-all;">
                ${resetUrl}
              </p>

              <!-- Informações de segurança -->
              <div style="margin:30px 0;padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;">
                <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#92400e;">
                  ⏰ Link expira em ${expiresIn}
                </p>
                <p style="margin:0;font-size:13px;color:#78350f;">
                  Por motivos de segurança, este link só pode ser usado uma vez e expirará após o prazo.
                </p>
              </div>

              ${ipAddress || userAgent ? `
              <!-- Detalhes da solicitação -->
              <div style="margin:30px 0;padding:16px;background-color:#f3f4f6;border-radius:6px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">
                  Detalhes da Solicitação
                </p>
                ${ipAddress ? `
                <p style="margin:0;font-size:13px;color:#4b5563;">
                  <strong>IP:</strong> ${ipAddress}
                </p>
                ` : ''}
                ${userAgent ? `
                <p style="margin:0;font-size:13px;color:#4b5563;">
                  <strong>Dispositivo:</strong> ${userAgent}
                </p>
                ` : ''}
              </div>
              ` : ''}

              <!-- Dicas de segurança -->
              <div style="margin:30px 0;padding:20px;background-color:#e0f2fe;border-left:4px solid:#0284c7;border-radius:6px;">
                <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#075985;">
                  💡 Dicas de Segurança
                </p>
                <ul style="margin:0;padding-left:20px;font-size:13px;color:#0c4a6e;line-height:20px;">
                  <li>Use uma senha forte com pelo menos 8 caracteres</li>
                  <li>Combine letras maiúsculas, minúsculas, números e símbolos</li>
                  <li>Não reutilize senhas de outras contas</li>
                  <li>Ative autenticação de dois fatores quando disponível</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:30px 40px;background-color:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 10px;font-size:13px;color:#6b7280;text-align:center;">
                Se você não solicitou esta redefinição de senha, <strong>alguém pode estar tentando acessar sua conta</strong>.
              </p>
              <p style="margin:0 0 20px;font-size:13px;color:#6b7280;text-align:center;">
                Entre em contato conosco imediatamente: 
                <a href="mailto:${this.SUPPORT_EMAIL}" style="color:${this.PRIMARY_COLOR};text-decoration:none;">
                  ${this.SUPPORT_EMAIL}
                </a>
              </p>

              <hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;">

              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} ${this.COMPANY_NAME}. Todos os direitos reservados.
              </p>
              <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
                Este é um e-mail automático, por favor não responda.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
Olá ${userName},

Recebemos uma solicitação para redefinir a senha da sua conta em ${this.COMPANY_NAME}.

Para redefinir sua senha, acesse o link abaixo:
${resetUrl}

Este link expira em ${expiresIn} e só pode ser usado uma vez.

Se você não solicitou esta alteração, ignore este e-mail e sua senha permanecerá a mesma.

${ipAddress ? `\nIP da solicitação: ${ipAddress}` : ''}
${userAgent ? `\nDispositivo: ${userAgent}` : ''}

DICAS DE SEGURANÇA:
- Use uma senha forte com pelo menos 8 caracteres
- Combine letras maiúsculas, minúsculas, números e símbolos
- Não reutilize senhas de outras contas

Se você não fez esta solicitação, entre em contato conosco imediatamente em ${this.SUPPORT_EMAIL}.

---
© ${new Date().getFullYear()} ${this.COMPANY_NAME}
Este é um e-mail automático, por favor não responda.
    `.trim();

    return {
      subject: `🔐 Redefinir senha - ${this.COMPANY_NAME}`,
      html,
      text
    };
  }

  /**
   * Template para confirmação de senha alterada
   */
  static passwordChanged(userName: string, ipAddress?: string): EmailTemplate {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Senha Alterada</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f3f4f6;">
  <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" style="width:600px;border-collapse:collapse;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg, #10b981 0%, #059669 100%);border-radius:16px 16px 0 0;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">
                ✅ Senha Alterada
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#111827;">
                Olá <strong>${userName}</strong>,
              </p>
              
              <p style="margin:0 0 20px;font-size:16px;color:#374151;">
                Sua senha foi alterada com sucesso em <strong>${this.COMPANY_NAME}</strong>.
              </p>

              <div style="margin:30px 0;padding:20px;background-color:#d1fae5;border-left:4px solid #10b981;border-radius:6px;">
                <p style="margin:0;font-size:14px;font-weight:600;color:#065f46;">
                  ✓ Senha atualizada em ${new Date().toLocaleString('pt-BR')}
                </p>
                ${ipAddress ? `
                <p style="margin:10px 0 0;font-size:13px;color:#047857;">
                  <strong>IP:</strong> ${ipAddress}
                </p>
                ` : ''}
              </div>

              <div style="margin:30px 0;padding:20px;background-color:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;">
                <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#991b1b;">
                  ⚠️ Você não fez esta alteração?
                </p>
                <p style="margin:0;font-size:13px;color:#7f1d1d;">
                  Se você não reconhece esta atividade, entre em contato conosco <strong>imediatamente</strong> em:
                  <br><a href="mailto:${this.SUPPORT_EMAIL}" style="color:#ef4444;text-decoration:none;">${this.SUPPORT_EMAIL}</a>
                </p>
              </div>

            </td>
          </tr>

          <tr>
            <td style="padding:30px 40px;background-color:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} ${this.COMPANY_NAME}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
Olá ${userName},

Sua senha foi alterada com sucesso em ${this.COMPANY_NAME}.

Data/Hora: ${new Date().toLocaleString('pt-BR')}
${ipAddress ? `IP: ${ipAddress}` : ''}

⚠️ VOCÊ NÃO FEZ ESTA ALTERAÇÃO?
Se você não reconhece esta atividade, entre em contato conosco IMEDIATAMENTE em ${this.SUPPORT_EMAIL}.

---
© ${new Date().getFullYear()} ${this.COMPANY_NAME}
    `.trim();

    return {
      subject: `✅ Senha alterada - ${this.COMPANY_NAME}`,
      html,
      text
    };
  }

  /**
   * Template para notificação de atribuição de colaborador
   */
  static assignmentNotification(
    collaboratorName: string,
    eventName: string,
    eventDate: string,
    eventTime: string,
    role: string,
    location: string,
    bookingUrl: string
  ): EmailTemplate {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova Escala de Trabalho</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f3f4f6;">
  <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" style="width:600px;border-collapse:collapse;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg, ${this.PRIMARY_COLOR} 0%, #4f46e5 100%);border-radius:16px 16px 0 0;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">
                📅 Nova Escala
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#111827;">
                Olá <strong>${collaboratorName}</strong>,
              </p>
              
              <p style="margin:0 0 20px;font-size:16px;color:#374151;">
                Você foi escalado(a) para um novo evento pela <strong>${this.COMPANY_NAME}</strong>.
              </p>

              <div style="background-color:#f3f4f6;border-radius:8px;padding:24px;margin-bottom:24px;">
                <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">Detalhes do Evento</h2>
                
                <table style="width:100%;">
                  <tr>
                    <td style="padding-bottom:12px;color:#6b7280;font-size:14px;width:100px;">Evento:</td>
                    <td style="padding-bottom:12px;color:#111827;font-weight:500;">${eventName}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:12px;color:#6b7280;font-size:14px;">Data:</td>
                    <td style="padding-bottom:12px;color:#111827;font-weight:500;">${eventDate}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:12px;color:#6b7280;font-size:14px;">Horário:</td>
                    <td style="padding-bottom:12px;color:#111827;font-weight:500;">${eventTime}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:12px;color:#6b7280;font-size:14px;">Função:</td>
                    <td style="padding-bottom:12px;color:#111827;font-weight:500;">${role}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:14px;">Local:</td>
                    <td style="color:#111827;font-weight:500;">${location}</td>
                  </tr>
                </table>
              </div>

              <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;margin-bottom:30px;">
                <tr>
                  <td align="center">
                    <a href="${bookingUrl}" 
                       style="display:inline-block;padding:14px 32px;background-color:${this.PRIMARY_COLOR};color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                      Ver Detalhes
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#6b7280;text-align:center;">
                Se houver algum impedimento, entre em contato com a administração o mais breve possível.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 40px;background-color:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} ${this.COMPANY_NAME}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
Olá ${collaboratorName},

Você foi escalado(a) para um novo evento:

Evento: ${eventName}
Data: ${eventDate}
Horário: ${eventTime}
Função: ${role}
Local: ${location}

Acesse o painel para mais detalhes: ${bookingUrl}

Se houver algum impedimento, entre em contato imediatamente.
    `.trim();

    return {
      subject: `📅 Nova Escala: ${eventName} - ${eventDate}`,
      html,
      text
    };
  }
  /**
   * Template para lembrete de reserva (24h antes)
   */
  static bookingReminder(
    clientName: string,
    eventName: string,
    eventDate: string,
    eventTime: string,
    location: string,
    bookingUrl: string,
    googleCalendarLink: string
  ): EmailTemplate {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Reserva</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f3f4f6;">
  <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" style="width:600px;border-collapse:collapse;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          
          <tr>
            <td style="padding:30px 40px;text-align:center;background-color:#fffbeb;border-bottom:4px solid #f59e0b;border-radius:16px 16px 0 0;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#92400e;">
                🔔 Lembrete de Reserva
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#111827;">
                Olá <strong>${clientName}</strong>,
              </p>
              
              <p style="margin:0 0 24px;font-size:16px;color:#374151;">
                Sua reserva está chegando! Aqui estão os detalhes para amanhã:
              </p>

              <div style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:24px;margin-bottom:24px;">
                <h3 style="margin:0 0 16px;font-size:18px;color:#92400e;text-align:center;">${eventName}</h3>
                
                <table style="width:100%;">
                  <tr>
                    <td style="padding-bottom:12px;color:#78350f;font-size:14px;width:100px;">📅 Data:</td>
                    <td style="padding-bottom:12px;color:#451a03;font-weight:600;">${eventDate}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:12px;color:#78350f;font-size:14px;">⏰ Horário:</td>
                    <td style="padding-bottom:12px;color:#451a03;font-weight:600;">${eventTime}</td>
                  </tr>
                  <tr>
                    <td style="color:#78350f;font-size:14px;">📍 Local:</td>
                    <td style="color:#451a03;font-weight:600;">${location}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align:center;margin-bottom:24px;">
                <a href="${bookingUrl}" 
                   style="display:inline-block;padding:14px 32px;background-color:${this.PRIMARY_COLOR};color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;margin-bottom:12px;width:200px;">
                  Ver Detalhes
                </a>
                <br>
                <a href="${googleCalendarLink}" 
                   style="display:inline-block;padding:12px 24px;background-color:#ffffff;color:#4b5563;text-decoration:none;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-weight:500;width:200px;">
                  📅 Adicionar à Agenda
                </a>
              </div>
              
              <p style="margin:0;font-size:14px;color:#6b7280;text-align:center;">
                Precisa fazer alguma alteração? Entre em contato conosco.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 40px;background-color:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} ${this.COMPANY_NAME}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
Olá ${clientName},

🔔 Lembrete: Sua reserva é amanhã!

Evento: ${eventName}
Data: ${eventDate}
Horário: ${eventTime}
Local: ${location}

Acesse os detalhes: ${bookingUrl}
Adicionar ao Google Calendar: ${googleCalendarLink}

Atenciosamente,
${this.COMPANY_NAME}
    `.trim();

    return {
      subject: `Lembrete: Sua reserva é amanhã! - ${eventName}`,
      html,
      text
    };
  }
}
