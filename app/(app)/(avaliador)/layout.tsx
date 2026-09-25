import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";

export default async function LayoutAvaliador({ children }: { children: React.ReactNode }) {
  const { perfil } = await obterSessao();
  if (perfil?.papel !== "avaliador") redirect("/solicitar");
  return children;
}
