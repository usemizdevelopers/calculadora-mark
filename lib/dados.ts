// Acesso às tabelas do Supabase e conversão entre linhas e tipos do app.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Faixa, ParametrosCalculo } from "./calculos";
import type { StatusSolicitacao } from "./solicitacoes";

export const TABELA_CONFIGURACOES = "calc_configuracoes";
export const TABELA_PRECOS = "calc_precos_aprovados";
export const TABELA_PERFIS = "calc_perfis";
export const TABELA_SOLICITACOES = "calc_solicitacoes";

export interface Configuracoes extends ParametrosCalculo {
  whatsappNome: string;
  whatsappNumero: string;
}

export const CONFIGURACOES_PADRAO: Configuracoes = {
  custoOperacional: 23,
  faixaVermelho: 10,
  faixaLaranja: 15,
  faixaAmarelo: 20,
  whatsappNome: "Samuel",
  whatsappNumero: "5531984837807",
};

interface LinhaConfiguracoes {
  custo_operacional: number | string;
  faixa_vermelho: number | string;
  faixa_laranja: number | string;
  faixa_amarelo: number | string;
  whatsapp_nome: string;
  whatsapp_numero: string;
}

function linhaParaConfiguracoes(l: LinhaConfiguracoes): Configuracoes {
  return {
    custoOperacional: Number(l.custo_operacional),
    faixaVermelho: Number(l.faixa_vermelho),
    faixaLaranja: Number(l.faixa_laranja),
    faixaAmarelo: Number(l.faixa_amarelo),
    whatsappNome: l.whatsapp_nome,
    whatsappNumero: l.whatsapp_numero,
  };
}

export async function carregarConfiguracoes(supabase: SupabaseClient): Promise<Configuracoes> {
  const { data, error } = await supabase
    .from(TABELA_CONFIGURACOES)
    .select("custo_operacional, faixa_vermelho, faixa_laranja, faixa_amarelo, whatsapp_nome, whatsapp_numero")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return CONFIGURACOES_PADRAO;
  return linhaParaConfiguracoes(data);
}

