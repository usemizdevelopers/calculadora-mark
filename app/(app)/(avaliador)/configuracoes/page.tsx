import type { Metadata } from "next";
import { Configuracoes } from "./Configuracoes";

export const metadata: Metadata = { title: "Configurações | Calculadora de preços" };

export default function PaginaConfiguracoes() {
  return <Configuracoes />;
}
