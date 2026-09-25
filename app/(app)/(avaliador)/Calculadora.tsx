"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import { CampoNumero, CampoTexto } from "@/components/Campo";
import { useConfiguracoes } from "@/components/ConfiguracoesContexto";
import { Dialogo } from "@/components/Dialogo";
import { DialogoWhatsApp } from "@/components/DialogoWhatsApp";
import { IconeWhatsApp } from "@/components/IconeWhatsApp";
import { LinhaValor } from "@/components/LinhaValor";
import { avisarContadores } from "@/components/Navegacao";
import { usePerfil } from "@/components/PerfilContexto";
import { ReguaMargem } from "@/components/ReguaMargem";
import { SeloFaixa } from "@/components/SeloFaixa";
import { botao, corFaixa } from "@/components/estilos";
import {
  analisarProduto,
  pisosDePreco,
  simularNegociacao,
  type ParametrosCalculo,
  type ResultadoAnalise,
  type ResultadoSimulacao,
} from "@/lib/calculos";
import {
  descreverErro,
  inserirPrecoAprovado,
  marcarSolicitacaoWhatsApp,
  marcarWhatsAppEnviado,
  responderSolicitacao,
  type PrecoAprovado,
  type Solicitacao,
} from "@/lib/dados";
import {
  formatarDataHora,
  formatarMetragem,
  formatarMoeda,
  formatarPercentual,
  formatarDuasCasas,
  lerNumero,
  numeroParaCampo,
} from "@/lib/formatacao";
import { notificar } from "@/lib/push";
import { mensagemResposta, tipoResposta, type TipoResposta } from "@/lib/solicitacoes";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

type Etapa = "editando" | "salvando" | "erro" | "aprovado";

const ERRO_MAIOR_QUE_ZERO = "Informe um valor maior que zero.";

/** Erro de campo só depois que algo foi digitado. */
function erroPositivo(texto: string, valor: number | null) {
  if (texto === "") return null;
  return valor === null || valor <= 0 ? ERRO_MAIOR_QUE_ZERO : null;
}

function erroNaoNegativo(texto: string, valor: number | null) {
  if (texto === "") return null;
  return valor === null || valor < 0 ? "Informe um valor igual ou maior que zero." : null;
}

const classeBotaoFixo =
  "fixed inset-x-5 bottom-[calc(var(--altura-nav)+env(safe-area-inset-bottom)+0.75rem)] z-20 shadow-[0_4px_16px_rgba(46,58,140,0.28)] lg:static lg:inset-auto lg:shadow-none";

interface PropsCalculadora {
  /** Quando presente, a calculadora avalia esta solicitação e responde a quem pediu. */
  solicitacao?: Solicitacao;
  /** WhatsApp de quem pediu (só dígitos), para enviar a resposta. */
  whatsappSolicitante?: string | null;
}

const moedaParaCampo = (v: number | null | undefined) => (v ? formatarDuasCasas(v) : "");

