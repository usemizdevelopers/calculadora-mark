import { describe, expect, it } from "vitest";
import {
  PARAMETROS_PADRAO as P,
  analisarProduto,
  classificarMargem,
  fator,
  pisosDePreco,
  precoParaMargem,
  simularNegociacao,
  validarParametros,
} from "./calculos";
import { formatarMoeda, formatarPercentual } from "./formatacao";

const analise = { quantidadeVendida: 200, valorVendido: 10000, custoMetro: 25 };
const estoque = 500;

describe("fator", () => {
  it("usa 1 − custo operacional", () => {
    expect(fator(P)).toBeCloseTo(0.77, 12);
  });
});

describe("análise do produto (3.6)", () => {
  const r = analisarProduto(analise, P)!;

  it("calcula preços e lucro", () => {
    expect(r.precoMedio).toBeCloseTo(50, 10);
    expect(r.precoMedioLiquido).toBeCloseTo(38.5, 10);
    expect(r.lucroLiquidoMetro).toBeCloseTo(13.5, 10);
    expect(r.lucroTotal).toBeCloseTo(2700, 8);
  });

  it("divide a margem pelo preço médio bruto", () => {
    expect(r.margem).toBeCloseTo(0.27, 12);
    expect(formatarPercentual(r.margem)).toBe("27,0%");
    expect(r.faixa).toBe("verde");
  });

  it("exibe no formato brasileiro", () => {
    expect(formatarMoeda(r.precoMedio)).toBe("R$ 50,00");
    expect(formatarMoeda(r.lucroTotal)).toBe("R$ 2.700,00");
  });
});

describe("pisos de preço (3.6)", () => {
  const pisos = pisosDePreco(25, P)!;

  it("calcula equilíbrio e mínimos por faixa", () => {
    expect(formatarMoeda(pisos.equilibrio.preco)).toBe("R$ 32,47");
    expect(formatarMoeda(pisos.vermelho.preco)).toBe("R$ 37,31");
    expect(formatarMoeda(pisos.laranja.preco)).toBe("R$ 40,32");
    expect(formatarMoeda(pisos.amarelo.preco)).toBe("R$ 43,86");
  });

  it("retorna inatingível quando fator − M ≤ 0", () => {
    expect(precoParaMargem(25, 0.77, P)).toBeNull();
    expect(precoParaMargem(25, 0.9, P)).toBeNull();
    expect(formatarMoeda(precoParaMargem(25, 0.8, P))).toBe("—");
  });

  it("o preço mínimo realmente atinge a margem pedida", () => {
    const preco = precoParaMargem(25, 0.15, P)!;
    const sim = simularNegociacao(analise, { metragem: 1, valorMetro: preco, estoque }, P)!;
    expect(sim.margem).toBeCloseTo(0.15, 12);
  });
});

describe("simulação A: 150 m a R$ 42,00", () => {
  const s = simularNegociacao(analise, { metragem: 150, valorMetro: 42, estoque }, P)!;

  it("calcula margem da negociação", () => {
    expect(s.lucroMetro).toBeCloseTo(7.34, 10);
    expect(s.margem).toBeCloseTo(0.174762, 6);
    expect((s.margem * 100).toFixed(2)).toBe("17.48");
    expect(s.faixa).toBe("amarelo");
  });

  it("calcula receita, lucro, nova margem média e saldo", () => {
    expect(s.receita).toBeCloseTo(6300, 8);
    expect(s.lucroTotal).toBeCloseTo(1101, 8);
    expect((s.novaMargemMedia * 100).toFixed(2)).toBe("23.32");
    expect(s.saldoEstoque).toBe(350);
    expect(s.excedeEstoque).toBe(false);
  });
});

describe("simulações B, C e D", () => {
  it("B: 150 m a R$ 35,00 → 5,57% vermelho", () => {
    const s = simularNegociacao(analise, { metragem: 150, valorMetro: 35, estoque }, P)!;
    expect((s.margem * 100).toFixed(2)).toBe("5.57");
    expect(s.faixa).toBe("vermelho");
  });

  it("C: 150 m a R$ 30,00 → prejuízo de −6,33%", () => {
    const s = simularNegociacao(analise, { metragem: 150, valorMetro: 30, estoque }, P)!;
    expect(s.lucroMetro).toBeCloseTo(-1.9, 10);
    expect((s.margem * 100).toFixed(2)).toBe("-6.33");
    expect(s.faixa).toBe("vermelho");
    expect(formatarMoeda(s.lucroMetro)).toBe("-R$ 1,90");
  });

  it("D: 600 m a R$ 45,00 → excede o estoque", () => {
    const s = simularNegociacao(analise, { metragem: 600, valorMetro: 45, estoque }, P)!;
    expect(s.excedeEstoque).toBe(true);
    expect(s.saldoEstoque).toBe(-100);
  });

  it("a margem da negociação não depende da metragem", () => {
    const a = simularNegociacao(analise, { metragem: 10, valorMetro: 42, estoque }, P)!;
    const b = simularNegociacao(analise, { metragem: 400, valorMetro: 42, estoque }, P)!;
    expect(a.margem).toBe(b.margem);
    expect(a.novaMargemMedia).not.toBe(b.novaMargemMedia);
  });
});

describe("faixas de cor", () => {
  it("margem exatamente em 10% cai em laranja", () => {
    expect(classificarMargem(0.1, P)).toBe("laranja");
  });

  it("respeita todos os limites", () => {
    expect(classificarMargem(0.0999999, P)).toBe("vermelho");
    expect(classificarMargem(0.15, P)).toBe("amarelo");
    expect(classificarMargem(0.1999999, P)).toBe("amarelo");
    expect(classificarMargem(0.2, P)).toBe("verde");
    expect(classificarMargem(-0.5, P)).toBe("vermelho");
  });
});

describe("validações", () => {
  it("sem entradas válidas não há resultado", () => {
    expect(analisarProduto({ quantidadeVendida: 0, valorVendido: 100, custoMetro: 1 }, P)).toBeNull();
    expect(analisarProduto({ quantidadeVendida: 10, valorVendido: 0, custoMetro: 1 }, P)).toBeNull();
    expect(analisarProduto({ quantidadeVendida: 10, valorVendido: 100, custoMetro: -1 }, P)).toBeNull();
    expect(analisarProduto({ quantidadeVendida: null, valorVendido: 100, custoMetro: 1 }, P)).toBeNull();
    expect(simularNegociacao(analise, { metragem: 0, valorMetro: 42, estoque }, P)).toBeNull();
    expect(simularNegociacao(analise, { metragem: 10, valorMetro: 0, estoque }, P)).toBeNull();
    expect(pisosDePreco(null, P)).toBeNull();
  });

  it("custo zero é aceito", () => {
    const r = analisarProduto({ quantidadeVendida: 10, valorVendido: 100, custoMetro: 0 }, P)!;
    expect(r.margem).toBeCloseTo(0.77, 12);
  });

  it("valida configurações", () => {
    expect(validarParametros(P)).toEqual({});
    expect(validarParametros({ ...P, faixaLaranja: 10 }).faixaLaranja).toBeDefined();
    expect(validarParametros({ ...P, faixaAmarelo: 14 }).faixaAmarelo).toBeDefined();
    expect(validarParametros({ ...P, custoOperacional: 85 }).faixaAmarelo).toBeDefined();
    expect(validarParametros({ ...P, custoOperacional: 100 }).custoOperacional).toBeDefined();
  });
});
