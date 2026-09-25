"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CampoTexto } from "@/components/Campo";
import { botao } from "@/components/estilos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export function FormularioNovaSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirmacao) return setErro("As duas senhas não são iguais.");
    setSalvando(true);
    const supabase = criarClienteNavegador();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSalvando(false);
      return setErro("O link expirou. Peça um novo em Esqueci minha senha, na tela de login.");
    }
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      return setErro(
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da atual."
          : error.code === "weak_password"
            ? "Senha fraca. Use uma senha mais longa, com letras e números."
            : "Não foi possível salvar a senha. Tente de novo.",
      );
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} noValidate className="mt-8 flex flex-col gap-5">
      <CampoTexto rotulo="Nova senha" type="password" autoComplete="new-password" valor={senha} aoMudar={setSenha} />
      <CampoTexto
        rotulo="Repita a nova senha"
        type="password"
        autoComplete="new-password"
        valor={confirmacao}
        aoMudar={setConfirmacao}
      />
      {erro && <p role="alert" className="text-vermelho">{erro}</p>}
      <button type="submit" disabled={salvando} className={`${botao.principal} w-full`}>
        {salvando ? "Salvando…" : "Salvar senha"}
      </button>
      <Link href="/login" className={`${botao.texto} self-start`}>
        Voltar para o login
      </Link>
    </form>
  );
}
