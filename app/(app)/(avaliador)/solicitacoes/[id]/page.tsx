import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculadora } from "../../Calculadora";
import { RespostaEnviada } from "./RespostaEnviada";
import { carregarWhatsAppDoPerfil, obterSolicitacao } from "@/lib/dados";
import { formatarDataHora, formatarMoeda } from "@/lib/formatacao";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Avaliar solicitação | Preços especiais" };

export default async function PaginaSolicitacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await obterSessao();
  const solicitacao = /^[0-9a-f-]{36}$/i.test(id) ? await obterSolicitacao(supabase, id) : null;
  if (!solicitacao) notFound();
  const whatsapp = await carregarWhatsAppDoPerfil(supabase, solicitacao.solicitante_id);
  const nome = solicitacao.solicitante_nome || "Solicitante";

  return (
    <>
      <Link href="/solicitacoes" className="inline-flex min-h-12 items-center font-medium text-indigo underline-offset-4 hover:underline">
        Solicitações
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">
          {nome} pede preço para o produto {solicitacao.codigo_produto}
        </h1>
        <p className="numeros mt-1 text-linha">
          Recebida em {formatarDataHora(solicitacao.criado_em)}.{" "}
          {solicitacao.valor_solicitado === null
            ? "Sem valor solicitado."
            : `Valor solicitado: ${formatarMoeda(solicitacao.valor_solicitado)}/m.`}
        </p>
      </div>
      {solicitacao.status === "pendente" ? (
        <Calculadora solicitacao={solicitacao} whatsappSolicitante={whatsapp} />
      ) : (
        <RespostaEnviada solicitacao={solicitacao} whatsappSolicitante={whatsapp} />
      )}
    </>
  );
}
