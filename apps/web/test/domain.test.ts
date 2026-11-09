import { describe, it, expect } from 'vitest';
import { canTransition, stateLabel, formatBRL, humanError, parseReaisToCents, TRANSITIONS } from '../src/lib/domain';

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

describe('parseReaisToCents (RF-014 estrito — finding HIGH review G6a)', () => {
  it('converte formatos válidos', () => {
    expect(parseReaisToCents('150,00')).toBe(15000);
    expect(parseReaisToCents('0,01')).toBe(1);
    expect(parseReaisToCents('10,5')).toBe(1050);
    expect(parseReaisToCents('1000')).toBe(100000);
    expect(parseReaisToCents(' 1.999,99'.replace('.', ''))).toBe(199999); // sem separador de milhar sujo
  });

  it('RECUSA centavos fracionários sem arredondar', () => {
    expect(parseReaisToCents('0,001')).toBeNull(); // arredondaria p/ 0
    expect(parseReaisToCents('1,999')).toBeNull(); // arredondaria p/ 200
  });

  it('RECUSA negativos, sinais, vazio, lixo e zero', () => {
    expect(parseReaisToCents('-2,50')).toBeNull();
    expect(parseReaisToCents('+3')).toBeNull();
    expect(parseReaisToCents('')).toBeNull();
    expect(parseReaisToCents('abc')).toBeNull();
    expect(parseReaisToCents('1e5')).toBeNull();
    expect(parseReaisToCents('0,00')).toBeNull();
    expect(parseReaisToCents('0')).toBeNull();
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
