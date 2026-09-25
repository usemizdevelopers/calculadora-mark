import type { Metadata } from "next";
import { ListaSolicitacoes } from "./ListaSolicitacoes";

export const metadata: Metadata = { title: "Solicitações | Preços especiais" };

export default function PaginaSolicitacoes() {
  return <ListaSolicitacoes />;
}
