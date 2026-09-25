-- Níveis de acesso, solicitações de preço e notificações push.
-- avaliador: calculadora, histórico, configurações e solicitações.
-- solicitador: cria solicitações e vê só as próprias respostas.

create table public.calc_perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('avaliador', 'solicitador')),
  whatsapp text check (whatsapp ~ '^[0-9]+$'),
  criado_em timestamptz not null default now()
);

-- Funções auxiliares fora do schema exposto pela API.
create schema if not exists calc_interno;
grant usage on schema calc_interno to authenticated;

create or replace function calc_interno.eh_avaliador()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.calc_perfis where user_id = (select auth.uid()) and papel = 'avaliador'
  );
$$;
revoke all on function calc_interno.eh_avaliador() from public;
grant execute on function calc_interno.eh_avaliador() to authenticated;

alter table public.calc_perfis enable row level security;
grant select on public.calc_perfis to authenticated;
create policy "Cada um le o proprio perfil; avaliador le todos" on public.calc_perfis
  for select to authenticated
  using (user_id = (select auth.uid()) or (select calc_interno.eh_avaliador()));

-- Configurações e preços aprovados passam a ser só do avaliador.
drop policy "Autenticados leem configuracoes" on public.calc_configuracoes;
drop policy "Autenticados alteram configuracoes" on public.calc_configuracoes;
drop policy "Autenticados leem precos" on public.calc_precos_aprovados;
drop policy "Autenticados inserem precos" on public.calc_precos_aprovados;
drop policy "Autenticados alteram precos" on public.calc_precos_aprovados;
drop policy "Autenticados excluem precos" on public.calc_precos_aprovados;

create policy "Avaliador le configuracoes" on public.calc_configuracoes
  for select to authenticated using ((select calc_interno.eh_avaliador()));
create policy "Avaliador altera configuracoes" on public.calc_configuracoes
  for update to authenticated using ((select calc_interno.eh_avaliador())) with check ((select calc_interno.eh_avaliador()));

create policy "Avaliador le precos" on public.calc_precos_aprovados
  for select to authenticated using ((select calc_interno.eh_avaliador()));
create policy "Avaliador insere precos" on public.calc_precos_aprovados
  for insert to authenticated with check ((select calc_interno.eh_avaliador()));
create policy "Avaliador altera precos" on public.calc_precos_aprovados
  for update to authenticated using ((select calc_interno.eh_avaliador())) with check ((select calc_interno.eh_avaliador()));
create policy "Avaliador exclui precos" on public.calc_precos_aprovados
  for delete to authenticated using ((select calc_interno.eh_avaliador()));

-- Solicitações
create table public.calc_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  solicitante_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  solicitante_nome text not null default '',
  codigo_produto text not null check (length(trim(codigo_produto)) > 0),
  estoque numeric not null check (estoque >= 0),
  quantidade_vendida numeric not null check (quantidade_vendida > 0),
  valor_vendido numeric not null check (valor_vendido > 0),
  metragem numeric not null check (metragem > 0),
  valor_solicitado numeric check (valor_solicitado > 0),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'contraproposta')),
  preco_resposta numeric check (preco_resposta > 0),
  observacao text,
  respondido_em timestamptz,
  respondido_por uuid references auth.users (id) on delete set null,
  preco_aprovado_id uuid references public.calc_precos_aprovados (id) on delete set null,
  whatsapp_enviado_em timestamptz,
  lido_em timestamptz,
  check (status = 'pendente' or (preco_resposta is not null and respondido_em is not null))
);

create index calc_solicitacoes_status_idx on public.calc_solicitacoes (status, criado_em desc);
create index calc_solicitacoes_solicitante_idx on public.calc_solicitacoes (solicitante_id, criado_em desc);
create index calc_solicitacoes_respondido_por_idx on public.calc_solicitacoes (respondido_por);
create index calc_solicitacoes_preco_aprovado_idx on public.calc_solicitacoes (preco_aprovado_id);

alter table public.calc_precos_aprovados
  add column solicitacao_id uuid references public.calc_solicitacoes (id) on delete set null;
create index calc_precos_aprovados_solicitacao_idx on public.calc_precos_aprovados (solicitacao_id);

