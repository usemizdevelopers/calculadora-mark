import type { Metadata } from "next";
import { FormularioNovaSenha } from "./FormularioNovaSenha";

export const metadata: Metadata = { title: "Nova senha | Calculadora de preços" };

export default function PaginaRedefinirSenha() {
  return (
    <main className="flex min-h-dvh items-start justify-center px-5 pt-[12vh] pb-10 sm:items-center sm:pt-0">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-grafite">Criar nova senha</h1>
        <p className="mt-1 text-linha">Use pelo menos 8 caracteres.</p>
        <FormularioNovaSenha />
      </div>
    </main>
  );
}
