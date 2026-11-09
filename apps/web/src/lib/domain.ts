/** Utilitários de domínio do client web (RF-013/014). */

/** Transições válidas por estado — espelha o servidor; botões inválidos ficam desabilitados. */
export const TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['PENDING_DOCUMENTS', 'CANCELED', 'REJECTED'],
  PENDING_DOCUMENTS: ['PENDING_APPROVAL', 'CANCELED'],
  PENDING_APPROVAL: ['ACTIVE', 'CANCELED', 'REJECTED'],
  ACTIVE: ['COMPLETED', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
  REJECTED: [],
};

export function canTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

const LABELS: Record<string, string> = {
  PENDING_DOCUMENTS: 'Pend. documentos',
  PENDING_APPROVAL: 'Pend. aprovação',
  ACTIVE: 'Ativa',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
  REJECTED: 'Rejeitada',
};

export function stateLabel(state: string): string {
  return LABELS[state] ?? state;
}

/** Centavos inteiros → R$ pt-BR. Nunca float na conta (formata o inteiro). */
export function formatBRL(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error('saldo deve ser centavos inteiros');
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  return formatter.format(cents / 100);
}

/**
 * Converte valor em R$ digitado para centavos inteiros (RF-014).
 * Estrito: no máximo 2 casas decimais; qualquer outro formato é RECUSADO
 * (nunca arredonda silenciosamente — finding HIGH do review G6a).
 * Retorna null quando inválido.
 */
export function parseReaisToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{1,13}(,\d{1,2})?$/.test(trimmed)) return null;
  const [reais, cents = ''] = trimmed.split(',');
  const centsPadded = (cents + '00').slice(0, 2);
  const value = Number(reais) * 100 + Number(centsPadded);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** Mensagem humana para erros da API (RF-016). */
export function humanError(status: number, fallback: string): string {
  if (status === 409) return 'Esta chave de idempotência já foi usada com dados diferentes. Gere uma nova solicitação.';
  if (status === 404) return 'Registro não encontrado (ou pertence a outro tenant).';
  if (status === 422) return 'Transição de estado inválida para esta matrícula.';
  if (status === 400) return fallback || 'Dados inválidos na solicitação.';
  if (status === 401) return 'Tenant desconhecido. Selecione um tenant válido.';
  return 'Erro inesperado. Tente novamente.';
}

export const TENANTS = ['A', 'B'] as const;
export const TENANT_STORAGE_KEY = 'erp-tenant';
