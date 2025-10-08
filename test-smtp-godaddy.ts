import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

console.log('\n🧪 TESTE DE SMTP - GODADDY WORKSPACE EMAIL\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 Configuração:');
console.log(`   Host: ${SMTP_HOST}`);
console.log(`   Porta: ${SMTP_PORT}`);
console.log(`   SSL/Secure: ${SMTP_SECURE}`);
console.log(`   Usuário: ${SMTP_USER}`);
console.log(`   Senha: ${'*'.repeat(SMTP_PASS?.length || 0)}`);
console.log(`   From: ${EMAIL_FROM}\n`);

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.error('❌ ERRO: Variáveis de ambiente SMTP não configuradas!');
  console.error('   Verifique: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS\n');
  process.exit(1);
}

async function testSMTP() {
  try {
    console.log('🔄 Criando transporter...');
    
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      debug: true, // Ativa logs detalhados
      logger: true, // Ativa logger
    });

    console.log('✅ Transporter criado!\n');
    console.log('🔄 Verificando conexão...\n');

    // Testa a conexão
    await transporter.verify();
    console.log('\n✅ CONEXÃO SMTP BEM-SUCEDIDA!\n');

    console.log('📧 Enviando email de teste...\n');

    // Envia email de teste
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: SMTP_USER, // Envia para o próprio email
      subject: '✅ Teste SMTP - GoDaddy Workspace Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  
                  <!-- Header com Gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                        ✅ Teste SMTP
                      </h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                        GoDaddy Workspace Email
                      </p>
                    </td>
                  </tr>

                  <!-- Conteúdo -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">
                        🎉 Parabéns!
                      </h2>
                      <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Seu servidor SMTP da <strong>GoDaddy</strong> está configurado corretamente e funcionando perfeitamente!
                      </p>

                      <!-- Box de Informações -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-left: 4px solid #10b981; border-radius: 4px; margin: 20px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                              📊 Configuração Usada:
                            </p>
                            <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                              <li><strong>Host:</strong> ${SMTP_HOST}</li>
                              <li><strong>Porta:</strong> ${SMTP_PORT}</li>
                              <li><strong>SSL:</strong> ${SMTP_SECURE ? 'Sim' : 'Não'}</li>
                              <li><strong>Usuário:</strong> ${SMTP_USER}</li>
                              <li><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <!-- Dicas -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                              💡 Próximos Passos:
                            </p>
                            <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                              <li>Testar reset de senha na aplicação</li>
                              <li>Verificar emails de confirmação</li>
                              <li>Testar emails de booking</li>
                              <li>Configurar SPF/DKIM (se necessário)</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Este email foi enviado automaticamente pelo sistema de testes.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        <strong>X Produções e Eventos</strong>
                      </p>
                      <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">
                        Sistema de Email Profissional
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
✅ TESTE SMTP - GODADDY WORKSPACE EMAIL

🎉 Parabéns!

Seu servidor SMTP da GoDaddy está configurado corretamente e funcionando perfeitamente!

📊 Configuração Usada:
- Host: ${SMTP_HOST}
- Porta: ${SMTP_PORT}
- SSL: ${SMTP_SECURE ? 'Sim' : 'Não'}
- Usuário: ${SMTP_USER}
- Data: ${new Date().toLocaleString('pt-BR')}

💡 Próximos Passos:
- Testar reset de senha na aplicação
- Verificar emails de confirmação
- Testar emails de booking
- Configurar SPF/DKIM (se necessário)

---
X Produções e Eventos
Sistema de Email Profissional
      `,
    });

    console.log('\n✅ EMAIL ENVIADO COM SUCESSO!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Informações do Envio:');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   Accepted: ${info.accepted?.join(', ')}`);
    console.log(`   Rejected: ${info.rejected?.join(', ') || 'Nenhum'}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📬 Verifique sua caixa de entrada:');
    console.log(`   ${SMTP_USER}\n`);
    console.log('✨ SMTP da GoDaddy está funcionando perfeitamente!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERRO AO TESTAR SMTP:\n');
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Command: ${error.command || 'N/A'}\n`);

    if (error.code === 'EAUTH') {
      console.error('🔐 ERRO DE AUTENTICAÇÃO:');
      console.error('   - Verifique se o usuário e senha estão corretos');
      console.error('   - Certifique-se de usar o email completo como usuário');
      console.error('   - Verifique se a senha está correta\n');
    } else if (error.code === 'ECONNECTION') {
      console.error('🌐 ERRO DE CONEXÃO:');
      console.error('   - Verifique se o host está correto: smtpout.secureserver.net');
      console.error('   - Verifique se a porta está correta: 465 (SSL) ou 587 (TLS)');
      console.error('   - Verifique sua conexão com a internet\n');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏱️ TIMEOUT:');
      console.error('   - O servidor demorou muito para responder');
      console.error('   - Verifique sua conexão com a internet');
      console.error('   - Tente usar a porta 587 (TLS) ao invés de 465 (SSL)\n');
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

testSMTP();
