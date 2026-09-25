-- Calculadora de preços especiais: configurações e preços aprovados.
-- Sistema de uso único: qualquer usuário autenticado pode ler e alterar tudo.

create table public.calc_configuracoes (
  id smallint primary key default 1 check (id = 1),
  custo_operacional numeric not null default 23 check (custo_operacional >= 0 and custo_operacional < 100),
  faixa_vermelho numeric not null default 10,
  faixa_laranja numeric not null default 15,
  faixa_amarelo numeric not null default 20,
  whatsapp_nome text not null default 'Samuel',
  whatsapp_numero text not null default '5531984837807' check (whatsapp_numero ~ '^[0-9]+$'),
  atualizado_em timestamptz not null default now(),
  check (faixa_vermelho < faixa_laranja and faixa_laranja < faixa_amarelo),
  check (faixa_amarelo < 100 - custo_operacional)
);

insert into public.calc_configuracoes (id) values (1);

create table public.calc_precos_aprovados (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  codigo_produto text not null check (length(trim(codigo_produto)) > 0),

  -- Configurações usadas na época
  custo_operacional numeric not null,
  faixa_vermelho numeric not null,
  faixa_laranja numeric not null,
  faixa_amarelo numeric not null,

  -- Análise do produto (entradas)
  estoque numeric not null check (estoque >= 0),
  quantidade_vendida numeric not null check (quantidade_vendida > 0),
  valor_vendido numeric not null check (valor_vendido > 0),
  custo_metro numeric not null check (custo_metro >= 0),

  -- Análise do produto (resultados; margens em fração, ex.: 0.27)
  preco_medio numeric not null,
  preco_medio_liquido numeric not null,
  lucro_liquido_metro numeric not null,
  margem_produto numeric not null,
  lucro_total_analise numeric not null,

  -- Simulação (entradas)
  metragem_negociada numeric not null check (metragem_negociada > 0),
  preco_negociado_m numeric not null check (preco_negociado_m > 0),

  -- Simulação (resultados)
  preco_liquido_negociado numeric not null,
  lucro_metro_negociado numeric not null,
  margem_negociacao numeric not null,
  receita_negociacao numeric not null,
  lucro_total_negociacao numeric not null,
  nova_margem_media numeric not null,
  saldo_estoque numeric not null,
  faixa text not null check (faixa in ('vermelho', 'laranja', 'amarelo', 'verde')),

  -- WhatsApp
  whatsapp_nome text not null,
  whatsapp_numero text not null,
  whatsapp_enviado_em timestamptz
);

create index calc_precos_aprovados_criado_em_idx on public.calc_precos_aprovados (criado_em desc);
create index calc_precos_aprovados_codigo_idx on public.calc_precos_aprovados (codigo_produto);
create index calc_precos_aprovados_criado_por_idx on public.calc_precos_aprovados (criado_por);

alter table public.calc_configuracoes enable row level security;
alter table public.calc_precos_aprovados enable row level security;

create policy "Autenticados leem configuracoes" on public.calc_configuracoes
  for select to authenticated using (true);
create policy "Autenticados alteram configuracoes" on public.calc_configuracoes
  for update to authenticated using (true) with check (true);

create policy "Autenticados leem precos" on public.calc_precos_aprovados
  for select to authenticated using (true);
create policy "Autenticados inserem precos" on public.calc_precos_aprovados
  for insert to authenticated with check (true);
create policy "Autenticados alteram precos" on public.calc_precos_aprovados
  for update to authenticated using (true) with check (true);
create policy "Autenticados excluem precos" on public.calc_precos_aprovados
  for delete to authenticated using (true);
