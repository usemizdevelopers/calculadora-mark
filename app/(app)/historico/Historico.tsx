"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CampoTexto } from "@/components/Campo";
import { useConfiguracoes } from "@/components/ConfiguracoesContexto";
import { DetalhesPreco } from "@/components/DetalhesPreco";
import { Dialogo } from "@/components/Dialogo";
import { DialogoWhatsApp } from "@/components/DialogoWhatsApp";
import { IconeWhatsApp } from "@/components/IconeWhatsApp";
import { SeloFaixa } from "@/components/SeloFaixa";
import { botao, corFaixa } from "@/components/estilos";
import {
  excluirPrecoAprovado,
  listarPrecosAprovados,
  marcarWhatsAppEnviado,
  type FiltroHistorico,
  type PrecoAprovado,
} from "@/lib/dados";
import { formatarData, formatarDataHora, formatarMetragem, formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

const FILTRO_VAZIO: FiltroHistorico = { codigo: "", de: "", ate: "" };

export function Historico() {
  const { configuracoes } = useConfiguracoes();
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState(FILTRO_VAZIO);
  const [itens, setItens] = useState<PrecoAprovado[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [detalhe, setDetalhe] = useState<PrecoAprovado | null>(null);
  const [envio, setEnvio] = useState<PrecoAprovado | null>(null);
  const [exclusao, setExclusao] = useState<PrecoAprovado | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const requisicao = useRef(0);

  // Busca por código com uma pequena espera enquanto digita.
  useEffect(() => {
    const t = setTimeout(() => setFiltroAplicado(filtro), filtro.codigo === filtroAplicado.codigo ? 0 : 300);
    return () => clearTimeout(t);
  }, [filtro, filtroAplicado.codigo]);

  const carregar = useCallback(async (f: FiltroHistorico, p: number) => {
    const id = ++requisicao.current;
    if (p === 0) setCarregando(true);
    else setCarregandoMais(true);
    setErro(null);
    try {
      const r = await listarPrecosAprovados(criarClienteNavegador(), f, p);
      if (id !== requisicao.current) return;
      setItens((atual) => (p === 0 ? r.itens : [...atual, ...r.itens]));
      setTemMais(r.temMais);
      setPagina(p);
    } catch {
      if (id !== requisicao.current) return;
      setErro("Não foi possível carregar o histórico. Verifique a internet e tente de novo.");
    } finally {
      if (id === requisicao.current) {
        setCarregando(false);
        setCarregandoMais(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial e a cada filtro
    void carregar(filtroAplicado, 0);
  }, [filtroAplicado, carregar]);

  function atualizarItem(atualizado: PrecoAprovado) {
    setItens((atual) => atual.map((i) => (i.id === atualizado.id ? atualizado : i)));
    setDetalhe((d) => (d?.id === atualizado.id ? atualizado : d));
  }

  async function registrarEnvio(registro: PrecoAprovado) {
    setErroAcao(null);
    try {
      const destinatario = { nome: configuracoes.whatsappNome, numero: configuracoes.whatsappNumero };
      const quando = await marcarWhatsAppEnviado(criarClienteNavegador(), registro.id, destinatario);
      atualizarItem({
        ...registro,
        whatsapp_enviado_em: quando,
        whatsapp_nome: destinatario.nome,
        whatsapp_numero: destinatario.numero,
      });
    } catch {
      setErroAcao("O WhatsApp foi aberto, mas a data de envio não foi registrada. Envie de novo para registrar.");
    }
  }

  async function excluir() {
    if (!exclusao) return;
    setExcluindo(true);
    setErroAcao(null);
    try {
      await excluirPrecoAprovado(criarClienteNavegador(), exclusao.id);
      setItens((atual) => atual.filter((i) => i.id !== exclusao.id));
      setAviso(`Registro do produto ${exclusao.codigo_produto} excluído.`);
      setExclusao(null);
      setDetalhe(null);
    } catch {
      setErroAcao("O registro não foi excluído. Verifique a internet e tente de novo.");
    } finally {
      setExcluindo(false);
    }
  }

  const filtrando = Boolean(filtroAplicado.codigo.trim() || filtroAplicado.de || filtroAplicado.ate);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p aria-live="polite" className="text-sm text-linha">
          {carregando ? "Carregando…" : ""}
        </p>
      </div>
      <p className="mt-1 text-linha">Preços aprovados, dos mais recentes para os mais antigos.</p>

      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-b border-trama pb-6 lg:grid-cols-[1fr_12rem_12rem_auto] lg:items-end"
      >
        <CampoTexto
          rotulo="Código do produto"
          type="search"
          valor={filtro.codigo}
          aoMudar={(codigo) => setFiltro({ ...filtro, codigo })}
          placeholder="Buscar"
          autoComplete="off"
          className="col-span-2 lg:col-span-1"
        />
        <CampoTexto rotulo="De" type="date" valor={filtro.de} aoMudar={(de) => setFiltro({ ...filtro, de })} max={filtro.ate || undefined} />
        <CampoTexto rotulo="Até" type="date" valor={filtro.ate} aoMudar={(ate) => setFiltro({ ...filtro, ate })} min={filtro.de || undefined} />
        {filtrando && (
          <button
            type="button"
            className={`${botao.texto} col-span-2 justify-self-start lg:col-span-1`}
            onClick={() => {
              setFiltro(FILTRO_VAZIO);
              setFiltroAplicado(FILTRO_VAZIO);
            }}
          >
            Limpar filtros
          </button>
        )}
      </form>

      {aviso && (
        <p role="status" className="mt-4 text-grafite">
          {aviso}
        </p>
      )}
      {erroAcao && !exclusao && (
        <p role="alert" className="mt-4 text-vermelho">
          {erroAcao}
        </p>
      )}

      {erro && (
        <div role="alert" className="mt-6 text-vermelho">
          <p>{erro}</p>
          <button type="button" className={`${botao.texto} text-vermelho`} onClick={() => void carregar(filtroAplicado, pagina)}>
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erro && itens.length === 0 && (
        <p className="mt-10 max-w-md text-linha">
          {filtrando
            ? "Nenhum preço aprovado com esses filtros. Mude a busca ou limpe os filtros."
            : "Nenhum preço aprovado ainda. Os preços que você aprovar na calculadora aparecem aqui."}
        </p>
      )}

      {itens.length > 0 && (
        <div className={carregando ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {/* Celular: itens empilhados */}
          <ul className="lg:hidden">
            {itens.map((r) => (
              <li key={r.id} className="border-b border-trama py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-grafite">{r.codigo_produto}</p>
                    <p className="text-sm text-linha">{formatarDataHora(r.criado_em)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`numeros text-xl font-medium ${corFaixa[r.faixa].texto}`}>{formatarPercentual(r.margem_negociacao)}</p>
                    <SeloFaixa faixa={r.faixa} />
                  </div>
                </div>
                <dl className="numeros mt-3 grid grid-cols-2 gap-y-1 text-[0.9375rem]">
                  <dt className="text-linha">Metragem</dt>
                  <dd className="text-right">{formatarMetragem(r.metragem_negociada)}</dd>
                  <dt className="text-linha">Valor do metro</dt>
                  <dd className="text-right">{formatarMoeda(r.preco_negociado_m)}</dd>
                  <dt className="text-linha">Lucro total</dt>
                  <dd className="text-right">{formatarMoeda(r.lucro_total_negociacao)}</dd>
                  <dt className="text-linha">WhatsApp</dt>
                  <dd className="text-right">{r.whatsapp_enviado_em ? `Enviado em ${formatarData(r.whatsapp_enviado_em)}` : "Não enviado"}</dd>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button type="button" className={`${botao.secundario} min-h-11 px-4`} onClick={() => setEnvio(r)}>
                    <IconeWhatsApp />
                    Enviar no WhatsApp
                  </button>
                  <button type="button" className={botao.texto} onClick={() => setDetalhe(r)}>
                    Ver detalhes
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto lg:block">
          <table className="numeros w-full text-[0.875rem]">
            <thead>
              <tr className="border-b border-trama text-left text-sm text-linha">
                <th scope="col" className="py-3 pr-4 font-medium">Produto</th>
                <th scope="col" className="py-3 pr-4 font-medium">Data</th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">Metragem</th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">Valor do metro</th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">Margem</th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">Lucro total</th>
                <th scope="col" className="py-3 pr-4 font-medium">WhatsApp</th>
                <th scope="col" className="py-3 font-medium"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((r) => (
                <tr key={r.id} className="border-b border-trama align-middle">
                  <td className="py-3 pr-4 font-medium text-grafite">{r.codigo_produto}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-linha">{formatarData(r.criado_em)}</td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap">{formatarMetragem(r.metragem_negociada)}</td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap">{formatarMoeda(r.preco_negociado_m)}</td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap">
                    <span className={`mr-2 font-medium ${corFaixa[r.faixa].texto}`}>{formatarPercentual(r.margem_negociacao)}</span>
                    <SeloFaixa faixa={r.faixa} />
                  </td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap">{formatarMoeda(r.lucro_total_negociacao)}</td>
                  <td className="py-3 pr-4 text-linha">
                    {r.whatsapp_enviado_em ? `Enviado em ${formatarData(r.whatsapp_enviado_em)}` : "Não enviado"}
                  </td>
                  <td className="py-1 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setEnvio(r)}
                      aria-label={`Enviar no WhatsApp o preço do produto ${r.codigo_produto}`}
                      title="Enviar no WhatsApp"
                      className="inline-flex size-11 items-center justify-center rounded-lg text-linha hover:bg-fundo hover:text-verde"
                    >
                      <IconeWhatsApp />
                    </button>
                    <button type="button" className={`${botao.texto} ml-2`} onClick={() => setDetalhe(r)}>
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {temMais && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className={botao.secundario}
                disabled={carregandoMais}
                onClick={() => void carregar(filtroAplicado, pagina + 1)}
              >
                {carregandoMais ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      )}

      <Dialogo
        aberto={detalhe !== null}
        aoMudarAberto={(a) => !a && setDetalhe(null)}
        titulo={detalhe ? `Produto ${detalhe.codigo_produto}` : ""}
        descricao={detalhe ? `Aprovado em ${formatarDataHora(detalhe.criado_em)}.` : undefined}
        largura="larga"
      >
        {detalhe && (
          <>
            <DetalhesPreco registro={detalhe} />
            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-trama pt-5 sm:flex-row sm:justify-between">
              <button type="button" className={`${botao.texto} text-vermelho`} onClick={() => setExclusao(detalhe)}>
                Excluir registro
              </button>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button type="button" className={botao.secundario} onClick={() => setDetalhe(null)}>
                  Fechar
                </button>
                <button
                  type="button"
                  className={botao.principal}
                  onClick={() => {
                    setEnvio(detalhe);
                    setDetalhe(null);
                  }}
                >
                  <IconeWhatsApp />
                  Enviar no WhatsApp
                </button>
              </div>
            </div>
          </>
        )}
      </Dialogo>

      <Dialogo
        aberto={exclusao !== null}
        aoMudarAberto={(a) => {
          if (!a && !excluindo) {
            setExclusao(null);
            setErroAcao(null);
          }
        }}
        titulo="Excluir este registro?"
        descricao={
          exclusao
            ? `O preço de ${formatarMoeda(exclusao.preco_negociado_m)}/m do produto ${exclusao.codigo_produto} sai do histórico. Não dá para desfazer.`
            : undefined
        }
        bloquearFora={excluindo}
      >
        {erroAcao && (
          <p role="alert" className="mt-4 text-vermelho">
            {erroAcao}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={botao.secundario} disabled={excluindo} onClick={() => setExclusao(null)}>
            Cancelar
          </button>
          <button type="button" className={botao.perigo} disabled={excluindo} onClick={() => void excluir()}>
            {excluindo ? "Excluindo…" : "Excluir registro"}
          </button>
        </div>
      </Dialogo>

      {envio && (
        <DialogoWhatsApp
          aberto
          aoMudarAberto={(a) => !a && setEnvio(null)}
          nome={configuracoes.whatsappNome}
          numero={configuracoes.whatsappNumero}
          codigoProduto={envio.codigo_produto}
          precoMetro={envio.preco_negociado_m}
          aoEnviar={() => void registrarEnvio(envio)}
        />
      )}
    </>
  );
}
