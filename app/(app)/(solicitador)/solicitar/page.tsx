import type { Metadata } from "next";
import { NovaSolicitacao } from "./NovaSolicitacao";

export const metadata: Metadata = { title: "Nova solicitação | Preços especiais" };

export default function PaginaSolicitar() {
  return <NovaSolicitacao />;
}
