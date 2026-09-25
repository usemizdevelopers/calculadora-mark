// Regras puras das respostas às solicitações de preço.
import { formatarDuasCasas } from "./formatacao";

export type StatusSolicitacao = "pendente" | "aprovada" | "contraproposta";
export type TipoResposta = "aprovada" | "contraproposta";

export const NOMES_STATUS: Record<StatusSolicitacao, string> = {
  pendente: "Aguardando avaliação",
  aprovada: "Aprovada",
  contraproposta: "Contraproposta",
};

function centavos(n: number): number {
  return Math.round(n * 100);
}

/**
 * Sem valor solicitado, o preço definido pelo avaliador é uma aprovação.
 * Com valor solicitado, qualquer preço diferente é contraproposta.
 */
export function tipoResposta(valorSolicitado: number | null, valorDefinido: number): TipoResposta {
  if (valorSolicitado === null) return "aprovada";
  return centavos(valorSolicitado) === centavos(valorDefinido) ? "aprovada" : "contraproposta";
}

/** Mensagem de WhatsApp para quem pediu o preço. */
export function mensagemResposta(
  tipo: TipoResposta,
  codigoProduto: string,
  preco: number,
  observacao?: string | null,
): string {
  const linhas =
    tipo === "aprovada"
      ? [`Segue preço que conseguimos realizar no produto de código ${codigoProduto}`, `Preço: R$ ${formatarDuasCasas(preco)}/m`]
      : [`Contraproposta para o produto de código ${codigoProduto}`, `Preço: R$ ${formatarDuasCasas(preco)}/m`];
  const obs = observacao?.trim();
  if (obs) linhas.push(obs);
  return linhas.join("\n");
}

export function linkWhatsAppTexto(numero: string, texto: string): string {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}
