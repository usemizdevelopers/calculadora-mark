import type { Metadata } from "next";
import { MinhasSolicitacoes } from "./MinhasSolicitacoes";

export const metadata: Metadata = { title: "Minhas solicitações | Preços especiais" };

export default function PaginaMinhasSolicitacoes() {
  return <MinhasSolicitacoes />;
}
