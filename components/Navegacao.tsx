"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { usePerfil } from "./PerfilContexto";
import { contarPendentes, contarRespostasNaoLidas } from "@/lib/dados";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

interface Item {
  href: string;
  rotulo: string;
  icone: ComponentType;
  /** Mostra o contador neste item. */
  contador?: boolean;
}

const ITENS_AVALIADOR: Item[] = [
  { href: "/", rotulo: "Calculadora", icone: IconeCalculadora },
  { href: "/solicitacoes", rotulo: "Solicitações", icone: IconeSolicitacoes, contador: true },
  { href: "/historico", rotulo: "Histórico", icone: IconeHistorico },
  { href: "/configuracoes", rotulo: "Configurações", icone: IconeConfiguracoes },
];

const ITENS_SOLICITADOR: Item[] = [
  { href: "/solicitar", rotulo: "Nova solicitação", icone: IconeNova },
  { href: "/minhas-solicitacoes", rotulo: "Minhas solicitações", icone: IconeSolicitacoes, contador: true },
];

/** Evento disparado quando uma ação muda os contadores do menu. */
export const EVENTO_CONTADORES = "calc:contadores";

export function avisarContadores() {
  window.dispatchEvent(new Event(EVENTO_CONTADORES));
}

function useContador(): number {
  const perfil = usePerfil();
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ativo = true;
    const atualizar = async () => {
      const supabase = criarClienteNavegador();
      const n =
        perfil.papel === "avaliador"
          ? await contarPendentes(supabase)
          : await contarRespostasNaoLidas(supabase, perfil.userId);
      if (ativo) setTotal(n);
    };
    const aoVoltar = () => document.visibilityState === "visible" && void atualizar();
    void atualizar();
    const intervalo = setInterval(atualizar, 60_000);
    window.addEventListener(EVENTO_CONTADORES, atualizar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      window.removeEventListener(EVENTO_CONTADORES, atualizar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [perfil.papel, perfil.userId]);

  return total;
}

function Contador({ total, rotulo }: { total: number; rotulo: string }) {
  if (total <= 0) return null;
  return (
    <span className="numeros inline-flex min-w-5 items-center justify-center rounded-full bg-indigo px-1.5 text-xs leading-5 font-semibold text-white">
      {total > 99 ? "99+" : total}
      <span className="sr-only"> {rotulo}</span>
    </span>
  );
}

export function Navegacao() {
  const perfil = usePerfil();
  const caminho = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const total = useContador();
  const itens = perfil.papel === "avaliador" ? ITENS_AVALIADOR : ITENS_SOLICITADOR;
  const rotuloContador = perfil.papel === "avaliador" ? "pendentes" : "respostas novas";

  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`));

  async function sair() {
    setSaindo(true);
    await criarClienteNavegador().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop: barra superior */}
      <header className="sticky top-0 z-30 hidden border-b border-trama bg-superficie lg:block">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-10 px-8">
          <Link href={itens[0].href} className="font-semibold text-grafite">
            Preços especiais
          </Link>
          <nav aria-label="Principal" className="flex h-full gap-7">
            {itens.map((item) => {
              const atual = ativo(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={atual ? "page" : undefined}
                  className={`relative flex h-full items-center gap-2 font-medium transition-colors ${
                    atual ? "text-indigo" : "text-linha hover:text-grafite"
                  }`}
                >
                  {item.rotulo}
                  {item.contador && <Contador total={total} rotulo={rotuloContador} />}
                  {atual && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo" />}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-5">
            <span className="text-linha">{perfil.nome}</span>
            <button
              type="button"
              onClick={sair}
              disabled={saindo}
              className="min-h-12 font-medium text-linha hover:text-grafite disabled:opacity-50"
            >
              {saindo ? "Saindo…" : "Sair"}
            </button>
          </div>
        </div>
      </header>

      {/* Celular: topo simples com Sair */}
      <header className="flex h-14 items-center justify-between px-5 lg:hidden">
        <span className="font-semibold text-grafite">Preços especiais</span>
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="-mr-2 min-h-12 px-2 font-medium text-linha disabled:opacity-50"
        >
          {saindo ? "Saindo…" : "Sair"}
        </button>
      </header>

      {/* Celular: barra inferior fixa */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-trama bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid h-(--altura-nav)" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
          {itens.map((item) => {
            const atual = ativo(item.href);
            const Icone = item.icone;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={atual ? "page" : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium whitespace-nowrap ${
                    atual ? "text-indigo" : "text-linha"
                  }`}
                >
                  <span className="relative">
                    <Icone />
                    {item.contador && total > 0 && (
                      <span className="absolute -top-1.5 -right-3">
                        <Contador total={total} rotulo={rotuloContador} />
                      </span>
                    )}
                  </span>
                  {item.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function IconeCalculadora() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8.5 12h1M11.5 12h1M14.5 12h1M8.5 15.5h1M11.5 15.5h1M14.5 15.5h1" strokeLinecap="round" />
    </svg>
  );
}

function IconeSolicitacoes() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V17h0a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
      <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
    </svg>
  );
}

function IconeNova() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
    </svg>
  );
}

function IconeHistorico() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  );
}

function IconeConfiguracoes() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" strokeLinecap="round" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  );
}
