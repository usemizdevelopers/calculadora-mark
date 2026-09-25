"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CampoTexto } from "@/components/Campo";
import { botao } from "@/components/estilos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

function traduzirErro(mensagem: string, codigo?: string): string {
  if (codigo === "invalid_credentials" || /invalid login credentials/i.test(mensagem)) {
    return "E-mail ou senha incorretos.";
  }
  if (codigo === "email_not_confirmed" || /email not confirmed/i.test(mensagem)) {
    return "Este e-mail ainda não foi confirmado. Confirme pelo link recebido por e-mail.";
  }
  if (codigo === "over_request_rate_limit" || codigo === "over_email_send_rate_limit" || /rate limit/i.test(mensagem)) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  }
  if (/fetch|network/i.test(mensagem)) {
    return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  }
  return "Não foi possível entrar. Tente de novo em instantes.";
}

export function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [modo, setModo] = useState<"entrar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(
    params.get("erro") === "link" ? "O link expirou ou já foi usado. Peça um novo em Esqueci minha senha." : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setEnviando(true);
    const { error } = await criarClienteNavegador().auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setErro(traduzirErro(error.message, error.code));
      setEnviando(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function recuperar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    if (!email.trim()) {
      setErro("Informe o e-mail da sua conta.");
      return;
    }
    setEnviando(true);
    const { error } = await criarClienteNavegador().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirmar?proximo=/redefinir-senha`,
    });
    setEnviando(false);
    if (error) {
      setErro(traduzirErro(error.message, error.code));
      return;
    }
    setAviso(`Se ${email.trim()} tiver uma conta, você vai receber um link para criar uma nova senha.`);
  }

  function trocarModo(novo: "entrar" | "recuperar") {
    setModo(novo);
    setErro(null);
    setAviso(null);
  }

  if (modo === "recuperar") {
    return (
      <form onSubmit={recuperar} noValidate className="mt-8 flex flex-col gap-5">
        <h2 className="text-lg font-semibold">Redefinir senha</h2>
        <CampoTexto
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          valor={email}
          aoMudar={setEmail}
        />
        {erro && <p role="alert" className="text-vermelho">{erro}</p>}
        {aviso && <p role="status" className="text-grafite">{aviso}</p>}
        <button type="submit" disabled={enviando} className={`${botao.principal} w-full`}>
          {enviando ? "Enviando…" : "Enviar link"}
        </button>
        <button type="button" onClick={() => trocarModo("entrar")} className={`${botao.texto} self-start`}>
          Voltar para o login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={entrar} noValidate className="mt-8 flex flex-col gap-5">
      <CampoTexto
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        valor={email}
        aoMudar={setEmail}
      />
      <CampoTexto
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        valor={senha}
        aoMudar={setSenha}
      />
      {erro && <p role="alert" className="text-vermelho">{erro}</p>}
      <button type="submit" disabled={enviando} className={`${botao.principal} w-full`}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
      <button type="button" onClick={() => trocarModo("recuperar")} className={`${botao.texto} self-start`}>
        Esqueci minha senha
      </button>
    </form>
  );
}
