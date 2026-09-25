"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Configuracoes } from "@/lib/dados";

interface ValorContexto {
  configuracoes: Configuracoes;
  definirConfiguracoes: (c: Configuracoes) => void;
}

const Contexto = createContext<ValorContexto | null>(null);

export function ProvedorConfiguracoes({ inicial, children }: { inicial: Configuracoes; children: ReactNode }) {
  const [configuracoes, definirConfiguracoes] = useState(inicial);
  return <Contexto.Provider value={{ configuracoes, definirConfiguracoes }}>{children}</Contexto.Provider>;
}

export function useConfiguracoes() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useConfiguracoes precisa estar dentro de ProvedorConfiguracoes");
  return valor;
}
