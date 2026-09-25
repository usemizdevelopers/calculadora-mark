import type { Faixa } from "@/lib/calculos";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const botao = {
  principal: `${base} bg-indigo text-white hover:bg-indigo-escuro`,
  secundario: `${base} border border-trama bg-superficie text-grafite hover:border-linha`,
  texto: "inline-flex min-h-12 items-center rounded-md font-medium text-indigo underline-offset-4 hover:underline",
  perigo: `${base} bg-vermelho text-white hover:bg-[#912018]`,
};

export const corFaixa: Record<Faixa, { texto: string; fundo: string; ponto: string }> = {
  vermelho: { texto: "text-vermelho", fundo: "bg-vermelho-fundo", ponto: "bg-vermelho" },
  laranja: { texto: "text-laranja", fundo: "bg-laranja-fundo", ponto: "bg-laranja" },
  amarelo: { texto: "text-amarelo", fundo: "bg-amarelo-fundo", ponto: "bg-amarelo" },
  verde: { texto: "text-verde", fundo: "bg-verde-fundo", ponto: "bg-verde" },
};
