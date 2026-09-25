import { NOMES_FAIXA, type Faixa } from "@/lib/calculos";
import { corFaixa } from "./estilos";

export function SeloFaixa({ faixa }: { faixa: Faixa }) {
  const cor = corFaixa[faixa];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${cor.fundo} ${cor.texto}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${cor.ponto}`} />
      {NOMES_FAIXA[faixa]}
    </span>
  );
}
