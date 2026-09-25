import { ProvedorConfiguracoes } from "@/components/ConfiguracoesContexto";
import { Navegacao } from "@/components/Navegacao";
import { carregarConfiguracoes } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const configuracoes = await carregarConfiguracoes(supabase);

  return (
    <ProvedorConfiguracoes inicial={configuracoes}>
      <Navegacao />
      <main className="mx-auto max-w-[1120px] px-5 pt-2 pb-[calc(var(--altura-nav)+env(safe-area-inset-bottom)+6rem)] lg:px-8 lg:pt-10 lg:pb-20">
        {children}
      </main>
    </ProvedorConfiguracoes>
  );
}
