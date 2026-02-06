import { CartService } from '../../services/cartService';

// Mock do repositório para isolar lógica do CartService
jest.mock('../../repositories/cartRepository', () => {
  return {
    CartRepository: jest.fn().mockImplementation(() => ({
      findOrCreateCart: jest.fn(async (userId) => ({ id: 'cart1', userId, equipments: [], kit: null })),
      addItems: jest.fn(async (cartId, equipmentIds) => ({ id: cartId, equipments: equipmentIds })),
      removeItem: jest.fn(async (cartId, equipmentId) => ({ id: cartId, equipments: [] })),
      updateKit: jest.fn(async (cartId, kitId) => ({ id: cartId, kit: kitId })),
      clearEquipments: jest.fn(async (cartId) => true),
      clearKit: jest.fn(async (cartId) => true),
    }))
  };
});

describe('CartService', () => {
  let cartService;
  const userId = 'user1';
  const equipmentId = 'eq1';
  const kitId = 'kit1';

  beforeAll(() => {
    cartService = new CartService();
  });

  it('deve retornar o carrinho do usuário', async () => {
    const cart = await cartService.getCart(userId);
    expect(cart).toHaveProperty('id', 'cart1');
    expect(cart).toHaveProperty('userId', userId);
  });

  it('deve adicionar item ao carrinho', async () => {
    const updated = await cartService.addItemToCart(userId, equipmentId);
    expect(updated).toHaveProperty('equipments');
    expect(updated.equipments).toContain(equipmentId);
  });

  it('deve remover item do carrinho', async () => {
    const updated = await cartService.removeItemFromCart(userId, equipmentId);
    expect(updated).toHaveProperty('equipments');
    expect(updated.equipments).toEqual([]);
  });

  it('deve adicionar kit ao carrinho', async () => {
    const updated = await cartService.addKitToCart(userId, kitId);
    expect(updated).toHaveProperty('kit', kitId);
  });

  it('deve limpar o carrinho', async () => {
    const cart = await cartService.clearCart(userId);
    expect(cart).toHaveProperty('id', 'cart1');
  });

  it('deve simular checkout', async () => {
    const data = { userId, total: 100 };
    const result = await cartService.checkout(data);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('status', 'PENDING');
    expect(result).toHaveProperty('userId', userId);
    expect(result).toHaveProperty('total', 100);
  });
});
