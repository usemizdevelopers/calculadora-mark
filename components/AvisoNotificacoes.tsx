"use client";

import { useEffect, useState } from "react";
import { botao } from "./estilos";
import { ativarPush, verificarPush, type EstadoPush } from "@/lib/push";

/** Convite para ativar as notificações deste aparelho. Some quando já estão ativas. */
export function AvisoNotificacoes({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<EstadoPush | "verificando">("verificando");
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    verificarPush()
      .then(setEstado)
      .catch(() => setEstado("indisponivel"));
  }, []);

  if (estado === "verificando" || estado === "ativo" || estado === "indisponivel") return null;

  async function ativar() {
    setAtivando(true);
    setErro(null);
    try {
      setEstado(await ativarPush());
    } catch {
      setErro("Não foi possível ativar agora. Tente de novo em instantes.");
    } finally {
      setAtivando(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border border-trama bg-superficie p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-grafite">Notificações</p>
        <p className="text-sm text-linha">
          {estado === "precisa-instalar"
            ? "No iPhone, toque em Compartilhar e em Adicionar à Tela de Início. Depois abra o app por lá para ativar as notificações."
            : estado === "bloqueado"
              ? "As notificações estão bloqueadas neste navegador. Libere nas configurações do site para receber avisos."
              : texto}
        </p>
        {erro && (
          <p role="alert" className="mt-1 text-sm text-vermelho">
            {erro}
          </p>
        )}
      </div>
      {estado === "desativado" && (
        <button type="button" onClick={ativar} disabled={ativando} className={`${botao.secundario} shrink-0`}>
          {ativando ? "Ativando…" : "Ativar notificações"}
        </button>
      )}
    </div>
  );
}
