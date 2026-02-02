import { AsyncLocalStorage } from 'async_hooks';

/**
 * Armazenamento de contexto assíncrono para rastreamento de requisições.
 * Permite acessar o requestId e outros metadados em qualquer lugar da aplicação
 * sem precisar passar o objeto 'req' manualmente.
 * 
 * Isso é fundamental para logging contextual e Observabilidade (SRE).
 */
export interface RequestContext {
  requestId: string;
}

export const context = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  const store = context.getStore();
  return store?.requestId;
}
