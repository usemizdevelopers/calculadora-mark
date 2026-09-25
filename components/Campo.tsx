"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { mascararDecimal, mascararMoeda } from "@/lib/formatacao";

interface PropsBase {
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string | null;
  prefixo?: string;
  sufixo?: string;
  className?: string;
}

type PropsInput = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "prefix">;

interface PropsCampoTexto extends PropsBase, PropsInput {
  valor: string;
  aoMudar: (valor: string) => void;
}

/** Campo com rótulo associado, prefixo/sufixo opcionais e mensagem de erro. */
export const CampoTexto = forwardRef<HTMLInputElement, PropsCampoTexto>(function CampoTexto(
  { rotulo, ajuda, erro, prefixo, sufixo, className = "", valor, aoMudar, id, ...resto },
  ref,
) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idAjuda = `${idCampo}-ajuda`;
  const idErro = `${idCampo}-erro`;
  const descritores = [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <label htmlFor={idCampo} className="mb-1.5 block text-[0.9375rem] font-medium text-grafite">
        {rotulo}
      </label>
      <div
        className={`flex min-h-12 items-center rounded-lg border bg-superficie transition-colors focus-within:border-indigo focus-within:ring-1 focus-within:ring-indigo ${
          erro ? "border-vermelho" : "border-trama hover:border-linha"
        } ${resto.readOnly || resto.disabled ? "bg-fundo" : ""}`}
      >
        {prefixo && <span className="pl-3.5 text-linha select-none" aria-hidden>{prefixo}</span>}
        <input
          ref={ref}
          id={idCampo}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores || undefined}
          className="numeros h-12 w-full min-w-0 bg-transparent px-3.5 text-grafite outline-none read-only:text-linha"
          {...resto}
        />
        {sufixo && <span className="pr-3.5 text-linha select-none" aria-hidden>{sufixo}</span>}
      </div>
      {ajuda && !erro && (
        <p id={idAjuda} className="mt-1.5 text-sm text-linha">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="mt-1.5 text-sm text-vermelho">
          {erro}
        </p>
      )}
    </div>
  );
});

interface PropsCampoNumero extends Omit<PropsCampoTexto, "prefixo" | "sufixo"> {
  tipo: "moeda" | "metragem" | "percentual";
}

/** Campo numérico com máscara brasileira e teclado decimal no celular. */
export const CampoNumero = forwardRef<HTMLInputElement, PropsCampoNumero>(function CampoNumero(
  { tipo, aoMudar, ...resto },
  ref,
) {
  const mascarar = tipo === "moeda" ? mascararMoeda : (t: string) => mascararDecimal(t, tipo === "percentual" ? 1 : 2);
  return (
    <CampoTexto
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      prefixo={tipo === "moeda" ? "R$" : undefined}
      sufixo={tipo === "metragem" ? "m" : tipo === "percentual" ? "%" : undefined}
      placeholder={tipo === "moeda" ? "0,00" : "0"}
      aoMudar={(v) => aoMudar(mascarar(v))}
      {...resto}
    />
  );
});
