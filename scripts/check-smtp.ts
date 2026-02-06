import 'dotenv/config';
import nodemailer from 'nodemailer';

async function verifySmtp() {
  console.log('--- Configuração Carregada ---');
  console.log('HOST:', process.env.SMTP_HOST);
  console.log('PORT:', process.env.SMTP_PORT);
  console.log('SECURE:', process.env.SMTP_SECURE);
  console.log('USER:', process.env.SMTP_USER);
  console.log('PASS:', process.env.SMTP_PASS ? '****** (definido)' : 'NÃO DEFINIDO');
  console.log('FROM:', process.env.EMAIL_FROM);
  console.log('------------------------------');

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      // Configurações comuns para resolver problemas com GoDaddy/Office365
      ciphers: 'SSLv3',
      rejectUnauthorized: false 
    },
    debug: true, // Inclui logs de debug do SMTP
    logger: true // Loga no console
  });

  try {
    console.log('Tentando verificar conexão SMTP...');
    await transporter.verify();
    console.log('✅ SUCESSO! Conexão SMTP estabelecida e autenticada.');
    
    // Tentar enviar um email de teste para o próprio remetente (loopback)
    console.log('Tentando enviar e-mail de teste...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || user,
      to: user, // Envia para si mesmo para testar
      subject: 'Teste de Configuração SMTP - Sistema X Produções',
      text: 'Se você recebeu este e-mail, a configuração SMTP está funcionando.',
      html: '<b>Se você recebeu este e-mail, a configuração SMTP está funcionando.</b>'
    });
    console.log('✅ E-mail enviado com sucesso:', info.messageId);

  } catch (error: any) {
    console.error('❌ FALHA na conexão ou envio:');
    console.error('Código:', error.code);
    console.error('Mensagem:', error.message);
    if (error.response) console.error('Resposta do Servidor:', error.response);
  }
}

verifySmtp();
