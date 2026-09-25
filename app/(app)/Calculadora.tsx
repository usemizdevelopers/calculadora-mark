"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { CampoNumero, CampoTexto } from "@/components/Campo";
import { useConfiguracoes } from "@/components/ConfiguracoesContexto";
import { Dialogo } from "@/components/Dialogo";
import { DialogoWhatsApp } from "@/components/DialogoWhatsApp";
import { IconeWhatsApp } from "@/components/IconeWhatsApp";
import { LinhaValor } from "@/components/LinhaValor";
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
import { descreverErro, inserirPrecoAprovado, marcarWhatsAppEnviado, type PrecoAprovado } from "@/lib/dados";
import {
  formatarDataHora,
  formatarMetragem,
  formatarMoeda,
  formatarPercentual,
  lerNumero,
} from "@/lib/formatacao";
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

export function Calculadora() {
  const { configuracoes } = useConfiguracoes();
  const parametros: ParametrosCalculo = configuracoes;

  // Análise
  const [codigo, setCodigo] = useState("");
  const [estoque, setEstoque] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [valorVendido, setValorVendido] = useState("");
  const [custo, setCusto] = useState("");

  // Simulação
  const [simulacaoAberta, setSimulacaoAberta] = useState(false);
  const [metragem, setMetragem] = useState("");
  const [valorMetro, setValorMetro] = useState("");
  const [calculado, setCalculado] = useState(false);

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
      const salvo = await inserirPrecoAprovado(criarClienteNavegador(), {
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
        whatsapp_nome: configuracoes.whatsappNome,
        whatsapp_numero: configuracoes.whatsappNumero,
      });
      setRegistro(salvo);
      setEtapa("aprovado");
      setErroWhatsApp(null);
      setDialogoWhatsApp(true);
    } catch (e) {
      setErroSalvar(descreverErro(e, "O preço não foi salvo."));
      setEtapa("erro");
    }
  }

  async function registrarEnvio() {
    if (!registro) return;
    try {
      const destinatario = { nome: configuracoes.whatsappNome, numero: configuracoes.whatsappNumero };
      const quando = await marcarWhatsAppEnviado(criarClienteNavegador(), registro.id, destinatario);
      setRegistro({ ...registro, whatsapp_enviado_em: quando });
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
            etapa={etapa}
            codigo={codigo.trim()}
            metragem={n.metragem!}
            valorMetro={n.valorMetro!}
            erroCodigo={errosAprovacao.codigo ?? errosAprovacao.estoque ?? null}
            registro={registro}
            nomeWhatsApp={configuracoes.whatsappNome}
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
                ajuda="Por metro."
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
        descricao={`Esta margem está abaixo do mínimo de ${formatarPercentual(parametros.faixaVermelho / 100).replace(",0", "")}. Aprovar mesmo assim?`}
      >
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={botao.secundario} onClick={() => setConfirmarVermelho(false)}>
            Voltar
          </button>
          <button type="button" className={botao.perigo} onClick={() => void aprovar()}>
            Aprovar mesmo assim
          </button>
        </div>
      </Dialogo>

      {registro && (
        <DialogoWhatsApp
          aberto={dialogoWhatsApp}
          aoMudarAberto={setDialogoWhatsApp}
          nome={configuracoes.whatsappNome}
          numero={configuracoes.whatsappNumero}
          codigoProduto={registro.codigo_produto}
          precoMetro={registro.preco_negociado_m}
          aoEnviar={() => void registrarEnvio()}
        />
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
  const resumo = `${formatarMetragem(p.metragem)} a ${formatarMoeda(p.valorMetro)}/m${p.codigo ? `, produto ${p.codigo}` : ""}.`;

  if (p.etapa === "aprovado" && p.registro) {
    return (
      <div className="mt-8 rounded-lg border border-trama bg-fundo p-5">
        <h3 role="status" className="text-lg font-semibold text-grafite">
          Preço aprovado
        </h3>
        <p className="mt-1 text-linha">
          {formatarMetragem(p.registro.metragem_negociada)} a {formatarMoeda(p.registro.preco_negociado_m)}/m, produto{" "}
          {p.registro.codigo_produto}.
        </p>
        {p.registro.whatsapp_enviado_em ? (
          <p className="mt-3 text-grafite">
            Enviado para {p.nomeWhatsApp} em {formatarDataHora(p.registro.whatsapp_enviado_em)}.
          </p>
        ) : (
          <button type="button" onClick={p.aoAbrirWhatsApp} className={`${botao.secundario} mt-4 w-full sm:w-auto`}>
            <IconeWhatsApp />
            Enviar no WhatsApp
          </button>
        )}
        {p.erroWhatsApp && (
          <p role="alert" className="mt-3 text-vermelho">
            {p.erroWhatsApp}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3 border-t border-trama pt-5 sm:flex-row">
          <button type="button" onClick={p.aoNovaSimulacao} className={`${botao.principal} sm:flex-1`}>
            Nova simulação
          </button>
          <button type="button" onClick={p.aoNovoProduto} className={`${botao.secundario} sm:flex-1`}>
            Novo produto
          </button>
        </div>
      </div>
    );
  }

  const salvando = p.etapa === "salvando";
  return (
    <div className="mt-8 rounded-lg border border-indigo/30 bg-indigo-claro p-5">
      <h3 className="text-lg font-semibold text-grafite">Aprovar este preço?</h3>
      <p className="numeros mt-1 text-linha">{resumo}</p>
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
          {salvando ? "Salvando…" : "Aprovar preço"}
        </button>
        <button type="button" onClick={p.aoAjustar} disabled={salvando} className={`${botao.secundario} sm:flex-1`}>
          Ajustar
        </button>
      </div>
    </div>
  );
}
