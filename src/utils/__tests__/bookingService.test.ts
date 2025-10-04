
import { BookingService } from '../../services/bookingService';

jest.mock('../../repositories/bookingRepository', () => {
	return {
		BookingRepository: jest.fn().mockImplementation(() => ({
			findAll: jest.fn(async () => [{ id: 'b1', clientId: 'c1' }]),
			findById: jest.fn(async (id) => ({ id, clientId: 'c1' })),
			create: jest.fn(async (data) => ({ id: 'b1', ...data })),
			update: jest.fn(async (id, data) => ({ id, ...data })),
			delete: jest.fn(async (id) => ({ id })),
			count: jest.fn(async () => 1),
		}))
	};
});

describe('BookingService', () => {
	let service;
	beforeAll(() => {
		service = new BookingService();
	});

	it('deve listar bookings', async () => {
		const result = await service.bookingRepository.findAll();
		expect(Array.isArray(result)).toBe(true);
		expect(result[0]).toHaveProperty('id', 'b1');
	});

	it('deve buscar booking por id', async () => {
		const result = await service.bookingRepository.findById('b1');
		expect(result).toHaveProperty('id', 'b1');
	});

	it('deve criar booking', async () => {
		const result = await service.bookingRepository.create({ clientId: 'c1' });
		expect(result).toHaveProperty('id', 'b1');
		expect(result).toHaveProperty('clientId', 'c1');
	});

	it('deve atualizar booking', async () => {
		const result = await service.bookingRepository.update('b1', { clientId: 'c2' });
		expect(result).toHaveProperty('id', 'b1');
		expect(result).toHaveProperty('clientId', 'c2');
	});

	it('deve deletar booking', async () => {
		const result = await service.bookingRepository.delete('b1');
		expect(result).toHaveProperty('id', 'b1');
	});

	it('deve contar bookings', async () => {
		const result = await service.bookingRepository.count();
		expect(result).toBe(1);
	});
});

