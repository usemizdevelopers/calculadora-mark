import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Recebe o link do e-mail de redefinição de senha e abre a sessão.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const proximo = searchParams.get("proximo") ?? "/";
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/";
  const supabase = await criarClienteServidor();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      : { error: new Error("Link sem código") };

  if (error) return NextResponse.redirect(`${origin}/login?erro=link`);
  return NextResponse.redirect(`${origin}${destino}`);
}