export function Calculadora({ solicitacao, whatsappSolicitante = null }: PropsCalculadora = {}) {
  const { configuracoes } = useConfiguracoes();
  const perfil = usePerfil();
  const parametros: ParametrosCalculo = configuracoes;
  const s0 = solicitacao;

  // Análise
  const [codigo, setCodigo] = useState(s0?.codigo_produto ?? "");
  const [estoque, setEstoque] = useState(numeroParaCampo(s0?.estoque));
  const [quantidade, setQuantidade] = useState(numeroParaCampo(s0?.quantidade_vendida));
  const [valorVendido, setValorVendido] = useState(moedaParaCampo(s0?.valor_vendido));
  const [custo, setCusto] = useState("");

  // Simulação
  const [simulacaoAberta, setSimulacaoAberta] = useState(Boolean(s0));
  const [metragem, setMetragem] = useState(numeroParaCampo(s0?.metragem));
  const [valorMetro, setValorMetro] = useState(moedaParaCampo(s0?.valor_solicitado));
  const [calculado, setCalculado] = useState(Boolean(s0));

  // Resposta à solicitação
  const [observacao, setObservacao] = useState("");
  const [respondida, setRespondida] = useState<Solicitacao | null>(null);

  // Aprovação
  const [etapa, setEtapa] = useState<Etapa>("editando");
  const [confirmarVermelho, setConfirmarVermelho] = useState(false);
  const [registro, setRegistro] = useState<PrecoAprovado | null>(null);
  const [dialogoWhatsApp, setDialogoWhatsApp] = useState(false);
  const [erroWhatsApp, setErroWhatsApp] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [errosAprovacao, setErrosAprovacao] = useState<{ codigo?: string; estoque?: string }>({});

  const refCodigo = useRef<HTMLInputElement>(null);
  const refEstoque = useRef<HTMLInputElement>(null);
  const refMetragem = useRef<HTMLInputElement>(null);
  const refValorMetro = useRef<HTMLInputElement>(null);

  const n = {
    estoque: lerNumero(estoque),
    quantidade: lerNumero(quantidade),
    valorVendido: lerNumero(valorVendido),
    custo: lerNumero(custo),
    metragem: lerNumero(metragem),
    valorMetro: lerNumero(valorMetro),
  };

  const entradaAnalise = {
    quantidadeVendida: n.quantidade,
    valorVendido: n.valorVendido,
    custoMetro: n.custo,
  };

  const analise = analisarProduto(entradaAnalise, parametros);
  const pisos = analise ? pisosDePreco(n.custo, parametros) : null;
  const simulacao = calculado
    ? simularNegociacao(
        entradaAnalise,
        { metragem: n.metragem, valorMetro: n.valorMetro, estoque: n.estoque },
        parametros,
      )
    : null;

  const erros = {
    estoque: erroNaoNegativo(estoque, n.estoque) ?? errosAprovacao.estoque ?? null,
    quantidade: erroPositivo(quantidade, n.quantidade),
    valorVendido: erroPositivo(valorVendido, n.valorVendido),
    custo: erroNaoNegativo(custo, n.custo),
    metragem: erroPositivo(metragem, n.metragem),
    valorMetro: erroPositivo(valorMetro, n.valorMetro),
  };

  const travado = etapa === "salvando" || etapa === "aprovado";
  const tipo: TipoResposta | null =
    solicitacao && n.valorMetro !== null && n.valorMetro > 0 ? tipoResposta(solicitacao.valor_solicitado, n.valorMetro) : null;

  function abrirSimulacao() {
    setSimulacaoAberta(true);
    requestAnimationFrame(() => refMetragem.current?.focus());
  }

  function calcular() {
    setCalculado(true);
    if (n.metragem === null || n.metragem <= 0) refMetragem.current?.focus();
    else if (n.valorMetro === null || n.valorMetro <= 0) refValorMetro.current?.focus();
  }

  function ajustar() {
    refValorMetro.current?.focus();
    refValorMetro.current?.select();
  }

  function pedirAprovacao() {
    const novosErros: typeof errosAprovacao = {};
    if (!codigo.trim()) novosErros.codigo = "Informe o código do produto para aprovar.";
    if (n.estoque === null) novosErros.estoque = "Informe o estoque para aprovar.";
    setErrosAprovacao(novosErros);
    if (novosErros.codigo) return refCodigo.current?.focus();
    if (novosErros.estoque) return refEstoque.current?.focus();
    if (!simulacao) return;
    if (simulacao.faixa === "vermelho") setConfirmarVermelho(true);
    else void aprovar();
  }

  async function aprovar() {
    if (!analise || !simulacao || n.estoque === null) return;
    setConfirmarVermelho(false);
    setEtapa("salvando");
    try {
      const supabase = criarClienteNavegador();
      // Contraproposta não entra no histórico de preços aprovados.
      const precisaRegistro = !solicitacao || tipo === "aprovada";
      // Numa nova tentativa, reaproveita o registro já salvo.
      const salvo = !precisaRegistro ? null : registro ?? (await inserirPrecoAprovado(supabase, {
        codigo_produto: codigo.trim(),
        custo_operacional: parametros.custoOperacional,
        faixa_vermelho: parametros.faixaVermelho,
        faixa_laranja: parametros.faixaLaranja,
        faixa_amarelo: parametros.faixaAmarelo,
        estoque: n.estoque,
        quantidade_vendida: n.quantidade!,
        valor_vendido: n.valorVendido!,
        custo_metro: n.custo!,
        preco_medio: analise.precoMedio,
        preco_medio_liquido: analise.precoMedioLiquido,
        lucro_liquido_metro: analise.lucroLiquidoMetro,
        margem_produto: analise.margem,
        lucro_total_analise: analise.lucroTotal,
        metragem_negociada: n.metragem!,
        preco_negociado_m: n.valorMetro!,
        preco_liquido_negociado: simulacao.precoLiquido,
        lucro_metro_negociado: simulacao.lucroMetro,
        margem_negociacao: simulacao.margem,
        receita_negociacao: simulacao.receita,
        lucro_total_negociacao: simulacao.lucroTotal,
        nova_margem_media: simulacao.novaMargemMedia,
        saldo_estoque: simulacao.saldoEstoque ?? n.estoque - n.metragem!,
        faixa: simulacao.faixa,
        whatsapp_nome: solicitacao ? solicitacao.solicitante_nome : configuracoes.whatsappNome,
        whatsapp_numero: solicitacao ? (whatsappSolicitante ?? "") : configuracoes.whatsappNumero,
        solicitacao_id: solicitacao?.id ?? null,
      }));
      setRegistro(salvo);
      if (solicitacao && tipo) {
        const resposta = await responderSolicitacao(supabase, solicitacao.id, {
          status: tipo,
          precoResposta: n.valorMetro!,
          observacao: observacao.trim() || null,
          precoAprovadoId: salvo?.id ?? null,
          respondidoPor: perfil.userId,
        });
        setRespondida(resposta);
        notificar(resposta.id, "resposta");
        avisarContadores();
      }
      setEtapa("aprovado");
      setErroWhatsApp(null);
      if (!solicitacao || whatsappSolicitante) setDialogoWhatsApp(true);
    } catch (e) {
      setErroSalvar(descreverErro(e, solicitacao ? "A resposta não foi salva." : "O preço não foi salvo."));
      setEtapa("erro");
    }
  }

  async function registrarEnvio() {
    try {
      const supabase = criarClienteNavegador();
      if (respondida) {
        const quando = await marcarSolicitacaoWhatsApp(supabase, respondida.id);
        setRespondida({ ...respondida, whatsapp_enviado_em: quando });
      }
      if (registro) {
        const destinatario = respondida
          ? { nome: respondida.solicitante_nome, numero: whatsappSolicitante ?? "" }
          : { nome: configuracoes.whatsappNome, numero: configuracoes.whatsappNumero };
        const quando = await marcarWhatsAppEnviado(supabase, registro.id, destinatario);
        setRegistro({ ...registro, whatsapp_enviado_em: quando });
      }
      setErroWhatsApp(null);
    } catch {
      setErroWhatsApp("O WhatsApp foi aberto, mas a data de envio não foi registrada. Envie de novo pelo Histórico para registrar.");
    }
  }

  function novaSimulacao() {
    setMetragem("");
    setValorMetro("");
    setCalculado(false);
    setEtapa("editando");
    setRegistro(null);
    setErroWhatsApp(null);
    setSimulacaoAberta(true);
    requestAnimationFrame(() => refMetragem.current?.focus());
  }

  function novoProduto() {
    setCodigo("");
    setEstoque("");
    setQuantidade("");
    setValorVendido("");
    setCusto("");
    setMetragem("");
    setValorMetro("");
    setCalculado(false);
    setSimulacaoAberta(false);
    setEtapa("editando");
    setRegistro(null);
    setErroWhatsApp(null);
    setErrosAprovacao({});
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => refCodigo.current?.focus());
  }

  const margemRegua = simulacao ? simulacao.margem : analise ? analise.margem : null;

  const painelAnalise = (
    <ResultadoDaAnalise
      analise={analise}
      regua={
        <ReguaMargem
          margem={margemRegua}
          parametros={parametros}
          pisos={pisos}
          descricao={simulacao ? "Margem desta negociação" : "Margem do produto"}
        />
      }
    />
  );

  const painelNegociacao =
    calculado && simulacaoAberta ? (
      <div className="border-t border-trama pt-8">
        <ResultadoDaNegociacao simulacao={simulacao} metragem={n.metragem} estoque={n.estoque} />
        {simulacao && (
          <Aprovacao
            solicitacao={solicitacao ?? null}
            tipo={tipo}
            respondida={respondida}
            podeEnviarWhatsApp={!solicitacao || Boolean(whatsappSolicitante)}
            observacao={observacao}
            aoMudarObservacao={setObservacao}
            etapa={etapa}
            codigo={codigo.trim()}
            metragem={n.metragem!}
            valorMetro={n.valorMetro!}
            erroCodigo={errosAprovacao.codigo ?? errosAprovacao.estoque ?? null}
            registro={registro}
            nomeWhatsApp={solicitacao ? solicitacao.solicitante_nome : configuracoes.whatsappNome}
            erroWhatsApp={erroWhatsApp}
            erroSalvar={erroSalvar}
            aoAprovar={pedirAprovacao}
            aoAjustar={ajustar}
            aoTentarDeNovo={() => void aprovar()}
            aoAbrirWhatsApp={() => setDialogoWhatsApp(true)}
            aoNovaSimulacao={novaSimulacao}
            aoNovoProduto={novoProduto}
          />
        )}
      </div>
    ) : null;

  return (
    <>
      <h1 className="sr-only">Calculadora de preços especiais</h1>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Coluna do formulário */}
        <div className="lg:col-span-5">
          <section aria-labelledby="titulo-analise" className="rounded-xl border border-trama bg-superficie p-5 lg:p-7">
            <h2 id="titulo-analise" className="text-lg font-semibold">
              Análise do produto
            </h2>
            <p className="mt-1 text-linha">Vendas já realizadas deste produto.</p>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
              <CampoTexto
                ref={refCodigo}
                rotulo="Código do produto"
                valor={codigo}
                aoMudar={(v) => {
                  setCodigo(v);
                  if (errosAprovacao.codigo) setErrosAprovacao({ ...errosAprovacao, codigo: undefined });
                }}
                erro={errosAprovacao.codigo}
                autoComplete="off"
                autoCapitalize="characters"
                readOnly={travado}
                className="col-span-2"
              />
              <CampoNumero
                ref={refEstoque}
                tipo="metragem"
                rotulo="Estoque"
                valor={estoque}
                aoMudar={(v) => {
                  setEstoque(v);
                  if (errosAprovacao.estoque) setErrosAprovacao({ ...errosAprovacao, estoque: undefined });
                }}
                erro={erros.estoque}
                readOnly={travado}
                className="col-span-2 min-[400px]:col-span-1"
              />
              <CampoNumero
                tipo="metragem"
                rotulo="Quantidade vendida"
                valor={quantidade}
                aoMudar={setQuantidade}
                erro={erros.quantidade}
                readOnly={travado}
                className="col-span-2 min-[400px]:col-span-1"
              />
              <CampoNumero
                tipo="moeda"
                rotulo="Valor vendido"
                valor={valorVendido}
                aoMudar={setValorVendido}
                erro={erros.valorVendido}
                readOnly={travado}
                className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1"
              />
              <CampoNumero
                tipo="moeda"
                rotulo="Custo do produto"
                valor={custo}
                aoMudar={setCusto}
                erro={erros.custo}
                ajuda={solicitacao && !custo ? "Por metro. Preencha para avaliar a solicitação." : "Por metro."}
                readOnly={travado}
                className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1"
              />
            </div>
            {analise && !simulacaoAberta && (
              <button type="button" onClick={abrirSimulacao} className={`${botao.principal} ${classeBotaoFixo} mt-7 lg:w-full`}>
                Simular preço
              </button>
            )}
          </section>

          {/* Celular: resultados da análise logo abaixo do formulário */}
          <div className="mt-8 lg:hidden">{painelAnalise}</div>

          {simulacaoAberta && (
            <section
              aria-labelledby="titulo-simulacao"
              className="mt-8 rounded-xl border border-trama bg-superficie p-5 lg:p-7"
            >
              <h2 id="titulo-simulacao" className="text-lg font-semibold">
                Simulação de preço
              </h2>
              <p className="mt-1 text-linha">O preço especial pedido pelo gerente.</p>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
                <CampoNumero
                  ref={refMetragem}
                  tipo="metragem"
                  rotulo="Metragem negociada"
                  valor={metragem}
                  aoMudar={setMetragem}
                  erro={erros.metragem}
                  readOnly={travado}
                  className="col-span-2 min-[400px]:col-span-1"
                  onKeyDown={(e) => e.key === "Enter" && calcular()}
                />
                <CampoNumero
                  ref={refValorMetro}
                  tipo="moeda"
                  rotulo="Valor do metro"
                  valor={valorMetro}
                  aoMudar={setValorMetro}
                  erro={erros.valorMetro}
                  readOnly={travado}
                  className="col-span-2 min-[400px]:col-span-1"
                  onKeyDown={(e) => e.key === "Enter" && calcular()}
                />
              </div>
              {!calculado && (
                <button type="button" onClick={calcular} className={`${botao.principal} ${classeBotaoFixo} mt-7 lg:w-full`}>
                  Calcular
                </button>
              )}
            </section>
          )}

          {/* Celular: resultado da negociação e aprovação */}
          {painelNegociacao && <div className="mt-8 lg:hidden">{painelNegociacao}</div>}
        </div>

        {/* Desktop: painel de resultados que acompanha a rolagem */}
        <div className="hidden lg:col-span-7 lg:block">
          <div className="sticky top-24 flex flex-col gap-8 rounded-xl border border-trama bg-superficie p-8">
            {painelAnalise}
            {painelNegociacao}
          </div>
        </div>
      </div>

      <Dialogo
        aberto={confirmarVermelho}
        aoMudarAberto={setConfirmarVermelho}
        titulo="Margem abaixo do mínimo"
        descricao={`Esta margem está abaixo do mínimo de ${formatarPercentual(parametros.faixaVermelho / 100).replace(",0", "")}. ${
          tipo === "contraproposta" ? "Enviar a contraproposta mesmo assim?" : "Aprovar mesmo assim?"
        }`}
      >
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={botao.secundario} onClick={() => setConfirmarVermelho(false)}>
            Voltar
          </button>
          <button type="button" className={botao.perigo} onClick={() => void aprovar()}>
            {tipo === "contraproposta" ? "Enviar mesmo assim" : "Aprovar mesmo assim"}
          </button>
        </div>
      </Dialogo>

      {respondida && whatsappSolicitante ? (
        <DialogoWhatsApp
          aberto={dialogoWhatsApp}
          aoMudarAberto={setDialogoWhatsApp}
          nome={respondida.solicitante_nome}
          numero={whatsappSolicitante}
          codigoProduto={respondida.codigo_produto}
          precoMetro={respondida.preco_resposta!}
          mensagem={mensagemResposta(
            respondida.status === "aprovada" ? "aprovada" : "contraproposta",
            respondida.codigo_produto,
            respondida.preco_resposta!,
            respondida.observacao,
          )}
          aoEnviar={() => void registrarEnvio()}
        />
      ) : (
        registro &&
        !solicitacao && (
          <DialogoWhatsApp
            aberto={dialogoWhatsApp}
            aoMudarAberto={setDialogoWhatsApp}
            nome={configuracoes.whatsappNome}
            numero={configuracoes.whatsappNumero}
            codigoProduto={registro.codigo_produto}
            precoMetro={registro.preco_negociado_m}
            aoEnviar={() => void registrarEnvio()}
          />
        )
      )}
    </>
  );
}

