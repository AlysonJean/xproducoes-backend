import * as reviewService from '../../services/reviewService';

describe('reviewService', () => {
  it('deve rejeitar review', async () => {
    await expect(reviewService.reject('r1')).resolves.toBeUndefined();
  });

  it('deve retornar stats', async () => {
    await expect(reviewService.getStats()).resolves.not.toBeNull();
  });

  it('deve retornar recentes', async () => {
    const result = await reviewService.getRecent(2);
    expect(result).not.toBeNull();
  });
});