-- Na criação, o banco fixa quem pediu e zera qualquer resposta enviada junto.
create or replace function calc_interno.preparar_solicitacao()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.solicitante_id := auth.uid();
  new.solicitante_nome := coalesce((select nome from public.calc_perfis where user_id = auth.uid()), '');
  new.criado_em := now();
  new.status := 'pendente';
  new.preco_resposta := null;
  new.observacao := null;
  new.respondido_em := null;
  new.respondido_por := null;
  new.preco_aprovado_id := null;
  new.whatsapp_enviado_em := null;
  new.lido_em := null;
  return new;
end;
$$;
revoke all on function calc_interno.preparar_solicitacao() from public;

create trigger calc_solicitacoes_preparar
  before insert on public.calc_solicitacoes
  for each row execute function calc_interno.preparar_solicitacao();

alter table public.calc_solicitacoes enable row level security;
grant select, insert, update, delete on public.calc_solicitacoes to authenticated;

create policy "Solicitador cria solicitacao" on public.calc_solicitacoes
  for insert to authenticated
  with check (exists (select 1 from public.calc_perfis where user_id = (select auth.uid()) and papel = 'solicitador'));
create policy "Solicitador ve as proprias; avaliador ve todas" on public.calc_solicitacoes
  for select to authenticated
  using (solicitante_id = (select auth.uid()) or (select calc_interno.eh_avaliador()));
create policy "Avaliador responde" on public.calc_solicitacoes
  for update to authenticated
  using ((select calc_interno.eh_avaliador())) with check ((select calc_interno.eh_avaliador()));
create policy "Avaliador exclui solicitacao" on public.calc_solicitacoes
  for delete to authenticated using ((select calc_interno.eh_avaliador()));

-- O solicitador só pode marcar as próprias respostas como lidas.
create or replace function public.calc_marcar_respostas_lidas()
returns void
language sql security definer set search_path = ''
as $$
  update public.calc_solicitacoes
     set lido_em = now()
   where solicitante_id = (select auth.uid()) and status <> 'pendente' and lido_em is null;
$$;
revoke all on function public.calc_marcar_respostas_lidas() from public, anon;
grant execute on function public.calc_marcar_respostas_lidas() to authenticated;

-- Notificações push
create table public.calc_push_inscricoes (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
create index calc_push_inscricoes_user_idx on public.calc_push_inscricoes (user_id);
alter table public.calc_push_inscricoes enable row level security;
grant select, delete on public.calc_push_inscricoes to authenticated;
create policy "Cada um ve as proprias inscricoes" on public.calc_push_inscricoes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Cada um remove as proprias inscricoes" on public.calc_push_inscricoes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Salva a inscrição do aparelho para o usuário atual (troca o dono se o aparelho mudou de conta).
create or replace function public.calc_salvar_inscricao(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.calc_push_inscricoes (endpoint, user_id, p256dh, auth)
  values (p_endpoint, (select auth.uid()), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, criado_em = now();
$$;
revoke all on function public.calc_salvar_inscricao(text, text, text) from public, anon;
grant execute on function public.calc_salvar_inscricao(text, text, text) to authenticated;

-- Para quem avisar sobre uma solicitação:
-- 'nova'     → só quem criou pode pedir; avisa os avaliadores.
-- 'resposta' → só avaliador pode pedir; avisa quem criou.
create or replace function public.calc_destinos_notificacao(p_solicitacao uuid, p_evento text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.calc_solicitacoes;
begin
  select * into s from public.calc_solicitacoes where id = p_solicitacao;
  if not found then
    return;
  end if;
  if p_evento = 'nova' and s.solicitante_id = (select auth.uid()) then
    return query
      select i.endpoint, i.p256dh, i.auth
        from public.calc_push_inscricoes i
        join public.calc_perfis p on p.user_id = i.user_id
       where p.papel = 'avaliador';
  elsif p_evento = 'resposta' and calc_interno.eh_avaliador() then
    return query
      select i.endpoint, i.p256dh, i.auth
        from public.calc_push_inscricoes i
       where i.user_id = s.solicitante_id;
  end if;
end;
$$;
revoke all on function public.calc_destinos_notificacao(uuid, text) from public, anon;
grant execute on function public.calc_destinos_notificacao(uuid, text) to authenticated;

-- Remove inscrições que o serviço de push informou como expiradas.
create or replace function public.calc_remover_inscricoes(p_endpoints text[])
returns void
language sql security definer set search_path = ''
as $$
  delete from public.calc_push_inscricoes where endpoint = any (p_endpoints);
$$;
revoke all on function public.calc_remover_inscricoes(text[]) from public, anon;
grant execute on function public.calc_remover_inscricoes(text[]) to authenticated;
