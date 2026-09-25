"use client";

import { useRouter } from "next/navigation";
import { botao } from "./estilos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export function SemAcesso() {
  const router = useRouter();
  return (
    <main className="flex min-h-dvh items-start justify-center px-5 pt-[12vh] sm:items-center sm:pt-0">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Sem acesso</h1>
        <p className="mt-2 text-linha">
          Sua conta ainda não tem permissão para usar este sistema. Peça ao responsável para liberar o seu acesso.
        </p>
        <button
          type="button"
          className={`${botao.secundario} mt-6 w-full`}
          onClick={async () => {
            await criarClienteNavegador().auth.signOut();
            router.replace("/login");
            router.refresh();
          }}
        >
          Sair
        </button>
      </div>
    </main>
  );
}
