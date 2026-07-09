import type { Request } from "express";

// Criação de sessão de checkout (exemplo: integração Stripe)
export async function createCheckoutSession(bookingId: string, userId: string) {
  // Integração com Stripe ou outro gateway (stub)
  // Exemplo: await stripe.charges.create({ ... })
  // Aqui você pode adicionar a lógica real de integração
  // Mock para testes
  return {
    status: "pending",
    gateway: "stripe",
    amount: 0,
    sessionId: "mock-session-id",
    url: "https://checkout.mock/redirect",
    bookingId,
    userId,
  };
}

// Webhook de pagamento (exemplo: Stripe)
export async function handleWebhookEvent(req: Request) {
  // Lógica de webhook (stub)
  // Exemplo: processar evento recebido do gateway
  // Aqui você pode adicionar a lógica real de webhook
  // Apenas simula recebimento
  return { received: true, event: req.body };
}

export async function createPaymentIntent(bookingId: string) {
  // Simulação de criação de payment intent
  return {
    id: `pi_${Date.now()}`,
    amount: 25000, // 250.00 em centavos
    currency: 'brl',
    status: 'requires_payment_method',
    bookingId,
    clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
}

export async function confirmPayment(paymentIntentId: string) {
  // Simulação de confirmação de pagamento
  return {
    id: paymentIntentId,
    status: 'succeeded',
    amount: 25000,
    currency: 'brl',
    confirmedAt: new Date().toISOString(),
    paymentMethod: {
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
      },
    },
  };
}

export async function refund(paymentId: string, amount?: number) {
  // Simulação de reembolso
  return {
    id: `re_${Date.now()}`,
    paymentId,
    amount: amount || 25000,
    currency: 'brl',
    status: 'succeeded',
    reason: 'requested_by_customer',
    createdAt: new Date().toISOString(),
  };
}

export async function getHistory(_userId: string) {
  // Simulação de histórico de pagamentos do usuário
  return [
    {
      id: 'pay_1',
      amount: 25000,
      currency: 'brl',
      status: 'succeeded',
      description: 'Aluguel de equipamento - Canon EOS R5',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      bookingId: 'booking_1',
    },
    {
      id: 'pay_2',
      amount: 15000,
      currency: 'brl',
      status: 'succeeded',
      description: 'Aluguel de equipamento - Sony A7III',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      bookingId: 'booking_2',
    },
  ];
}

export async function getByBooking(bookingId: string) {
  // Simulação de busca de pagamento por reserva
  return {
    id: 'pay_123',
    bookingId,
    amount: 25000,
    currency: 'brl',
    status: 'succeeded',
    paymentMethod: {
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
      },
    },
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  };
}

export async function getAllPayments(filters?: { status?: string }) {
  // Simulação de listagem de todos os pagamentos (admin)
  const payments = [
    {
      id: 'pay_1',
      amount: 25000,
      currency: 'brl',
      status: 'succeeded',
      customerName: 'João Silva',
      customerEmail: 'joao@example.com',
      description: 'Aluguel de equipamento - Canon EOS R5',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pay_2',
      amount: 15000,
      currency: 'brl',
      status: 'succeeded',
      customerName: 'Maria Santos',
      customerEmail: 'maria@example.com',
      description: 'Aluguel de equipamento - Sony A7III',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Aplicar filtros básicos
  if (filters?.status) {
    return payments.filter(p => p.status === filters.status);
  }

  return {
    data: payments,
    total: payments.length,
    page: 1,
    limit: 50,
  };
}

export async function getPaymentStats() {
  // Simulação de estatísticas de pagamento

  return {
    totalRevenue: 125000, // R$ 1.250,00
    thisMonthRevenue: 45000, // R$ 450,00
    lastMonthRevenue: 38000, // R$ 380,00
    totalTransactions: 85,
    thisMonthTransactions: 15,
    lastMonthTransactions: 12,
    averageTransactionValue: 1470, // R$ 14,70
    pendingPayments: 3,
    failedPayments: 2,
    successRate: 94.7,
    topPaymentMethods: [
      { method: 'credit_card', percentage: 75.3, amount: 94125 },
      { method: 'debit_card', percentage: 18.8, amount: 23500 },
      { method: 'pix', percentage: 5.9, amount: 7375 },
    ],
  };
}
