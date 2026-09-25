"use client";

import Link from "next/link";
import { useState } from "react";
import { DialogoWhatsApp } from "@/components/DialogoWhatsApp";
import { IconeWhatsApp } from "@/components/IconeWhatsApp";
import { LinhaValor } from "@/components/LinhaValor";
import { botao } from "@/components/estilos";
import { marcarSolicitacaoWhatsApp, type Solicitacao } from "@/lib/dados";
import { formatarDataHora, formatarMetragem, formatarMoeda } from "@/lib/formatacao";
import { NOMES_STATUS, mensagemResposta } from "@/lib/solicitacoes";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

/** Solicitação já respondida: mostra a resposta e permite reenviar pelo WhatsApp. */
export function RespostaEnviada({
  solicitacao: inicial,
  whatsappSolicitante,
}: {
  solicitacao: Solicitacao;
  whatsappSolicitante: string | null;
}) {
  const [s, setS] = useState(inicial);
  const [dialogo, setDialogo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const tipo = s.status === "aprovada" ? "aprovada" : "contraproposta";

  async function registrar() {
    try {
      const quando = await marcarSolicitacaoWhatsApp(criarClienteNavegador(), s.id);
      setS({ ...s, whatsapp_enviado_em: quando });
      setErro(null);
    } catch {
      setErro("O WhatsApp foi aberto, mas a data de envio não foi registrada.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-xl border border-trama bg-superficie p-5 lg:p-7">
        <h2 className="text-lg font-semibold">{NOMES_STATUS[s.status]}</h2>
        <p className="text-linha">Respondida em {formatarDataHora(s.respondido_em!)}.</p>
        <p className="numeros mt-3 text-[2.5rem] leading-tight font-medium text-grafite">{formatarMoeda(s.preco_resposta)}/m</p>
        {s.observacao && <p className="mt-2 whitespace-pre-line text-grafite">{s.observacao}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {whatsappSolicitante && (
            <button type="button" className={botao.secundario} onClick={() => setDialogo(true)}>
              <IconeWhatsApp />
              {s.whatsapp_enviado_em ? "Enviar de novo" : "Enviar no WhatsApp"}
            </button>
          )}
          {s.status === "aprovada" && (
            <Link href="/historico" className={botao.texto}>
              Ver no histórico
            </Link>
          )}
        </div>
        <p className="mt-3 text-sm text-linha">
          {s.whatsapp_enviado_em
            ? `Enviado por WhatsApp em ${formatarDataHora(s.whatsapp_enviado_em)}.`
            : "Ainda não enviado por WhatsApp."}
        </p>
        {erro && (
          <p role="alert" className="mt-2 text-vermelho">
            {erro}
          </p>
        )}
      </section>
      <section className="rounded-xl border border-trama bg-superficie p-5 lg:p-7">
        <h2 className="text-lg font-semibold">Dados enviados</h2>
        <dl className="mt-2">
          <LinhaValor rotulo="Estoque">{formatarMetragem(s.estoque)}</LinhaValor>
          <LinhaValor rotulo="Quantidade vendida">{formatarMetragem(s.quantidade_vendida)}</LinhaValor>
          <LinhaValor rotulo="Valor vendido">{formatarMoeda(s.valor_vendido)}</LinhaValor>
          <LinhaValor rotulo="Metragem negociada">{formatarMetragem(s.metragem)}</LinhaValor>
          <LinhaValor rotulo="Valor solicitado">
            {s.valor_solicitado === null ? "Sem valor" : `${formatarMoeda(s.valor_solicitado)}/m`}
          </LinhaValor>
        </dl>
      </section>
      {whatsappSolicitante && (
        <DialogoWhatsApp
          aberto={dialogo}
          aoMudarAberto={setDialogo}
          nome={s.solicitante_nome}
          numero={whatsappSolicitante}
          codigoProduto={s.codigo_produto}
          precoMetro={s.preco_resposta!}
          mensagem={mensagemResposta(tipo, s.codigo_produto, s.preco_resposta!, s.observacao)}
          aoEnviar={() => void registrar()}
        />
      )}
    </div>
  );
}
