"use client";

import { Dialogo } from "./Dialogo";
import { IconeWhatsApp } from "./IconeWhatsApp";
import { botao } from "./estilos";
import { formatarTelefone, mensagemWhatsApp } from "@/lib/formatacao";
import { linkWhatsAppTexto } from "@/lib/solicitacoes";

interface Props {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  nome: string;
  numero: string;
  codigoProduto: string;
  precoMetro: number;
  /** Texto da mensagem; por padrão, o preço aprovado no formato padrão. */
  mensagem?: string;
  /** Chamado no clique de Enviar, depois que o link já foi aberto. */
  aoEnviar: () => void;
}

export function DialogoWhatsApp({ aberto, aoMudarAberto, nome, numero, codigoProduto, precoMetro, mensagem: texto, aoEnviar }: Props) {
  const mensagem = texto ?? mensagemWhatsApp(codigoProduto, precoMetro);
  return (
    <Dialogo
      aberto={aberto}
      aoMudarAberto={aoMudarAberto}
      titulo={`Enviar para ${nome} no WhatsApp?`}
      descricao={<>A mensagem vai para {formatarTelefone(numero)}.</>}
    >
      <p className="mt-4 rounded-lg border border-trama bg-fundo px-4 py-3 whitespace-pre-line text-grafite">{mensagem}</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className={botao.secundario} onClick={() => aoMudarAberto(false)}>
          Agora não
        </button>
        {/* Link direto: abre no próprio clique, sem await, para o Safari não bloquear. */}
        <a
          href={linkWhatsAppTexto(numero, mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className={botao.principal}
          onClick={() => {
            aoMudarAberto(false);
            aoEnviar();
          }}
        >
          <IconeWhatsApp />
          Enviar
        </a>
      </div>
    </Dialogo>
  );
}
