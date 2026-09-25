"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AvisoNotificacoes } from "@/components/AvisoNotificacoes";
import { EVENTO_CONTADORES } from "@/components/Navegacao";
import { botao } from "@/components/estilos";
import { descreverErro, listarSolicitacoes, type Solicitacao } from "@/lib/dados";
import { formatarData, formatarDataHora, formatarMetragem, formatarMoeda } from "@/lib/formatacao";
import { NOMES_STATUS } from "@/lib/solicitacoes";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

type Aba = "pendentes" | "respondidas";

export function ListaSolicitacoes() {
  const [aba, setAba] = useState<Aba>("pendentes");
  const [itens, setItens] = useState<Solicitacao[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const requisicao = useRef(0);

  const carregar = useCallback(async (a: Aba, p: number) => {
    const id = ++requisicao.current;
    setCarregando(true);
    setErro(null);
    try {
      const r = await listarSolicitacoes(criarClienteNavegador(), a, p);
      if (id !== requisicao.current) return;
      setItens((atual) => (p === 0 ? r.itens : [...atual, ...r.itens]));
      setTemMais(r.temMais);
      setPagina(p);
    } catch (e) {
      if (id === requisicao.current) setErro(descreverErro(e, "As solicitações não carregaram."));
    } finally {
      if (id === requisicao.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial e a cada aba
    void carregar(aba, 0);
  }, [aba, carregar]);

  // Novas solicitações aparecem sozinhas na aba de pendentes.
  useEffect(() => {
    if (aba !== "pendentes") return;
    const recarregar = () => void carregar("pendentes", 0);
    window.addEventListener(EVENTO_CONTADORES, recarregar);
    const intervalo = setInterval(recarregar, 60_000);
    return () => {
      window.removeEventListener(EVENTO_CONTADORES, recarregar);
      clearInterval(intervalo);
    };
  }, [aba, carregar]);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Solicitações</h1>
        <p aria-live="polite" className="text-sm text-linha">
          {carregando ? "Carregando…" : ""}
        </p>
      </div>
      <p className="mt-1 text-linha">Pedidos de avaliação de preço enviados pela equipe.</p>

      <AvisoNotificacoes texto="Ative para receber um aviso neste aparelho quando chegar uma nova solicitação." />

      <div role="group" aria-label="Situação" className="mt-6 flex gap-6 border-b border-trama">
        {(["pendentes", "respondidas"] as const).map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={aba === a}
            onClick={() => setAba(a)}
            className={`relative min-h-12 font-medium ${aba === a ? "text-indigo" : "text-linha hover:text-grafite"}`}
          >
            {a === "pendentes" ? "Pendentes" : "Respondidas"}
            {aba === a && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo" />}
          </button>
        ))}
      </div>

      {erro && (
        <div role="alert" className="mt-6 text-vermelho">
          <p>{erro}</p>
          <button type="button" className={`${botao.texto} text-vermelho`} onClick={() => void carregar(aba, pagina)}>
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erro && itens.length === 0 && (
        <p className="mt-10 max-w-md text-linha">
          {aba === "pendentes"
            ? "Nenhuma solicitação aguardando avaliação."
            : "Nenhuma solicitação respondida ainda."}
        </p>
      )}

      <ul>
        {itens.map((s) => (
          <li key={s.id} className="border-b border-trama">
            <Link
              href={`/solicitacoes/${s.id}`}
              className="-mx-2 flex flex-col gap-2 rounded-lg px-2 py-4 hover:bg-superficie sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-grafite">
                  {s.codigo_produto}
                  <span className="font-normal text-linha"> de {s.solicitante_nome || "solicitante"}</span>
                </p>
                <p className="text-sm text-linha">
                  {aba === "pendentes"
                    ? `Recebida em ${formatarDataHora(s.criado_em)}`
                    : `Respondida em ${formatarData(s.respondido_em!)}`}
                </p>
              </div>
              <div className="numeros flex items-baseline gap-5 text-[0.9375rem] sm:text-right">
                <span>{formatarMetragem(s.metragem)}</span>
                {aba === "pendentes" ? (
                  <span className="min-w-28">
                    {s.valor_solicitado === null ? "Sem valor" : `${formatarMoeda(s.valor_solicitado)}/m`}
                  </span>
                ) : (
                  <span className="min-w-40">
                    <span className="text-linha">{NOMES_STATUS[s.status]} </span>
                    {formatarMoeda(s.preco_resposta)}/m
                  </span>
                )}
                <span aria-hidden className="hidden text-indigo sm:inline">
                  {aba === "pendentes" ? "Avaliar" : "Ver"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {temMais && (
        <div className="mt-6 flex justify-center">
          <button type="button" className={botao.secundario} disabled={carregando} onClick={() => void carregar(aba, pagina + 1)}>
            {carregando ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </>
  );
}
