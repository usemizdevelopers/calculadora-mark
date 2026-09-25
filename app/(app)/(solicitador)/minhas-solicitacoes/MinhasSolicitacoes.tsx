"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AvisoNotificacoes } from "@/components/AvisoNotificacoes";
import { avisarContadores } from "@/components/Navegacao";
import { botao } from "@/components/estilos";
import { descreverErro, listarSolicitacoes, marcarRespostasLidas, type Solicitacao } from "@/lib/dados";
import { formatarDataHora, formatarMetragem, formatarMoeda } from "@/lib/formatacao";
import { NOMES_STATUS } from "@/lib/solicitacoes";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export function MinhasSolicitacoes() {
  const [itens, setItens] = useState<Solicitacao[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const marcou = useRef(false);

  const carregar = useCallback(async (p: number) => {
    setCarregando(true);
    setErro(null);
    try {
      const supabase = criarClienteNavegador();
      const r = await listarSolicitacoes(supabase, "todas", p);
      setItens((atual) => (p === 0 ? r.itens : [...atual, ...r.itens]));
      setTemMais(r.temMais);
      setPagina(p);
      // Ao abrir a página, as respostas novas passam a contar como vistas.
      if (!marcou.current && r.itens.some((s) => s.status !== "pendente" && !s.lido_em)) {
        marcou.current = true;
        await marcarRespostasLidas(supabase);
        avisarContadores();
      }
    } catch (e) {
      setErro(descreverErro(e, "Suas solicitações não carregaram."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial
    void carregar(0);
  }, [carregar]);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Minhas solicitações</h1>
        <p aria-live="polite" className="text-sm text-linha">
          {carregando ? "Carregando…" : ""}
        </p>
      </div>
      <p className="mt-1 text-linha">As respostas aparecem aqui, das mais recentes para as mais antigas.</p>

      <AvisoNotificacoes texto="Ative para receber um aviso neste aparelho quando uma resposta chegar." />

      {erro && (
        <div role="alert" className="mt-6 text-vermelho">
          <p>{erro}</p>
          <button type="button" className={`${botao.texto} text-vermelho`} onClick={() => void carregar(pagina)}>
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erro && itens.length === 0 && (
        <div className="mt-10 max-w-md">
          <p className="text-linha">Você ainda não fez nenhuma solicitação.</p>
          <Link href="/solicitar" className={`${botao.principal} mt-5`}>
            Nova solicitação
          </Link>
        </div>
      )}

      <ul className="mt-6">
        {itens.map((s) => {
          const nova = s.status !== "pendente" && !s.lido_em;
          return (
            <li key={s.id} className="border-b border-trama py-5 first:border-t">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-grafite">
                    <span className="truncate">{s.codigo_produto}</span>
                    {nova && (
                      <span className="rounded-full bg-indigo px-2 text-xs leading-5 font-semibold text-white">Nova</span>
                    )}
                  </p>
                  <p className="text-sm text-linha">Enviada em {formatarDataHora(s.criado_em)}</p>
                </div>
                <p
                  className={`shrink-0 text-sm font-medium ${s.status === "pendente" ? "text-linha" : "text-grafite"}`}
                >
                  {NOMES_STATUS[s.status]}
                </p>
              </div>

              <dl className="numeros mt-3 grid grid-cols-2 gap-y-1 text-[0.9375rem]">
                <dt className="text-linha">Metragem</dt>
                <dd className="text-right">{formatarMetragem(s.metragem)}</dd>
                <dt className="text-linha">Valor solicitado</dt>
                <dd className="text-right">
                  {s.valor_solicitado === null ? "Sem valor" : `${formatarMoeda(s.valor_solicitado)}/m`}
                </dd>
              </dl>

              {s.status !== "pendente" && s.preco_resposta !== null && (
                <div className="mt-4 rounded-lg border border-indigo/25 bg-indigo-claro px-4 py-3">
                  <p className="text-sm text-linha">
                    {s.status === "aprovada" ? "Preço aprovado" : "Contraproposta"} em {formatarDataHora(s.respondido_em!)}
                  </p>
                  <p className="numeros mt-0.5 text-2xl font-medium text-grafite">{formatarMoeda(s.preco_resposta)}/m</p>
                  {s.observacao && <p className="mt-2 whitespace-pre-line text-grafite">{s.observacao}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {temMais && (
        <div className="mt-6 flex justify-center">
          <button type="button" className={botao.secundario} disabled={carregando} onClick={() => void carregar(pagina + 1)}>
            {carregando ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