function ResultadoDaAnalise({ analise, regua }: { analise: ResultadoAnalise | null; regua: ReactNode }) {
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id={idTitulo} className="text-lg font-semibold">
          Margem do produto
        </h2>
        {analise && <SeloFaixa faixa={analise.faixa} />}
      </div>
      <p
        className={`numeros mt-1 text-[2.5rem] leading-tight font-medium ${analise ? corFaixa[analise.faixa].texto : "text-linha"}`}
      >
        {formatarPercentual(analise?.margem)}
      </p>
      {analise && analise.margem < 0 && <p className="font-medium text-vermelho">Prejuízo</p>}
      {!analise && <p className="mt-1 text-linha">Preencha quantidade vendida, valor vendido e custo para ver a margem.</p>}

      <div className="mt-6">{regua}</div>

      <dl className="mt-2">
        <LinhaValor rotulo="Preço médio de venda">{formatarMoeda(analise?.precoMedio)}</LinhaValor>
        <LinhaValor rotulo="Preço médio líquido">{formatarMoeda(analise?.precoMedioLiquido)}</LinhaValor>
        <LinhaValor rotulo="Lucro líquido por metro">{formatarMoeda(analise?.lucroLiquidoMetro)}</LinhaValor>
        <LinhaValor rotulo="Lucro total" destaque>
          {formatarMoeda(analise?.lucroTotal)}
        </LinhaValor>
      </dl>
    </section>
  );
}