export async function salvarConfiguracoes(supabase: SupabaseClient, c: Configuracoes) {
  const { error } = await supabase
    .from(TABELA_CONFIGURACOES)
    .update({
      custo_operacional: c.custoOperacional,
      faixa_vermelho: c.faixaVermelho,
      faixa_laranja: c.faixaLaranja,
      faixa_amarelo: c.faixaAmarelo,
      whatsapp_nome: c.whatsappNome,
      whatsapp_numero: c.whatsappNumero,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;
}

/** Registro salvo de um preço aprovado, com todos os números da época. */
export interface PrecoAprovado {
  id: string;
  criado_em: string;
  codigo_produto: string;
  custo_operacional: number;
  faixa_vermelho: number;
  faixa_laranja: number;
  faixa_amarelo: number;
  estoque: number;
  quantidade_vendida: number;
  valor_vendido: number;
  custo_metro: number;
  preco_medio: number;
  preco_medio_liquido: number;
  lucro_liquido_metro: number;
  margem_produto: number;
  lucro_total_analise: number;
  metragem_negociada: number;
  preco_negociado_m: number;
  preco_liquido_negociado: number;
  lucro_metro_negociado: number;
  margem_negociacao: number;
  receita_negociacao: number;
  lucro_total_negociacao: number;
  nova_margem_media: number;
  saldo_estoque: number;
  faixa: Faixa;
  whatsapp_nome: string;
  whatsapp_numero: string;
  whatsapp_enviado_em: string | null;
  solicitacao_id: string | null;
}

export type NovoPrecoAprovado = Omit<PrecoAprovado, "id" | "criado_em" | "whatsapp_enviado_em" | "solicitacao_id"> & {
  solicitacao_id?: string | null;
};

const CAMPOS_NUMERICOS = [
  "custo_operacional",
  "faixa_vermelho",
  "faixa_laranja",
  "faixa_amarelo",
  "estoque",
  "quantidade_vendida",
  "valor_vendido",
  "custo_metro",
  "preco_medio",
  "preco_medio_liquido",
  "lucro_liquido_metro",
  "margem_produto",
  "lucro_total_analise",
  "metragem_negociada",
  "preco_negociado_m",
  "preco_liquido_negociado",
  "lucro_metro_negociado",
  "margem_negociacao",
  "receita_negociacao",
  "lucro_total_negociacao",
  "nova_margem_media",
  "saldo_estoque",
] as const;

function normalizar(linha: Record<string, unknown>): PrecoAprovado {
  const r = { ...linha } as Record<string, unknown>;
  for (const campo of CAMPOS_NUMERICOS) r[campo] = Number(r[campo]);
  return r as unknown as PrecoAprovado;
}

export async function inserirPrecoAprovado(
  supabase: SupabaseClient,
  registro: NovoPrecoAprovado,
): Promise<PrecoAprovado> {
  const { data, error } = await supabase.from(TABELA_PRECOS).insert(registro).select().single();
  if (error) throw error;
  return normalizar(data);
}

/** Registra o envio com a data e o destinatário usados. */
export async function marcarWhatsAppEnviado(
  supabase: SupabaseClient,
  id: string,
  destinatario: { nome: string; numero: string },
): Promise<string> {
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from(TABELA_PRECOS)
    .update({ whatsapp_enviado_em: agora, whatsapp_nome: destinatario.nome, whatsapp_numero: destinatario.numero })
    .eq("id", id);
  if (error) throw error;
  return agora;
}

export async function excluirPrecoAprovado(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from(TABELA_PRECOS).delete().eq("id", id);
  if (error) throw error;
}

export const TAMANHO_PAGINA = 30;

export interface FiltroHistorico {
  codigo: string;
  /** AAAA-MM-DD */
  de: string;
  /** AAAA-MM-DD */
  ate: string;
}

export async function listarPrecosAprovados(
  supabase: SupabaseClient,
  filtro: FiltroHistorico,
  pagina: number,
): Promise<{ itens: PrecoAprovado[]; temMais: boolean }> {
  const inicio = pagina * TAMANHO_PAGINA;
  let consulta = supabase
    .from(TABELA_PRECOS)
    .select("*")
    .order("criado_em", { ascending: false })
    .range(inicio, inicio + TAMANHO_PAGINA);

  const codigo = filtro.codigo.trim();
  if (codigo) consulta = consulta.ilike("codigo_produto", `%${codigo.replace(/[%_\\]/g, "\\$&")}%`);
  // Datas no horário de Brasília (UTC−3, sem horário de verão).
  if (filtro.de) consulta = consulta.gte("criado_em", `${filtro.de}T00:00:00-03:00`);
  if (filtro.ate) consulta = consulta.lte("criado_em", `${filtro.ate}T23:59:59.999-03:00`);

  const { data, error } = await consulta;
  if (error) throw error;
  const linhas = (data ?? []).map(normalizar);
  return {
    itens: linhas.slice(0, TAMANHO_PAGINA),
    temMais: linhas.length > TAMANHO_PAGINA,
  };
}

/** Explica em português por que uma operação no banco falhou. */
export function descreverErro(erro: unknown, acao: string): string {
  const e = (erro ?? {}) as { message?: string; code?: string };
  const mensagem = e.message ?? "";
  if (erro instanceof TypeError || /fetch|network|load failed/i.test(mensagem)) {
    return `${acao} Sem conexão com o servidor. Verifique a internet e tente de novo.`;
  }
  if (e.code === "PGRST301" || e.code === "PGRST303" || /jwt/i.test(mensagem)) {
    return `${acao} Sua sessão expirou. Saia, entre de novo e repita.`;
  }
  if (e.code === "42501") {
    return `${acao} O banco recusou por falta de permissão. Avise o suporte.`;
  }
  return `${acao} O banco recusou a operação${mensagem ? ` (${mensagem})` : ""}. Tente de novo ou avise o suporte.`;
}

// Perfis e níveis de acesso

export type Papel = "avaliador" | "solicitador";

export interface Perfil {
  userId: string;
  nome: string;
  papel: Papel;
  whatsapp: string | null;
}

export async function carregarPerfil(supabase: SupabaseClient, userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from(TABELA_PERFIS)
    .select("user_id, nome, papel, whatsapp")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return { userId: data.user_id, nome: data.nome, papel: data.papel, whatsapp: data.whatsapp };
}

export async function carregarWhatsAppDoPerfil(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from(TABELA_PERFIS).select("whatsapp").eq("user_id", userId).maybeSingle();
  return data?.whatsapp ?? null;
}

// Solicitações

export interface Solicitacao {
  id: string;
  criado_em: string;
  solicitante_id: string;
  solicitante_nome: string;
  codigo_produto: string;
  estoque: number;
  quantidade_vendida: number;
  valor_vendido: number;
  metragem: number;
  valor_solicitado: number | null;
  status: StatusSolicitacao;
  preco_resposta: number | null;
  observacao: string | null;
  respondido_em: string | null;
  preco_aprovado_id: string | null;
  whatsapp_enviado_em: string | null;
  lido_em: string | null;
}

export type NovaSolicitacao = Pick<
  Solicitacao,
  "codigo_produto" | "estoque" | "quantidade_vendida" | "valor_vendido" | "metragem" | "valor_solicitado"
>;

const CAMPOS_SOLICITACAO =
  "id, criado_em, solicitante_id, solicitante_nome, codigo_produto, estoque, quantidade_vendida, valor_vendido, metragem, valor_solicitado, status, preco_resposta, observacao, respondido_em, preco_aprovado_id, whatsapp_enviado_em, lido_em";

function normalizarSolicitacao(l: Record<string, unknown>): Solicitacao {
  const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...(l as unknown as Solicitacao),
    estoque: Number(l.estoque),
    quantidade_vendida: Number(l.quantidade_vendida),
    valor_vendido: Number(l.valor_vendido),
    metragem: Number(l.metragem),
    valor_solicitado: numero(l.valor_solicitado),
    preco_resposta: numero(l.preco_resposta),
  };
}

export async function criarSolicitacao(supabase: SupabaseClient, nova: NovaSolicitacao): Promise<Solicitacao> {
  const { data, error } = await supabase.from(TABELA_SOLICITACOES).insert(nova).select(CAMPOS_SOLICITACAO).single();
  if (error) throw error;
  return normalizarSolicitacao(data);
}

export async function obterSolicitacao(supabase: SupabaseClient, id: string): Promise<Solicitacao | null> {
  const { data, error } = await supabase.from(TABELA_SOLICITACOES).select(CAMPOS_SOLICITACAO).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return normalizarSolicitacao(data);
}

/** Pendentes (mais antigas primeiro) ou respondidas (mais recentes primeiro). */
export async function listarSolicitacoes(
  supabase: SupabaseClient,
  situacao: "pendentes" | "respondidas" | "todas",
  pagina: number,
): Promise<{ itens: Solicitacao[]; temMais: boolean }> {
  const inicio = pagina * TAMANHO_PAGINA;
  let consulta = supabase.from(TABELA_SOLICITACOES).select(CAMPOS_SOLICITACAO);
  if (situacao === "pendentes") consulta = consulta.eq("status", "pendente").order("criado_em", { ascending: true });
  else if (situacao === "respondidas") consulta = consulta.neq("status", "pendente").order("respondido_em", { ascending: false });
  else consulta = consulta.order("criado_em", { ascending: false });
  const { data, error } = await consulta.range(inicio, inicio + TAMANHO_PAGINA);
  if (error) throw error;
  const linhas = (data ?? []).map(normalizarSolicitacao);
  return { itens: linhas.slice(0, TAMANHO_PAGINA), temMais: linhas.length > TAMANHO_PAGINA };
}

export async function contarPendentes(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from(TABELA_SOLICITACOES)
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente");
  return count ?? 0;
}

export async function contarRespostasNaoLidas(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from(TABELA_SOLICITACOES)
    .select("id", { count: "exact", head: true })
    .eq("solicitante_id", userId)
    .neq("status", "pendente")
    .is("lido_em", null);
  return count ?? 0;
}

export async function marcarRespostasLidas(supabase: SupabaseClient) {
  await supabase.rpc("calc_marcar_respostas_lidas");
}

export async function responderSolicitacao(
  supabase: SupabaseClient,
  id: string,
  resposta: {
    status: "aprovada" | "contraproposta";
    precoResposta: number;
    observacao: string | null;
    precoAprovadoId: string | null;
    respondidoPor: string;
  },
): Promise<Solicitacao> {
  const { data, error } = await supabase
    .from(TABELA_SOLICITACOES)
    .update({
      status: resposta.status,
      preco_resposta: resposta.precoResposta,
      observacao: resposta.observacao,
      preco_aprovado_id: resposta.precoAprovadoId,
      respondido_por: resposta.respondidoPor,
      respondido_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pendente")
    .select(CAMPOS_SOLICITACAO)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Esta solicitação já foi respondida.");
  return normalizarSolicitacao(data);
}

export async function marcarSolicitacaoWhatsApp(supabase: SupabaseClient, id: string): Promise<string> {
  const agora = new Date().toISOString();
  const { error } = await supabase.from(TABELA_SOLICITACOES).update({ whatsapp_enviado_em: agora }).eq("id", id);
  if (error) throw error;
  return agora;
}

export async function excluirSolicitacao(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from(TABELA_SOLICITACOES).delete().eq("id", id);
  if (error) throw error;
}
