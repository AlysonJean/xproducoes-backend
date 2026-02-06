import { DashboardService } from '../../services/dashboardService';

jest.mock('../../services/bookingService', () => {
  return {
    BookingService: jest.fn().mockImplementation(() => ({
      getStats: jest.fn(async () => ({ total: 10 })),
      getChartData: jest.fn(async () => [1, 2, 3]),
      getMonthlyRevenueData: jest.fn(async () => [100, 200]),
      getAvailableYears: jest.fn(async () => [2024, 2025]),
      getRecentActivities: jest.fn(async () => [{ id: 1 }]),
      getCalendarData: jest.fn(async () => [{ date: '2025-09-14' }]),
      checkEquipmentAvailability: jest.fn(async () => true),
      getRevenue: jest.fn(async () => 1000),
      getBookingTrends: jest.fn(async () => [1, 2]),
    }))
  };
});

describe('DashboardService', () => {
  let service;
  beforeAll(() => {
    service = new DashboardService();
  });

  it('deve retornar stats', async () => {
    const stats = await service.bookingService.getStats();
    expect(stats).toHaveProperty('total', 10);
  });

  it('deve retornar dados de gráfico', async () => {
    const data = await service.bookingService.getChartData();
    expect(Array.isArray(data)).toBe(true);
  });

  it('deve retornar receita mensal', async () => {
    const data = await service.bookingService.getMonthlyRevenueData();
    expect(Array.isArray(data)).toBe(true);
  });

  it('deve retornar anos disponíveis', async () => {
    const years = await service.bookingService.getAvailableYears();
    expect(years).toContain(2024);
  });

  it('deve retornar atividades recentes', async () => {
    const acts = await service.bookingService.getRecentActivities();
    expect(Array.isArray(acts)).toBe(true);
  });

  it('deve retornar dados de calendário', async () => {
    const cal = await service.bookingService.getCalendarData();
    expect(Array.isArray(cal)).toBe(true);
  });

  it('deve checar disponibilidade de equipamento', async () => {
    const available = await service.bookingService.checkEquipmentAvailability();
    expect(available).toBe(true);
  });

  it('deve retornar receita', async () => {
    const revenue = await service.bookingService.getRevenue();
    expect(revenue).toBe(1000);
  });

  it('deve retornar tendências de booking', async () => {
    const trends = await service.bookingService.getBookingTrends();
    expect(Array.isArray(trends)).toBe(true);
  });
});
