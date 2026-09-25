"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

interface PropsDialogo {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
  /** Largura máxima no desktop. */
  largura?: "estreita" | "larga";
  /** Impede fechar clicando fora (ex.: durante um salvamento). */
  bloquearFora?: boolean;
}

/** Folha que sobe da base no celular; janela centralizada a partir de 640px. */
export function Dialogo({
  aberto,
  aoMudarAberto,
  titulo,
  descricao,
  children,
  largura = "estreita",
  bloquearFora = false,
}: PropsDialogo) {
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudarAberto}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialogo-veu fixed inset-0 z-40 bg-grafite/40" />
        <Dialog.Content
          onPointerDownOutside={bloquearFora ? (e) => e.preventDefault() : undefined}
          className={`dialogo-conteudo fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-superficie px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(31,36,48,0.16)] outline-none sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-2.5rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-7 sm:shadow-[0_16px_48px_rgba(31,36,48,0.2)] ${
            largura === "larga" ? "sm:max-w-2xl" : "sm:max-w-md"
          }`}
        >
          <div aria-hidden className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-trama sm:hidden" />
          <Dialog.Title className="text-xl font-semibold text-grafite">{titulo}</Dialog.Title>
          {descricao ? (
            <Dialog.Description className="mt-2 text-linha">{descricao}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const FecharDialogo = Dialog.Close;
