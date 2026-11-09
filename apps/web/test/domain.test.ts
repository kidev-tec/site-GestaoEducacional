import { describe, it, expect } from 'vitest';
import { canTransition, stateLabel, formatBRL, humanError, TRANSITIONS } from '../src/lib/domain';

describe('transições (espelho do servidor p/ desabilitar botão)', () => {
  it('DRAFT só avança para PENDING_DOCUMENTS entre os "next" da UI', () => {
    expect(canTransition('DRAFT', 'PENDING_DOCUMENTS')).toBe(true);
    expect(canTransition('DRAFT', 'ACTIVE')).toBe(false);
    expect(canTransition('DRAFT', 'COMPLETED')).toBe(false);
  });

  it('estados terminais não transitam para nada', () => {
    for (const t of ['COMPLETED', 'CANCELED', 'REJECTED']) {
      expect(TRANSITIONS[t]).toEqual([]);
      expect(canTransition(t, 'DRAFT')).toBe(false);
    }
  });

  it('estado desconhecido → sem transição possível', () => {
    expect(canTransition('HACKED', 'ACTIVE')).toBe(false);
  });

  it('labels humanos para estados', () => {
    expect(stateLabel('DRAFT')).toBe('DRAFT');
    expect(stateLabel('ACTIVE')).toBe('Ativa');
    expect(stateLabel('COMPLETED')).toBe('Concluída');
    expect(stateLabel('QUALQUER')).toBe('QUALQUER');
  });
});

describe('formatBRL (centavos inteiros → R$ pt-BR)', () => {
  it('converte centavos', () => {
    expect(formatBRL(1050)).toContain('10,50');
    expect(formatBRL(0)).toContain('0,00');
    expect(formatBRL(-250)).toContain('2,50');
    expect(formatBRL(-250)).toContain('-');
  });

  it('rejeita float — regra financeira do client (RF-014)', () => {
    expect(() => formatBRL(10.5)).toThrow(/inteiros/);
    expect(() => formatBRL(0.1 + 0.2)).toThrow(/inteiros/);
  });
});

describe('humanError (RF-016: mensagem humana por status)', () => {
  it('mapeia cada status de domínio', () => {
    expect(humanError(409, '')).toMatch(/idempotência/);
    expect(humanError(404, '')).toMatch(/não encontrado/);
    expect(humanError(422, '')).toMatch(/Transição/);
    expect(humanError(400, 'campo X inválido')).toBe('campo X inválido');
    expect(humanError(400, '')).toMatch(/Dados inválidos/);
    expect(humanError(401, '')).toMatch(/Tenant desconhecido/);
    expect(humanError(500, '')).toMatch(/Erro inesperado/);
  });
});
