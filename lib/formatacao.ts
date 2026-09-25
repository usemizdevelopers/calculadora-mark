// Formatação e leitura de números no padrão brasileiro.
// Nada aqui arredonda para cálculo: o arredondamento é só de exibição.

export const TRACO = "—";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentual = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const metragem = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const duasCasas = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function valido(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** R$ 1.234,56 (com espaço normal entre R$ e o número). */
export function formatarMoeda(n: number | null | undefined): string {
  if (!valido(n)) return TRACO;
  return moeda.format(n).replace(/ /g, " ");
}

/** Recebe fração (0,175) e exibe 17,5%. */
export function formatarPercentual(fracao: number | null | undefined): string {
  if (!valido(fracao)) return TRACO;
  return `${percentual.format(fracao * 100)}%`;
}

/** 12,5 m */
export function formatarMetragem(n: number | null | undefined): string {
  if (!valido(n)) return TRACO;
  return `${metragem.format(n)} m`;
}

/** 1.234,56 sem símbolo de moeda. */
export function formatarDuasCasas(n: number): string {
  return duasCasas.format(n);
}

/**
 * Lê um número digitado no padrão brasileiro: "1.234,56", "12,5", "42".
 * Retorna null para texto vazio ou inválido.
 */
export function lerNumero(texto: string): number | null {
  const limpo = texto.replace(/[R$\s ]/g, "");
  if (limpo === "") return null;
  if (!/^-?[\d.]*(,\d*)?$/.test(limpo)) return null;
  const normalizado = limpo.replace(/\./g, "").replace(",", ".");
  if (normalizado === "" || normalizado === "-" || normalizado === ".") return null;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/**
 * Máscara de moeda: os dígitos entram pela direita (4200 → 42,00).
 * Retorna o texto exibido no campo, sem "R$".
 */
export function mascararMoeda(texto: string): string {
  const digitos = texto.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digitos === "") return "";
  return duasCasas.format(Number(digitos) / 100);
}

/**
 * Máscara de metragem e percentual: aceita dígitos e uma vírgula,
 * com até `casas` casas decimais. Ponto digitado vira vírgula.
 */
export function mascararDecimal(texto: string, casas = 2): string {
  let t = texto.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const primeira = t.indexOf(",");
  if (primeira !== -1) {
    const inteiro = t.slice(0, primeira);
    const decimal = t.slice(primeira + 1).replace(/,/g, "").slice(0, casas);
    t = `${inteiro || "0"},${decimal}`;
  }
  return t;
}

/** Texto inicial de um campo decimal a partir de um número. */
export function numeroParaCampo(n: number | null | undefined): string {
  if (!valido(n)) return "";
  return String(n).replace(".", ",");
}

/** Só os dígitos de um telefone. */
export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** 5531984837807 → +55 31 98483-7807 */
export function formatarTelefone(digitos: string): string {
  const d = apenasDigitos(digitos);
  const m = d.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
  if (!m) return d ? `+${d}` : "";
  return `+${m[1]} ${m[2]} ${m[3]}-${m[4]}`;
}

export function mensagemWhatsApp(codigoProduto: string, precoMetro: number): string {
  const preco = precoMetro.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Segue preço que conseguimos realizar no produto de código ${codigoProduto}\nPreço: R$ ${preco}/m`;
}

export function linkWhatsApp(numero: string, codigoProduto: string, precoMetro: number): string {
  const texto = encodeURIComponent(mensagemWhatsApp(codigoProduto, precoMetro));
  return `https://wa.me/${apenasDigitos(numero)}?text=${texto}`;
}

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const data = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso)).replace(",", " às");
}

export function formatarData(iso: string): string {
  return data.format(new Date(iso));
}
