import * as equipmentService from '../../services/equipmentService';

describe('equipmentService', () => {
  it('deve buscar todos equipamentos', async () => {
    await expect(equipmentService.findAll()).resolves.not.toBeNull();
  });

  it('deve buscar equipamento por id', async () => {
    await expect(equipmentService.findOne('e1')).resolves.not.toBeNull();
  });

  it('deve buscar por categoria', async () => {
    await expect(equipmentService.findByCategory('cat1')).resolves.not.toBeNull();
  });

  it('deve buscar disponibilidade', async () => {
    await expect(equipmentService.getAvailability('e1', 9, 2025)).resolves.not.toBeNull();
  });

  it('deve buscar total de equipamentos', async () => {
    await expect(equipmentService.getTotalEquipments()).resolves.not.toBeNull();
  });
});
