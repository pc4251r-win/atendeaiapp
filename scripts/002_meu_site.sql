-- Atende Aí 360 · Módulo "Meu Site" (vitrine pública por empresa)
-- Executar após 001_atendeai_schema.sql. Idempotente.

create table if not exists public.sites_vitrine (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  publicado boolean not null default false,
  template text not null default 'minimalista' check (template in ('minimalista','vitrine','clinica','estetica','oficina','restaurante')),
  cor_destaque text not null default '#be5a76',
  modo_escuro boolean not null default false,
  logo_url text not null default '',
  banner_url text not null default '',
  og_image_url text not null default '',
  favicon_url text not null default '',
  headline text not null default '',
  subtitulo text not null default '',
  sobre text not null default '',
  endereco text not null default '',
  telefone text not null default '',
  whatsapp text not null default '',
  instagram text not null default '',
  facebook text not null default '',
  tiktok text not null default '',
  horario_funcionamento text not null default '',
  meta_title text not null default '',
  meta_description text not null default '',
  secoes_ativas jsonb not null default '{"sobre":true,"servicos":true,"galeria":true,"depoimentos":true,"contato":true,"mapa":true,"faq":false}',
  faq jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites_galeria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  imagem_url text not null,
  legenda text not null default '',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sites_depoimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome_cliente text not null,
  texto text not null,
  nota int not null default 5 check (nota between 1 and 5),
  foto_url text not null default '',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sites_visitas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  origem text not null default 'direto',
  acao text not null check (acao in ('visita','clique_whatsapp','clique_agendar','formulario_enviado')),
  created_at timestamptz not null default now()
);
create index if not exists sites_visitas_empresa_data on public.sites_visitas (empresa_id, created_at desc);

create table if not exists public.sites_formularios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  telefone text not null,
  mensagem text not null default '',
  servico_id uuid references public.catalogo(id) on delete set null,
  data_desejada date,
  horario text not null default '',
  status text not null default 'novo' check (status in ('novo','convertido')),
  created_at timestamptz not null default now()
);

-- RLS: o dono gerencia tudo; visitantes anônimos NÃO acessam as tabelas (só via funções abaixo)
do $$
declare t text;
begin
  foreach t in array array['sites_vitrine','sites_galeria','sites_depoimentos','sites_visitas','sites_formularios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_all on public.%I', t);
    execute format('create policy tenant_all on public.%I for all using (public.empresa_liberada(empresa_id)) with check (public.empresa_liberada(empresa_id))', t);
  end loop;
end $$;

-- Slug livre? (usado pelo editor; ignora o próprio site)
create or replace function public.slug_disponivel(p_slug text, p_site_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.sites_vitrine where slug = p_slug and (p_site_id is null or id <> p_site_id));
$$;

-- Dados públicos de uma vitrine publicada de empresa ativa
create or replace function public.vitrine_publica(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'empresa_id', e.id,
    'nome', e.nome,
    'segmento', e.segmento,
    'site', to_jsonb(s),
    'catalogo', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'tipo', c.tipo, 'preco', c.preco, 'duracao_minutos', c.duracao_minutos, 'descricao', c.descricao) order by c.nome)
                          from public.catalogo c where c.empresa_id = e.id and c.ativo), '[]'),
    'galeria', coalesce((select jsonb_agg(to_jsonb(g) order by g.ordem) from public.sites_galeria g where g.empresa_id = e.id), '[]'),
    'depoimentos', coalesce((select jsonb_agg(to_jsonb(d) order by d.ordem) from public.sites_depoimentos d where d.empresa_id = e.id), '[]')
  )
  from public.sites_vitrine s join public.empresas e on e.id = s.empresa_id
  where s.slug = p_slug and s.publicado and e.status = 'ativo';
$$;

-- Lista de slugs publicados (sitemap)
create or replace function public.vitrines_publicadas()
returns table (slug text, updated_at timestamptz) language sql stable security definer set search_path = public as $$
  select s.slug, s.updated_at from public.sites_vitrine s join public.empresas e on e.id = s.empresa_id where s.publicado and e.status = 'ativo';
$$;