function ResultadoDaNegociacao({
  simulacao,
  metragem,
  estoque,
}: {
  simulacao: ResultadoSimulacao | null;
  metragem: number | null;
  estoque: number | null;
}) {
  const idTitulo = useId();
  const prejuizo = simulacao !== null && simulacao.margem < 0;
  return (
    <section aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="text-lg font-semibold">
        Margem desta negociação
      </h2>
      <p
        className={`numeros mt-1 text-[3.5rem] leading-none font-medium tracking-tight lg:text-[4.5rem] ${
          simulacao ? corFaixa[simulacao.faixa].texto : "text-linha"
        }`}
      >
        {formatarPercentual(simulacao?.margem)}
      </p>
      {simulacao ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <SeloFaixa faixa={simulacao.faixa} />
          {prejuizo && (
            <span className="font-medium text-vermelho">
              Prejuízo de {formatarMoeda(Math.abs(simulacao.lucroMetro))} por metro
            </span>
          )}
        </div>
      ) : (
        <p className="mt-2 text-linha">Informe metragem e valor do metro maiores que zero.</p>
      )}

      {simulacao?.excedeEstoque && estoque !== null && metragem !== null && (
        <p role="alert" className="mt-4 rounded-lg bg-laranja-fundo px-4 py-3 text-laranja">
          A metragem negociada é maior que o estoque disponível de {formatarMetragem(estoque)}.
        </p>
      )}

      <dl className="mt-4">
        <LinhaValor rotulo="Lucro por metro">{formatarMoeda(simulacao?.lucroMetro)}</LinhaValor>
        <LinhaValor rotulo="Receita da negociação">{formatarMoeda(simulacao?.receita)}</LinhaValor>
        <LinhaValor rotulo="Lucro total da negociação">{formatarMoeda(simulacao?.lucroTotal)}</LinhaValor>
        <LinhaValor rotulo="Nova margem média do produto">{formatarPercentual(simulacao?.novaMargemMedia)}</LinhaValor>
        <LinhaValor rotulo="Saldo de estoque após a venda">{formatarMetragem(simulacao?.saldoEstoque)}</LinhaValor>
      </dl>
    </section>
  );
}

