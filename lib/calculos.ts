// Regras de cálculo da calculadora de preços especiais.
// Módulo puro: sem React, sem Supabase. Toda a interface usa estas funções.
// Margens são frações (0,27 = 27%). Limites das faixas e custo operacional
// chegam em pontos percentuais, como são configurados (23, 10, 15, 20).

export type Faixa = "vermelho" | "laranja" | "amarelo" | "verde";

export interface ParametrosCalculo {
  /** Custo operacional em % (padrão 23). */
  custoOperacional: number;
  /** Limite superior da faixa vermelha em % (margem mínima aceitável). */
  faixaVermelho: number;
  /** Limite superior da faixa laranja em %. */
  faixaLaranja: number;
  /** Limite superior da faixa amarela em %. */
  faixaAmarelo: number;
}

export const PARAMETROS_PADRAO: ParametrosCalculo = {
  custoOperacional: 23,
  faixaVermelho: 10,
  faixaLaranja: 15,
  faixaAmarelo: 20,
};

export const NOMES_FAIXA: Record<Faixa, string> = {
  vermelho: "Abaixo do mínimo",
  laranja: "Atenção",
  amarelo: "Aceitável",
  verde: "Boa",
};

export function fator(parametros: ParametrosCalculo): number {
  return 1 - parametros.custoOperacional / 100;
}

function positivo(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function naoNegativo(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function classificarMargem(
  margem: number,
  parametros: ParametrosCalculo,
): Faixa {
  if (margem < parametros.faixaVermelho / 100) return "vermelho";
  if (margem < parametros.faixaLaranja / 100) return "laranja";
  if (margem < parametros.faixaAmarelo / 100) return "amarelo";
  return "verde";
}

// 3.1 Análise do produto

export interface EntradaAnalise {
  quantidadeVendida: number | null;
  valorVendido: number | null;
  custoMetro: number | null;
}

export interface ResultadoAnalise {
  precoMedio: number;
  precoMedioLiquido: number;
  lucroLiquidoMetro: number;
  margem: number;
  lucroTotal: number;
  faixa: Faixa;
}

export function analisarProduto(
  entrada: EntradaAnalise,
  parametros: ParametrosCalculo,
): ResultadoAnalise | null {
  const { quantidadeVendida, valorVendido, custoMetro } = entrada;
  if (!positivo(quantidadeVendida) || !positivo(valorVendido) || !naoNegativo(custoMetro)) {
    return null;
  }
  const precoMedio = valorVendido / quantidadeVendida;
  const precoMedioLiquido = precoMedio * fator(parametros);
  const lucroLiquidoMetro = precoMedioLiquido - custoMetro;
  // A margem é sobre o preço médio bruto, não sobre o líquido.
  const margem = lucroLiquidoMetro / precoMedio;
  return {
    precoMedio,
    precoMedioLiquido,
    lucroLiquidoMetro,
    margem,
    lucroTotal: lucroLiquidoMetro * quantidadeVendida,
    faixa: classificarMargem(margem, parametros),
  };
}

// 3.2 Pisos de preço

/** Preço por metro necessário para a margem M (fração). null = inatingível. */
export function precoParaMargem(
  custoMetro: number,
  margem: number,
  parametros: ParametrosCalculo,
): number | null {
  const divisor = fator(parametros) - margem;
  if (divisor <= 0) return null;
  return custoMetro / divisor;
}

export interface Piso {
  /** Margem alvo em fração. */
  margem: number;
  preco: number | null;
}

export interface PisosDePreco {
  equilibrio: Piso;
  vermelho: Piso;
  laranja: Piso;
  amarelo: Piso;
}

export function pisosDePreco(
  custoMetro: number | null,
  parametros: ParametrosCalculo,
): PisosDePreco | null {
  if (!naoNegativo(custoMetro)) return null;
  const piso = (margem: number): Piso => ({
    margem,
    preco: precoParaMargem(custoMetro, margem, parametros),
  });
  return {
    equilibrio: piso(0),
    vermelho: piso(parametros.faixaVermelho / 100),
    laranja: piso(parametros.faixaLaranja / 100),
    amarelo: piso(parametros.faixaAmarelo / 100),
  };
}

// 3.3 Simulação de preço negociado

export interface EntradaSimulacao {
  metragem: number | null;
  valorMetro: number | null;
  estoque: number | null;
}

export interface ResultadoSimulacao {
  precoLiquido: number;
  lucroMetro: number;
  margem: number;
  faixa: Faixa;
  receita: number;
  lucroTotal: number;
  novaMargemMedia: number;
  saldoEstoque: number | null;
  excedeEstoque: boolean;
}

export function simularNegociacao(
  analise: EntradaAnalise,
  simulacao: EntradaSimulacao,
  parametros: ParametrosCalculo,
): ResultadoSimulacao | null {
  const base = analisarProduto(analise, parametros);
  const { metragem, valorMetro, estoque } = simulacao;
  if (!base || !positivo(metragem) || !positivo(valorMetro)) return null;
  const custoMetro = analise.custoMetro as number;
  const valorVendido = analise.valorVendido as number;

  const precoLiquido = valorMetro * fator(parametros);
  const lucroMetro = precoLiquido - custoMetro;
  const margem = lucroMetro / valorMetro;
  const receita = metragem * valorMetro;
  const lucroTotal = lucroMetro * metragem;
  const novaMargemMedia = (base.lucroTotal + lucroTotal) / (valorVendido + receita);
  const temEstoque = naoNegativo(estoque);

  return {
    precoLiquido,
    lucroMetro,
    margem,
    faixa: classificarMargem(margem, parametros),
    receita,
    lucroTotal,
    novaMargemMedia,
    saldoEstoque: temEstoque ? estoque - metragem : null,
    excedeEstoque: temEstoque && metragem > estoque,
  };
}

// Configurações

export type ErrosParametros = Partial<Record<keyof ParametrosCalculo, string>>;

export function validarParametros(p: ParametrosCalculo): ErrosParametros {
  const erros: ErrosParametros = {};
  if (!Number.isFinite(p.custoOperacional) || p.custoOperacional < 0 || p.custoOperacional >= 100) {
    erros.custoOperacional = "Informe um percentual entre 0 e 99,9.";
  }
  const maxima = 100 - p.custoOperacional;
  const campos = ["faixaVermelho", "faixaLaranja", "faixaAmarelo"] as const;
  for (const campo of campos) {
    if (!Number.isFinite(p[campo])) erros[campo] = "Informe um percentual.";
  }
  if (!erros.faixaLaranja && !erros.faixaVermelho && p.faixaLaranja <= p.faixaVermelho) {
    erros.faixaLaranja = "Precisa ser maior que o limite do vermelho.";
  }
  if (!erros.faixaAmarelo && !erros.faixaLaranja && p.faixaAmarelo <= p.faixaLaranja) {
    erros.faixaAmarelo = "Precisa ser maior que o limite do laranja.";
  }
  if (!erros.custoOperacional) {
    for (const campo of campos) {
      if (!erros[campo] && p[campo] >= maxima) {
        erros[campo] = `Precisa ser menor que a margem máxima possível (${formatarPercentualSimples(maxima)}%).`;
      }
    }
  }
  return erros;
}

function formatarPercentualSimples(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
