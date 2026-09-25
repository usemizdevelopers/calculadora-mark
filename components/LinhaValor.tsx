import type { ReactNode } from "react";

/** Linha de lista de resultados: rótulo à esquerda, valor à direita. */
export function LinhaValor({ rotulo, children, destaque = false }: { rotulo: ReactNode; children: ReactNode; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-trama py-3 last:border-b-0">
      <dt className="text-linha">{rotulo}</dt>
      <dd className={`numeros text-right ${destaque ? "font-semibold text-grafite" : "text-grafite"}`}>{children}</dd>
    </div>
  );
}
