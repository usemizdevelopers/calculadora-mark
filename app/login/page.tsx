import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioLogin } from "./FormularioLogin";

export const metadata: Metadata = { title: "Entrar | Calculadora de preços" };

export default function PaginaLogin() {
  return (
    <main className="flex min-h-dvh items-start justify-center px-5 pt-[12vh] pb-10 sm:items-center sm:pt-0">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-grafite">Preços especiais</h1>
        <p className="mt-1 text-linha">Entre para calcular e aprovar preços.</p>
        <Suspense>
          <FormularioLogin />
        </Suspense>
      </div>
    </main>
  );
}
