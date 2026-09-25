"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

const ITENS = [
  { href: "/", rotulo: "Calculadora", icone: IconeCalculadora },
  { href: "/historico", rotulo: "Histórico", icone: IconeHistorico },
  { href: "/configuracoes", rotulo: "Configurações", icone: IconeConfiguracoes },
];

export function Navegacao() {
  const caminho = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

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
          <Link href="/" className="font-semibold text-grafite">
            Preços especiais
          </Link>
          <nav aria-label="Principal" className="flex h-full gap-7">
            {ITENS.map((item) => {
              const ativo = caminho === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`relative flex h-full items-center font-medium transition-colors ${
                    ativo ? "text-indigo" : "text-linha hover:text-grafite"
                  }`}
                >
                  {item.rotulo}
                  {ativo && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo" />}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            className="ml-auto min-h-12 font-medium text-linha hover:text-grafite disabled:opacity-50"
          >
            {saindo ? "Saindo…" : "Sair"}
          </button>
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
        <ul className="grid h-(--altura-nav) grid-cols-3">
          {ITENS.map((item) => {
            const ativo = caminho === item.href;
            const Icone = item.icone;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    ativo ? "text-indigo" : "text-linha"
                  }`}
                >
                  <Icone />
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
