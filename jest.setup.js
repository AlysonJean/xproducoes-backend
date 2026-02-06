// Apenas silencia logs pesados durante testes. Mocks específicos devem ser aplicados
// localmente nos testes que precisam evitar envio real de emails.
global.console = {
  ...console,
  warn: jest.fn(),
  info: jest.fn(),
};
