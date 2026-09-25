import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { obterSolicitacao } from "@/lib/dados";
import { formatarDuasCasas, formatarMetragem } from "@/lib/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";

interface Destino {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Envia notificação push sobre uma solicitação. Quem pode avisar quem é decidido no banco
// (calc_destinos_notificacao): o solicitador avisa os avaliadores; o avaliador avisa o solicitador.
export async function POST(request: NextRequest) {
  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const chavePrivada = process.env.VAPID_PRIVATE_KEY;
  if (!chavePublica || !chavePrivada) return NextResponse.json({ enviados: 0, motivo: "sem chaves" });

  const corpo = (await request.json().catch(() => null)) as { solicitacaoId?: string; evento?: string } | null;
  const evento = corpo?.evento;
  if (!corpo?.solicitacaoId || (evento !== "nova" && evento !== "resposta")) {
    return NextResponse.json({ erro: "Pedido inválido" }, { status: 400 });
  }

  const supabase = await criarClienteServidor();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const solicitacao = await obterSolicitacao(supabase, corpo.solicitacaoId);
  if (!solicitacao) return NextResponse.json({ enviados: 0 });

  const { data: destinos } = await supabase.rpc("calc_destinos_notificacao", {
    p_solicitacao: solicitacao.id,
    p_evento: evento,
  });
  const lista = (destinos ?? []) as Destino[];
  if (lista.length === 0) return NextResponse.json({ enviados: 0 });

  const preco = (v: number | null) => (v === null ? "sem valor sugerido" : `R$ ${formatarDuasCasas(v)}/m`);
  const mensagem =
    evento === "nova"
      ? {
          titulo: "Nova solicitação de preço",
          corpo: `${solicitacao.solicitante_nome || "Solicitação"}: produto ${solicitacao.codigo_produto}, ${formatarMetragem(solicitacao.metragem)} a ${preco(solicitacao.valor_solicitado)}`,
          url: `/solicitacoes/${solicitacao.id}`,
          tag: `solicitacao-${solicitacao.id}`,
        }
      : {
          titulo: solicitacao.status === "aprovada" ? "Preço aprovado" : "Contraproposta recebida",
          corpo: `Produto ${solicitacao.codigo_produto}: ${preco(solicitacao.preco_resposta)}`,
          url: "/minhas-solicitacoes",
          tag: `resposta-${solicitacao.id}`,
        };

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:suporte@usemiz.com", chavePublica, chavePrivada);
  const expirados: string[] = [];
  let enviados = 0;
  await Promise.all(
    lista.map(async (d) => {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify(mensagem),
          { TTL: 60 * 60 * 24 },
        );
        enviados++;
      } catch (erro) {
        const status = (erro as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expirados.push(d.endpoint);
      }
    }),
  );
  if (expirados.length) await supabase.rpc("calc_remover_inscricoes", { p_endpoints: expirados });

  return NextResponse.json({ enviados });
}
