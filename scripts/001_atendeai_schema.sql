-- AtendeAI 360 · Schema multi-tenant com RLS
-- Execute no SQL Editor do Supabase. Idempotente: pode ser executado novamente.
-- Depois de criar sua conta, promova-se a Super Admin:
--   update public.perfis set role = 'super_admin' where email = 'seu@email.com';

create extension if not exists "pgcrypto";

-- ============ EMPRESAS (tenants) ============
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text not null default '',
  plano text not null default 'starter' check (plano in ('starter','pro','enterprise')),
  status text not null default 'pendente' check (status in ('pendente','ativo','suspenso')),
  segmento text not null default 'Serviços',
  chave_pix text not null default '',
  limite_funcionarios int not null default 2,
  limite_mensagens_ia int not null default 2000,
  matriz_id uuid references public.empresas(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.perfis (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  email text not null,
  role text not null default 'funcionario' check (role in ('super_admin','empresa','funcionario')),
  modulos text[],
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ Helpers (security definer evitam recursão no RLS) ============
create or replace function public.current_empresa_id() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from public.perfis where auth_user_id = auth.uid() and ativo limit 1
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.perfis where auth_user_id = auth.uid() and role = 'super_admin' and ativo)
$$;

create or replace function public.is_empresa_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.perfis where auth_user_id = auth.uid() and role in ('empresa','super_admin') and ativo)
$$;

-- Empresa só acessa dados se estiver ativa (ou se for Super Admin)
create or replace function public.empresa_liberada(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_super_admin()
      or (eid = public.current_empresa_id()
          and exists(select 1 from public.empresas where id = eid and status = 'ativo'))
$$;

-- ============ Tabelas operacionais ============
create table if not exists public.funcionarios_ia (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  funcao text not null check (funcao in ('atendimento','vendas','agendamento','campanha','pos_venda','suporte')),
  titulo_cargo text not null default '',
  tom_voz text not null default 'consultivo' check (tom_voz in ('informal','formal','empatico','consultivo')),
  instrucoes_especificas text not null default '',
  meta_principal text not null default '',
  permissoes text[] not null default '{}',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.catalogo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('servico','produto')),
  preco numeric(12,2) not null default 0,
  duracao_minutos int not null default 0,
  dias_retorno_pos_venda int not null default 30,
  descricao text not null default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.campanhas_divulgacao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  titulo text not null,
  canal text not null,
  catalogo_id uuid references public.catalogo(id) on delete set null,
  funcionario_ia_id uuid references public.funcionarios_ia(id) on delete set null,
  desconto_oferta numeric not null default 0,
  copy_anuncio text not null default '',
  link_rastreavel text not null default '',
  status text not null default 'ativa',
  cliques int not null default 0,
  leads_gerados int not null default 0,
  vendas_geradas int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_nome text not null,
  cliente_telefone text not null,
  origem_campanha text not null default '',
  etapa_funil text not null default 'captado',
  status text not null default 'ia' check (status in ('ia','humano','finalizado')),
  valor_estimado numeric(12,2) not null default 0,
  ultima_mensagem text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos(id) on delete cascade,
  remetente text not null check (remetente in ('cliente','ia','humano')),
  texto text not null,
  midia_url text,
  created_at timestamptz not null default now()
);
create index if not exists mensagens_atendimento_idx on public.mensagens(atendimento_id, created_at);

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_nome text not null,
  cliente_telefone text not null,
  servico_nome text not null,
  valor numeric(12,2) not null default 0,
  data date not null,
  horario text not null,
  status text not null default 'confirmado' check (status in ('confirmado','pendente','concluido','no_show','cancelado')),
  pagamento_status text not null default 'pendente',
  created_at timestamptz not null default now()
);

create table if not exists public.vendas_pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  atendimento_id uuid references public.atendimentos(id) on delete set null,
  cliente_nome text not null,
  cliente_telefone text not null,
  item_nome text not null,
  valor numeric(12,2) not null,
  metodo text not null default 'pix',
  codigo_pix text not null default '',
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

create table if not exists public.pos_venda_automacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_nome text not null,
  cliente_telefone text not null,
  item_comprado text not null,
  tipo_acao text not null,
  mensagem_enviada text not null default '',
  nota_nps int,
  data_programada date not null,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conexoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id) on delete cascade,
  api_provider text not null default 'evolution_api',
  instance_name text not null,
  display_phone_number text not null default '',
  status text not null default 'desconectado',
  qr_code_base64 text not null default '',
  auto_resposta_ia boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.clientes_crm (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  telefone text not null,
  email text not null default '',
  aniversario text,
  preferencias text not null default '',
  tags text[] not null default '{}',
  ltv numeric(12,2) not null default 0,
  score_lead int not null default 0,
  ultima_compra timestamptz,
  ultima_interacao timestamptz not null default now(),
  proxima_acao text not null default '',
  opt_in boolean not null default true,
  opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  unique (empresa_id, telefone)
);

