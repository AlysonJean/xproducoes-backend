import { describe, expect, it } from '@jest/globals';
import { encryptSecret, decryptSecret, isEncryptedSecret } from '../tokenEncryption';

// Achado (Fase 2.4): tokens OAuth (User.googleRefreshToken) eram gravados em texto puro
// no banco. Um vazamento do banco (ou um dump de backup, ver Fase 2.7) expunha
// diretamente o refresh token do Google Calendar de cada usuário conectado.
describe('tokenEncryption - cifra tokens OAuth em repouso (AES-256-GCM)', () => {
  it('cifra e decifra corretamente, preservando o valor original', () => {
    const original = '1//09_a_real_looking_google_refresh_token_value';
    const encrypted = encryptSecret(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted).not.toContain(original);
    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(decryptSecret(encrypted)).toBe(original);
  });

  it('gera uma saída diferente a cada chamada (IV aleatório) mesmo para o mesmo texto', () => {
    const original = 'same-token-value';
    const a = encryptSecret(original);
    const b = encryptSecret(original);

    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(original);
    expect(decryptSecret(b)).toBe(original);
  });

  it('mantém compatibilidade retroativa: valores em texto puro (gravados antes desta mudança) passam intactos', () => {
    const legacyPlaintext = '1//legacy-plaintext-refresh-token';

    expect(isEncryptedSecret(legacyPlaintext)).toBe(false);
    expect(decryptSecret(legacyPlaintext)).toBe(legacyPlaintext);
  });

  it('rejeita um texto cifrado adulterado (auth tag da GCM detecta violação de integridade)', () => {
    const encrypted = encryptSecret('valor-sensivel');
    const tampered = encrypted.slice(0, -4) + 'AAAA';

    expect(() => decryptSecret(tampered)).toThrow();
  });
});
