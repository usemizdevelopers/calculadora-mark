import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";

export default async function LayoutSolicitador({ children }: { children: React.ReactNode }) {
  const { perfil } = await obterSessao();
  if (perfil?.papel !== "solicitador") redirect("/solicitacoes");
  return children;
}