create table if not exists public.base_conhecimento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  categoria text not null check (categoria in ('faq','horarios','regras','politicas','produto')),
  titulo text not null,
  conteudo text not null,
  origem text not null default 'manual' check (origem in ('manual','aprendido')),
  status text not null default 'ativo' check (status in ('ativo','sugerido')),
  created_at timestamptz not null default now()
);

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ator text not null check (ator in ('ia','usuario','sistema')),
  ator_nome text not null default '',
  acao text not null,
  detalhe text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists auditoria_empresa_idx on public.auditoria(empresa_id, created_at desc);

-- Tokens de integração NUNCA ficam aqui: ficam em variáveis de ambiente do servidor.
create table if not exists public.integracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  provedor text not null,
  categoria text not null,
  status text not null default 'desconectado',
  config jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (empresa_id, provedor)
);

-- ============ RLS ============
alter table public.empresas enable row level security;
alter table public.perfis enable row level security;

drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas for select
  using (id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists empresas_update on public.empresas;
create policy empresas_update on public.empresas for update
  using ((id = public.current_empresa_id() and public.is_empresa_admin()) or public.is_super_admin());
drop policy if exists empresas_delete on public.empresas;
create policy empresas_delete on public.empresas for delete using (public.is_super_admin());

drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis for select
  using (auth_user_id = auth.uid() or empresa_id = public.current_empresa_id() or public.is_super_admin());
drop policy if exists perfis_write on public.perfis;
create policy perfis_write on public.perfis for all
  using ((empresa_id = public.current_empresa_id() and public.is_empresa_admin()) or public.is_super_admin())
  with check ((empresa_id = public.current_empresa_id() and public.is_empresa_admin()) or public.is_super_admin());

do $$
declare t text;
begin
  foreach t in array array['funcionarios_ia','catalogo','campanhas_divulgacao','atendimentos','agendamentos',
    'vendas_pagamentos','pos_venda_automacoes','whatsapp_conexoes','clientes_crm','base_conhecimento','auditoria','integracoes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_all on public.%I', t);
    execute format('create policy tenant_all on public.%I for all using (public.empresa_liberada(empresa_id)) with check (public.empresa_liberada(empresa_id))', t);
  end loop;
end $$;

alter table public.mensagens enable row level security;
drop policy if exists tenant_all on public.mensagens;
create policy tenant_all on public.mensagens for all
  using (exists(select 1 from public.atendimentos a where a.id = atendimento_id and public.empresa_liberada(a.empresa_id)))
  with check (exists(select 1 from public.atendimentos a where a.id = atendimento_id and public.empresa_liberada(a.empresa_id)));

-- Auditoria é imutável para usuários: sem update/delete
drop policy if exists tenant_all on public.auditoria;
drop policy if exists auditoria_select on public.auditoria;
drop policy if exists auditoria_insert on public.auditoria;
create policy auditoria_select on public.auditoria for select using (public.empresa_liberada(empresa_id));
create policy auditoria_insert on public.auditoria for insert with check (public.empresa_liberada(empresa_id));

-- ============ Guardas contra escalonamento de privilégio ============
create or replace function public.guard_empresa_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() and auth.uid() is not null then
    new.status := old.status;
    new.plano := old.plano;
    new.limite_funcionarios := old.limite_funcionarios;
    new.limite_mensagens_ia := old.limite_mensagens_ia;
    new.matriz_id := old.matriz_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_empresa on public.empresas;
create trigger trg_guard_empresa before update on public.empresas
  for each row execute function public.guard_empresa_update();

create or replace function public.guard_perfil_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'super_admin' and not public.is_super_admin() and auth.uid() is not null then
    raise exception 'Somente Super Admin pode conceder o papel super_admin';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_perfil on public.perfis;
create trigger trg_guard_perfil before insert or update on public.perfis
  for each row execute function public.guard_perfil_role();

-- ============ Cadastro: cria empresa PENDENTE + perfil admin ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nova_empresa uuid;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.empresas (nome, cnpj, segmento, chave_pix, status)
  values (
    coalesce(nullif(meta->>'empresa_nome',''), 'Minha Empresa'),
    coalesce(meta->>'cnpj', ''),
    coalesce(nullif(meta->>'segmento',''), 'Serviços'),
    new.email,
    'pendente'
  ) returning id into nova_empresa;

  insert into public.perfis (auth_user_id, empresa_id, nome, email, role)
  values (new.id, nova_empresa, coalesce(nullif(meta->>'nome',''), split_part(new.email,'@',1)), new.email, 'empresa');

  insert into public.whatsapp_conexoes (empresa_id, instance_name)
  values (nova_empresa, 'atd-' || replace(nova_empresa::text, '-', ''));

  insert into public.auditoria (empresa_id, ator, ator_nome, acao, detalhe)
  values (nova_empresa, 'sistema', 'AtendeAI', 'Conta criada', 'Aguardando aprovação do Super Admin');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Realtime para o Inbox
do $$ begin
  alter publication supabase_realtime add table public.mensagens, public.atendimentos;
exception when others then null;
end $$;
