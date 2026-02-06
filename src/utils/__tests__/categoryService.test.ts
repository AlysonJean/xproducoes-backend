import * as categoryService from '../../services/categoryService';

jest.mock('../../repositories/categoryRepository', () => {
  return {
    CategoryRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn(async (data) => ({ id: 'cat1', ...data })),
      update: jest.fn(async (id, data) => ({ id, ...data })),
      findAll: jest.fn(async () => [{ id: 'cat1', name: 'Cat', slug: 'cat' }]),
      delete: jest.fn(async (id) => ({ id })),
      countEquipments: jest.fn(async (id) => 0),
      findById: jest.fn(async (id) => ({ id, name: 'Cat', slug: 'cat' })),
      findAllWithEquipmentCount: jest.fn(async () => [{ id: 'cat1', count: 2 }]),
      findFeatured: jest.fn(async () => [{ id: 'cat1', featured: true }]),
    }))
  };
});

describe('categoryService', () => {
  it('deve criar categoria', async () => {
    const result = await categoryService.create({ name: 'Nova' });
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name', 'Nova');
    expect(result).toHaveProperty('slug', 'nova');
  });

  it('deve atualizar categoria', async () => {
    const result = await categoryService.update('cat1', { name: 'Editada' });
    expect(result).toHaveProperty('id', 'cat1');
    expect(result).toHaveProperty('name', 'Editada');
  });

  it('deve listar todas as categorias', async () => {
    const result = await categoryService.findAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('id');
  });

  it('deve deletar categoria sem equipamentos vinculados', async () => {
    const result = await categoryService.deleteCategory('cat1');
    expect(result).toHaveProperty('id', 'cat1');
  });

  it('deve contar equipamentos', async () => {
    const result = await categoryService.countEquipments('cat1');
    expect(result).toBe(0);
  });

  it('deve buscar categoria por id', async () => {
    const result = await categoryService.findById('cat1');
    expect(result).toHaveProperty('id', 'cat1');
  });

  it('deve listar categorias com contagem', async () => {
    const result = await categoryService.findAllWithEquipmentCount();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('count');
  });

  it('deve buscar categorias em destaque', async () => {
    const result = await categoryService.findFeatured();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('featured', true);
  });
});