interface PropsAprovacao {
  solicitacao: Solicitacao | null;
  tipo: TipoResposta | null;
  respondida: Solicitacao | null;
  podeEnviarWhatsApp: boolean;
  observacao: string;
  aoMudarObservacao: (v: string) => void;
  etapa: Etapa;
  codigo: string;
  metragem: number;
  valorMetro: number;
  erroCodigo: string | null;
  registro: PrecoAprovado | null;
  nomeWhatsApp: string;
  erroWhatsApp: string | null;
  erroSalvar: string | null;
  aoAprovar: () => void;
  aoAjustar: () => void;
  aoTentarDeNovo: () => void;
  aoAbrirWhatsApp: () => void;
  aoNovaSimulacao: () => void;
  aoNovoProduto: () => void;
}

function Aprovacao(p: PropsAprovacao) {
  const idObservacao = useId();
  const resumo = `${formatarMetragem(p.metragem)} a ${formatarMoeda(p.valorMetro)}/m${p.codigo ? `, produto ${p.codigo}` : ""}.`;
  const contraproposta = p.tipo === "contraproposta";

  if (p.etapa === "aprovado" && (p.registro || p.respondida)) {
    const enviadoEm = p.respondida ? p.respondida.whatsapp_enviado_em : p.registro?.whatsapp_enviado_em;
    const preco = p.respondida ? p.respondida.preco_resposta! : p.registro!.preco_negociado_m;
    const metragem = p.respondida ? p.respondida.metragem : p.registro!.metragem_negociada;
    const codigo = p.respondida ? p.respondida.codigo_produto : p.registro!.codigo_produto;
    return (
      <div className="mt-8 rounded-lg border border-trama bg-fundo p-5">
        <div role="status">
          <h3 className="text-lg font-semibold text-grafite">
            {p.respondida?.status === "contraproposta" ? "Contraproposta enviada" : "Preço aprovado"}
          </h3>
        </div>
        <p className="mt-1 text-linha">
          {formatarMetragem(metragem)} a {formatarMoeda(preco)}/m, produto {codigo}.
          {p.respondida && ` ${p.respondida.solicitante_nome || "Quem pediu"} já pode ver a resposta no sistema.`}
        </p>
        {enviadoEm ? (
          <p className="mt-3 text-grafite">
            Enviado para {p.nomeWhatsApp} em {formatarDataHora(enviadoEm)}.
          </p>
        ) : p.podeEnviarWhatsApp ? (
          <button type="button" onClick={p.aoAbrirWhatsApp} className={`${botao.secundario} mt-4 w-full sm:w-auto`}>
            <IconeWhatsApp />
            Enviar no WhatsApp
          </button>
        ) : (
          <p className="mt-3 text-sm text-linha">{p.nomeWhatsApp || "Quem pediu"} não tem WhatsApp cadastrado.</p>
        )}
        {p.erroWhatsApp && (
          <p role="alert" className="mt-3 text-vermelho">
            {p.erroWhatsApp}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3 border-t border-trama pt-5 sm:flex-row">
          {p.solicitacao ? (
            <Link href="/solicitacoes" className={`${botao.principal} sm:flex-1`}>
              Voltar para solicitações
            </Link>
          ) : (
            <>
              <button type="button" onClick={p.aoNovaSimulacao} className={`${botao.principal} sm:flex-1`}>
                Nova simulação
              </button>
              <button type="button" onClick={p.aoNovoProduto} className={`${botao.secundario} sm:flex-1`}>
                Novo produto
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const salvando = p.etapa === "salvando";
  const titulo = contraproposta ? "Enviar contraproposta?" : "Aprovar este preço?";
  const acao = contraproposta ? "Enviar contraproposta" : "Aprovar preço";
  return (
    <div className="mt-8 rounded-lg border border-indigo/30 bg-indigo-claro p-5">
      <h3 className="text-lg font-semibold text-grafite">{titulo}</h3>
      <p className="numeros mt-1 text-linha">{resumo}</p>
      {p.solicitacao && (
        <p className="numeros mt-1 text-linha">
          {p.solicitacao.valor_solicitado === null
            ? "Sem valor solicitado."
            : `Valor solicitado: ${formatarMoeda(p.solicitacao.valor_solicitado)}/m.`}
        </p>
      )}
      {p.solicitacao && (
        <div className="mt-4">
          <label htmlFor={idObservacao} className="mb-1.5 block text-[0.9375rem] font-medium text-grafite">
            Observação para {p.solicitacao.solicitante_nome || "quem pediu"}
          </label>
          <textarea
            id={idObservacao}
            value={p.observacao}
            onChange={(e) => p.aoMudarObservacao(e.target.value)}
            readOnly={salvando}
            rows={2}
            maxLength={500}
            placeholder="Opcional"
            className="block w-full rounded-lg border border-trama bg-superficie px-3.5 py-3 text-grafite outline-none hover:border-linha focus:border-indigo focus:ring-1 focus:ring-indigo"
          />
        </div>
      )}
      {p.erroCodigo && (
        <p role="alert" className="mt-3 text-vermelho">
          {p.erroCodigo}
        </p>
      )}
      {p.etapa === "erro" && (
        <div role="alert" className="mt-4 rounded-lg border border-vermelho/30 bg-vermelho-fundo px-4 py-3 text-vermelho">
          <p>{p.erroSalvar}</p>
          <button type="button" onClick={p.aoTentarDeNovo} className={`${botao.texto} text-vermelho`}>
            Tentar de novo
          </button>
        </div>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={p.aoAprovar} disabled={salvando} className={`${botao.principal} sm:flex-1`}>
          {salvando ? "Salvando…" : acao}
        </button>
        <button type="button" onClick={p.aoAjustar} disabled={salvando} className={`${botao.secundario} sm:flex-1`}>
          Ajustar
        </button>
      </div>
    </div>
  );
}
