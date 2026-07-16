// Achado (auditoria de produto): fora do modo dev, nada chamava o initialize() que anexa
// os listeners qr/ready/authenticated — restart()/logout() chamavam o client bruto
// diretamente, então `isReady` nunca virava true em produção, mesmo após restart. Este
// teste simula esse cenário exato: restart() num client "novo" (sem initialize() prévio,
// como acontece de verdade em produção) precisa deixar o listener 'ready' funcionando.

type Handler = (...args: unknown[]) => void;

const handlers: Record<string, Handler[]> = {};
const onMock = jest.fn((event: string, handler: Handler) => {
  handlers[event] = handlers[event] || [];
  handlers[event].push(handler);
});
const emit = (event: string, ...args: unknown[]) => {
  (handlers[event] || []).forEach((h) => h(...args));
};

jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    on: onMock,
    sendMessage: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
  })),
  LocalAuth: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('qrcode-terminal', () => ({ generate: jest.fn() }));

describe('whatsappService — reconexão em produção (sem initialize() prévio)', () => {
  let whatsappService: typeof import('../services/whatsappService').whatsappService;

  beforeEach(async () => {
    jest.resetModules();
    Object.keys(handlers).forEach((k) => delete handlers[k]);
    onMock.mockClear();
    ({ whatsappService } = await import('../services/whatsappService'));
  });

  it('restart() sozinho (sem initialize() ter rodado antes, como em produção) já deixa o listener "ready" funcionando', async () => {
    // Simula o cenário real de produção: initialize() (o wrapper com os listeners)
    // nunca rodou — só o restart() do painel admin é chamado.
    await whatsappService.restart();

    expect(whatsappService.getStatus().isReady).toBe(false);
    emit('ready');
    expect(whatsappService.getStatus().isReady).toBe(true);
  });

  it('múltiplos restarts não duplicam listeners (um único "ready" emitido não seta isReady mais de uma vez de forma inconsistente)', async () => {
    await whatsappService.restart();
    await whatsappService.restart();
    await whatsappService.restart();

    // 5 eventos (qr, ready, authenticated, auth_failure, disconnected) anexados uma
    // única vez, não uma vez por restart.
    expect(onMock).toHaveBeenCalledTimes(5);

    emit('ready');
    expect(whatsappService.getStatus().isReady).toBe(true);
  });

  it('logout() também garante que os listeners existem antes de reinicializar', async () => {
    await whatsappService.logout();
    emit('ready');
    expect(whatsappService.getStatus().isReady).toBe(true);
  });
});
