"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { AvisoNotificacoes } from "@/components/AvisoNotificacoes";
import { CampoNumero, CampoTexto } from "@/components/Campo";
import { LinhaValor } from "@/components/LinhaValor";
import { avisarContadores } from "@/components/Navegacao";
import { botao } from "@/components/estilos";
import { criarSolicitacao, descreverErro, type Solicitacao } from "@/lib/dados";
import { formatarMetragem, formatarMoeda, lerNumero } from "@/lib/formatacao";
import { notificar } from "@/lib/push";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

type Erros = Partial<Record<"codigo" | "estoque" | "quantidade" | "valorVendido" | "metragem" | "valorSolicitado", string>>;

export function NovaSolicitacao() {
  const [codigo, setCodigo] = useState("");
  const [estoque, setEstoque] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [valorVendido, setValorVendido] = useState("");
  const [metragem, setMetragem] = useState("");
  const [valorSolicitado, setValorSolicitado] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviada, setEnviada] = useState<Solicitacao | null>(null);
  const refCodigo = useRef<HTMLInputElement>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroEnvio(null);
    const n = {
      estoque: lerNumero(estoque),
      quantidade: lerNumero(quantidade),
      valorVendido: lerNumero(valorVendido),
      metragem: lerNumero(metragem),
      valorSolicitado: lerNumero(valorSolicitado),
    };
    const novos: Erros = {};
    if (!codigo.trim()) novos.codigo = "Informe o código do produto.";
    if (n.estoque === null || n.estoque < 0) novos.estoque = "Informe o estoque.";
    if (n.quantidade === null || n.quantidade <= 0) novos.quantidade = "Informe um valor maior que zero.";
    if (n.valorVendido === null || n.valorVendido <= 0) novos.valorVendido = "Informe um valor maior que zero.";
    if (n.metragem === null || n.metragem <= 0) novos.metragem = "Informe um valor maior que zero.";
    if (valorSolicitado && (n.valorSolicitado === null || n.valorSolicitado <= 0)) {
      novos.valorSolicitado = "Informe um valor maior que zero ou deixe em branco.";
    }
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      const primeiro = document.querySelector<HTMLInputElement>("[aria-invalid=true]");
      primeiro?.focus();
      return;
    }

    setEnviando(true);
    try {
      const s = await criarSolicitacao(criarClienteNavegador(), {
        codigo_produto: codigo.trim(),
        estoque: n.estoque!,
        quantidade_vendida: n.quantidade!,
        valor_vendido: n.valorVendido!,
        metragem: n.metragem!,
        valor_solicitado: n.valorSolicitado && n.valorSolicitado > 0 ? n.valorSolicitado : null,
      });
      notificar(s.id, "nova");
      avisarContadores();
      setEnviada(s);
      window.scrollTo({ top: 0 });
    } catch (erro) {
      setErroEnvio(descreverErro(erro, "A solicitação não foi enviada."));
    } finally {
      setEnviando(false);
    }
  }

  function nova() {
    setCodigo("");
    setEstoque("");
    setQuantidade("");
    setValorVendido("");
    setMetragem("");
    setValorSolicitado("");
    setErros({});
    setEnviada(null);
    requestAnimationFrame(() => refCodigo.current?.focus());
  }

  if (enviada) {
    return (
      <div className="max-w-xl">
        <div role="status">
          <h1 className="text-2xl font-semibold">Solicitação enviada</h1>
          <p className="mt-1 text-linha">Você recebe a resposta em Minhas solicitações.</p>
        </div>
        <dl className="mt-6 rounded-xl border border-trama bg-superficie px-5 py-2">
          <LinhaValor rotulo="Produto">{enviada.codigo_produto}</LinhaValor>
          <LinhaValor rotulo="Metragem negociada">{formatarMetragem(enviada.metragem)}</LinhaValor>
          <LinhaValor rotulo="Valor solicitado">
            {enviada.valor_solicitado === null ? "Sem valor" : `${formatarMoeda(enviada.valor_solicitado)}/m`}
          </LinhaValor>
        </dl>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={nova} className={`${botao.principal} sm:flex-1`}>
            Nova solicitação
          </button>
          <Link href="/minhas-solicitacoes" className={`${botao.secundario} sm:flex-1`}>
            Ver minhas solicitações
          </Link>
        </div>
        <AvisoNotificacoes texto="Ative para receber um aviso neste aparelho quando a resposta chegar." />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Nova solicitação</h1>
      <p className="mt-1 text-linha">Peça a avaliação de um preço especial.</p>

      <form onSubmit={enviar} noValidate className="mt-6 rounded-xl border border-trama bg-superficie p-5 lg:p-7">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <CampoTexto
            ref={refCodigo}
            rotulo="Código do produto"
            valor={codigo}
            aoMudar={setCodigo}
            erro={erros.codigo}
            autoComplete="off"
            autoCapitalize="characters"
            className="col-span-2"
          />
          <CampoNumero
            tipo="metragem"
            rotulo="Estoque"
            valor={estoque}
            aoMudar={setEstoque}
            erro={erros.estoque}
            className="col-span-2 min-[400px]:col-span-1"
          />
          <CampoNumero
            tipo="metragem"
            rotulo="Quantidade vendida"
            valor={quantidade}
            aoMudar={setQuantidade}
            erro={erros.quantidade}
            className="col-span-2 min-[400px]:col-span-1"
          />
          <CampoNumero
            tipo="moeda"
            rotulo="Valor vendido"
            valor={valorVendido}
            aoMudar={setValorVendido}
            erro={erros.valorVendido}
            className="col-span-2"
          />
          <CampoNumero
            tipo="metragem"
            rotulo="Metragem negociada"
            valor={metragem}
            aoMudar={setMetragem}
            erro={erros.metragem}
            className="col-span-2 min-[400px]:col-span-1"
          />
          <CampoNumero
            tipo="moeda"
            rotulo="Valor solicitado"
            valor={valorSolicitado}
            aoMudar={setValorSolicitado}
            erro={erros.valorSolicitado}
            ajuda="Por metro. Opcional."
            className="col-span-2 min-[400px]:col-span-1"
          />
        </div>
        {erroEnvio && (
          <p role="alert" className="mt-5 text-vermelho">
            {erroEnvio}
          </p>
        )}
        <button type="submit" disabled={enviando} className={`${botao.principal} mt-7 w-full`}>
          {enviando ? "Enviando…" : "Enviar solicitação"}
        </button>
      </form>
    </div>
  );
}
