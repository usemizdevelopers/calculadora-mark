import type { Metadata } from "next";
import { Historico } from "./Historico";

export const metadata: Metadata = { title: "Histórico | Calculadora de preços" };

export default function PaginaHistorico() {
  return <Historico />;
}