-- Evento de analytics anônimo (visita / cliques)
create or replace function public.registrar_evento_site(p_slug text, p_acao text, p_origem text default 'direto')
returns void language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if p_acao not in ('visita','clique_whatsapp','clique_agendar') then raise exception 'acao invalida'; end if;
  select s.empresa_id into eid from public.sites_vitrine s join public.empresas e on e.id = s.empresa_id where s.slug = p_slug and s.publicado and e.status = 'ativo';
  if eid is null then return; end if;
  insert into public.sites_visitas (empresa_id, acao, origem) values (eid, p_acao, left(coalesce(nullif(p_origem, ''), 'direto'), 60));
end $$;

-- Formulário do site: registra o pedido, cria/atualiza o lead no CRM e abre o atendimento no Inbox (etapa captado)
create or replace function public.enviar_formulario_site(
  p_slug text, p_nome text, p_telefone text, p_mensagem text default '',
  p_servico_id uuid default null, p_data date default null, p_horario text default ''
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  eid uuid; servico record; at_id uuid; texto text; tel text := regexp_replace(p_telefone, '\D', '', 'g');
begin
  if length(trim(p_nome)) < 2 or length(tel) not between 10 and 13 then raise exception 'dados invalidos'; end if;
  select s.empresa_id into eid from public.sites_vitrine s join public.empresas e on e.id = s.empresa_id where s.slug = p_slug and s.publicado and e.status = 'ativo';
  if eid is null then raise exception 'site indisponivel'; end if;

  -- anti-spam: no máximo 3 envios do mesmo telefone por hora
  if (select count(*) from public.sites_formularios where empresa_id = eid and telefone = tel and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'limite de envios';
  end if;

  select id, nome, preco into servico from public.catalogo where id = p_servico_id and empresa_id = eid;

  insert into public.sites_formularios (empresa_id, nome, telefone, mensagem, servico_id, data_desejada, horario)
  values (eid, left(trim(p_nome), 80), tel, left(coalesce(p_mensagem, ''), 1000), servico.id, p_data, left(coalesce(p_horario, ''), 5));
  insert into public.sites_visitas (empresa_id, acao, origem) values (eid, 'formulario_enviado', 'site');

  texto := 'Olá! Vim pelo site.'
    || case when servico.nome is not null then ' Tenho interesse em ' || servico.nome || '.' else '' end
    || case when p_data is not null then ' Gostaria de agendar para ' || to_char(p_data, 'DD/MM/YYYY') || case when p_horario <> '' then ' às ' || p_horario else '' end || '.' else '' end
    || case when coalesce(p_mensagem, '') <> '' then ' ' || left(p_mensagem, 1000) else '' end;

  if not exists (select 1 from public.clientes_crm where empresa_id = eid and telefone = tel) then
    insert into public.clientes_crm (empresa_id, nome, telefone, tags, proxima_acao)
    values (eid, left(trim(p_nome), 80), tel, array['site'], coalesce('Retornar sobre ' || servico.nome, 'Retornar contato do site'));
  end if;

  select id into at_id from public.atendimentos where empresa_id = eid and cliente_telefone = tel and status <> 'finalizado' order by updated_at desc limit 1;
  if at_id is null then
    insert into public.atendimentos (empresa_id, cliente_nome, cliente_telefone, origem_campanha, etapa_funil, status, valor_estimado, ultima_mensagem)
    values (eid, left(trim(p_nome), 80), tel, 'site', 'captado', 'ia', coalesce(servico.preco, 0), texto)
    returning id into at_id;
  else
    update public.atendimentos set ultima_mensagem = texto, updated_at = now() where id = at_id;
  end if;
  insert into public.mensagens (atendimento_id, remetente, texto) values (at_id, 'cliente', texto);

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.vitrine_publica(text), public.vitrines_publicadas(), public.registrar_evento_site(text, text, text),
  public.enviar_formulario_site(text, text, text, text, uuid, date, text), public.slug_disponivel(text, uuid) from public;
grant execute on function public.vitrine_publica(text), public.vitrines_publicadas(), public.registrar_evento_site(text, text, text),
  public.enviar_formulario_site(text, text, text, text, uuid, date, text) to anon, authenticated;
grant execute on function public.slug_disponivel(text, uuid) to authenticated;
