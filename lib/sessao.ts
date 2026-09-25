import "server-only";
import { cache } from "react";
import { carregarPerfil } from "./dados";
import { criarClienteServidor } from "./supabase/servidor";

/** Usuário logado e seu perfil, lidos uma vez por requisição. */
export const obterSessao = cache(async () => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const perfil = userId ? await carregarPerfil(supabase, userId) : null;
  return { supabase, userId, perfil };
});
