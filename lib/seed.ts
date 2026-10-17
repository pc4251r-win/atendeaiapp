import type { DB, ConfigLocal } from './types'
import { uid, isoDate, addDays } from './format'
import { gerarPixCopiaECola } from './pix'

export const DEFAULT_CONFIG: ConfigLocal = {
  recebedor_nome: 'Studio Bella Forma',
  recebedor_cidade: 'Sao Paulo',
  tipo_chave: 'cnpj',
  google_link: 'https://g.page/r/studio-bella-forma/review',
  mensagem_nps:
    'Oi {nome}! Como foi sua experiência com {item}? De 0 a 10, qual nota você daria para a gente?',
  cupom_fidelidade: 'VOLTEI15',
  desconto_cupom: 15,
  regua_automatica: true,
}

export function createSeed(): { db: DB; empresaId: string } {
  const now = new Date()
  const ts = (daysAgo: number, h = 10) => {
    const d = addDays(now, -daysAgo)
    d.setHours(h, 0, 0, 0)
    return d.toISOString()
  }

  const empresaId = uid()
  const outra1 = uid()
  const outra2 = uid()
  const outra3 = uid()

  const empresas: DB['empresas'] = [
    {
      id: empresaId,
      nome: 'Studio Bella Forma',
      cnpj: '12.345.678/0001-90',
      plano: 'enterprise',
      status: 'ativo',
      segmento: 'Estética e Beleza',
      chave_pix: '12345678000190',
      limite_funcionarios: 10,
      limite_mensagens_ia: 20000,
      matriz_id: null,
      created_at: ts(120),
    },
    {
      id: outra1,
      nome: 'Clínica Sorriso Pleno',
      cnpj: '22.111.333/0001-44',
      plano: 'pro',
      status: 'ativo',
      segmento: 'Odontologia',
      chave_pix: 'financeiro@sorrisopleno.com.br',
      limite_funcionarios: 5,
      limite_mensagens_ia: 8000,
      matriz_id: null,
      created_at: ts(80),
    },
    {
      id: outra2,
      nome: 'Barbearia Navalha de Ouro',
      cnpj: '33.444.555/0001-66',
      plano: 'starter',
      status: 'ativo',
      segmento: 'Barbearia',
      chave_pix: '11988887777',
      limite_funcionarios: 2,
      limite_mensagens_ia: 2000,
      matriz_id: null,
      created_at: ts(45),
    },
    {
      id: outra3,
      nome: 'PetLove Banho & Tosa',
      cnpj: '44.555.666/0001-77',
      plano: 'pro',
      status: 'suspenso',
      segmento: 'Pet Shop',
      chave_pix: 'pix@petlove.com',
      limite_funcionarios: 5,
      limite_mensagens_ia: 8000,
      matriz_id: null,
      created_at: ts(30),
    },
  ]

  const perfis: DB['perfis'] = [
    { id: uid(), auth_user_id: null, empresa_id: empresaId, nome: 'Juliana Martins', email: 'juliana@bellaforma.com.br', role: 'empresa', modulos: null, ativo: true, created_at: ts(120) },
    { id: uid(), auth_user_id: null, empresa_id: empresaId, nome: 'Rafael Souza', email: 'rafael@bellaforma.com.br', role: 'funcionario', modulos: null, ativo: true, created_at: ts(60) },
    { id: uid(), auth_user_id: null, empresa_id: empresaId, nome: 'Camila Rocha', email: 'camila@bellaforma.com.br', role: 'funcionario', modulos: null, ativo: false, created_at: ts(20) },
    { id: uid(), auth_user_id: null, empresa_id: empresaId, nome: 'Admin AtendeAI', email: 'master@atendeai360.com', role: 'super_admin', modulos: null, ativo: true, created_at: ts(200) },
  ]

  const fCapt = uid()
  const fVend = uid()
  const fAgen = uid()
  const fPos = uid()
  const funcionarios_ia: DB['funcionarios_ia'] = [
    { id: fCapt, empresa_id: empresaId, nome: 'Luna', funcao: 'campanha', titulo_cargo: 'SDR de Campanhas', tom_voz: 'empatico', instrucoes_especificas: 'Cumprimente pelo nome, apresente a oferta da campanha e pergunte qual o melhor dia para o cliente.', meta_principal: 'Converter lead em conversa qualificada', permissoes: ['enviar_pix', 'agendar', 'transferir_humano'], ativo: true, created_at: ts(100) },
    { id: fVend, empresa_id: empresaId, nome: 'Theo', funcao: 'vendas', titulo_cargo: 'Closer de Vendas', tom_voz: 'consultivo', instrucoes_especificas: 'Apresente preços reais do catálogo, contorne objeções com benefícios e envie PIX quando o cliente confirmar.', meta_principal: 'Fechar venda com pagamento PIX', permissoes: ['enviar_pix', 'agendar', 'transferir_humano'], ativo: true, created_at: ts(100) },
    { id: fAgen, empresa_id: empresaId, nome: 'Bia', funcao: 'agendamento', titulo_cargo: 'Secretária Virtual', tom_voz: 'formal', instrucoes_especificas: 'Ofereça no máximo 3 horários livres e confirme data e hora com o cliente.', meta_principal: 'Agendar horário confirmado', permissoes: ['enviar_pix', 'agendar', 'transferir_humano'], ativo: true, created_at: ts(90) },
    { id: fPos, empresa_id: empresaId, nome: 'Nina', funcao: 'pos_venda', titulo_cargo: 'Customer Success', tom_voz: 'informal', instrucoes_especificas: 'Peça nota NPS, envie link do Google para notas 9 e 10 e ofereça cupom de retorno.', meta_principal: 'Gerar avaliação 5 estrelas e recompra', permissoes: ['enviar_pix', 'agendar', 'transferir_humano'], ativo: true, created_at: ts(90) },
  ]

  const cLimpeza = uid()
  const cDrenagem = uid()
  const cDesign = uid()
  const cKit = uid()
  const cMassagem = uid()
  const catalogo: DB['catalogo'] = [
    { id: cLimpeza, empresa_id: empresaId, nome: 'Limpeza de Pele Profunda', tipo: 'servico', preco: 180, duracao_minutos: 90, dias_retorno_pos_venda: 30, descricao: 'Extração, peeling enzimático e máscara calmante.', ativo: true, created_at: ts(110), custo_aquisicao: 24, custo_mao_obra: 50, comissao_percentual: null },
    { id: cDrenagem, empresa_id: empresaId, nome: 'Drenagem Linfática', tipo: 'servico', preco: 150, duracao_minutos: 60, dias_retorno_pos_venda: 7, descricao: 'Sessão de drenagem manual corporal completa.', ativo: true, created_at: ts(110), custo_aquisicao: 6, custo_mao_obra: 48, comissao_percentual: null },
    { id: cDesign, empresa_id: empresaId, nome: 'Design de Sobrancelhas com Henna', tipo: 'servico', preco: 70, duracao_minutos: 40, dias_retorno_pos_venda: 20, descricao: 'Mapeamento facial, design e aplicação de henna.', ativo: true, created_at: ts(110), custo_aquisicao: 12, custo_mao_obra: 52, comissao_percentual: null },
    { id: cMassagem, empresa_id: empresaId, nome: 'Massagem Relaxante', tipo: 'servico', preco: 160, duracao_minutos: 60, dias_retorno_pos_venda: 15, descricao: 'Massagem com óleos essenciais e pedras quentes.', ativo: true, created_at: ts(100), custo_aquisicao: 14, custo_mao_obra: 55, comissao_percentual: null },
    { id: cKit, empresa_id: empresaId, nome: 'Kit Skincare Home Care', tipo: 'produto', preco: 239.9, duracao_minutos: 0, dias_retorno_pos_venda: 45, descricao: 'Sabonete, sérum vitamina C e hidratante FPS 50.', ativo: true, created_at: ts(90), custo_aquisicao: 190, custo_mao_obra: 0, comissao_percentual: 5 },
  ]

  const camp1 = uid()
  const camp2 = uid()
  const camp3 = uid()
  const campanhas_divulgacao: DB['campanhas_divulgacao'] = [
    { id: camp1, empresa_id: empresaId, titulo: 'Pele de Verão 20% OFF', catalogo_id: cLimpeza, funcionario_ia_id: fCapt, canal: 'instagram_ads', copy_anuncio: 'Sua pele pronta para o verão! Limpeza de Pele Profunda com 20% OFF só esta semana. Chame no WhatsApp e garanta seu horário.', desconto_oferta: 20, link_rastreavel: 'https://atendeai360.app/c/pele-verao', cliques: 412, leads_gerados: 58, vendas_geradas: 17, status: 'ativa', created_at: ts(14) },
    { id: camp2, empresa_id: empresaId, titulo: 'Semana da Drenagem', catalogo_id: cDrenagem, funcionario_ia_id: fVend, canal: 'whatsapp_lista', copy_anuncio: 'Desinche e sinta-se leve! Drenagem Linfática com 15% de desconto para quem agendar até sexta.', desconto_oferta: 15, link_rastreavel: 'https://atendeai360.app/c/semana-drenagem', cliques: 268, leads_gerados: 41, vendas_geradas: 12, status: 'ativa', created_at: ts(9) },
    { id: camp3, empresa_id: empresaId, titulo: 'Olhar Marcante', catalogo_id: cDesign, funcionario_ia_id: fAgen, canal: 'google_meu_negocio', copy_anuncio: 'Design de Sobrancelhas com Henna por um preço especial. Agende pelo WhatsApp em 1 minuto.', desconto_oferta: 10, link_rastreavel: 'https://atendeai360.app/c/olhar-marcante', cliques: 154, leads_gerados: 22, vendas_geradas: 6, status: 'pausada', created_at: ts(21) },
  ]

  const at = (
    nome: string,
    tel: string,
    origem: string,
    etapa: DB['atendimentos'][number]['etapa_funil'],
    status: DB['atendimentos'][number]['status'],
    valor: number,
    hoursAgo: number,
    msgs: [DB['mensagens'][number]['remetente'], string][],
  ) => {
    const id = uid()
    const base = Date.now() - hoursAgo * 3600_000
    const mensagens = msgs.map(([remetente, texto], i) => ({
      id: uid(),
      atendimento_id: id,
      remetente,
      texto,
      created_at: new Date(base + i * 90_000).toISOString(),
    }))
    return {
      atendimento: {
        id,
        empresa_id: empresaId,
        cliente_nome: nome,
        cliente_telefone: tel,
        origem_campanha: origem,
        etapa_funil: etapa,
        status,
        valor_estimado: valor,
        ultima_mensagem: msgs[msgs.length - 1][1],
        updated_at: new Date(base + msgs.length * 90_000).toISOString(),
      },
      mensagens,
    }
  }

  const conversas = [
    at('Mariana Alves', '11987654321', 'Pele de Verão 20% OFF', 'em_negociacao', 'ia', 144, 1, [
      ['ia', 'Oi Mariana! Aqui é a Luna do Studio Bella Forma. Vi que você se interessou pela Limpeza de Pele Profunda com 20% OFF. De R$ 180,00 por R$ 144,00!'],
      ['cliente', 'Oi! Quanto tempo dura a sessão?'],
      ['ia', 'A sessão dura 90 minutos e inclui extração, peeling enzimático e máscara calmante. Quer que eu veja um horário para você?'],
    ]),
    at('Fernanda Lima', '11976543210', 'Semana da Drenagem', 'agendado', 'ia', 127.5, 4, [
      ['ia', 'Oi Fernanda! Sou o Theo do Studio Bella Forma. A Drenagem Linfática está com 15% OFF: R$ 127,50.'],
      ['cliente', 'Quero agendar para amanhã à tarde'],
      ['ia', 'Perfeito! Reservei amanhã às 15:00. Te espero!'],
    ]),
    at('Patrícia Gomes', '21998877665', 'Pele de Verão 20% OFF', 'aguardando_pagamento', 'humano', 144, 6, [
      ['ia', 'Oi Patrícia! Sua Limpeza de Pele está com 20% OFF.'],
      ['cliente', 'Pode mandar o PIX?'],
      ['humano', 'Claro, Patrícia! Já te enviei o PIX Copia e Cola. Qualquer dúvida estou aqui.'],
    ]),
    at('Carla Mendes', '11955554444', 'Olhar Marcante', 'captado', 'ia', 63, 0.3, [
      ['ia', 'Oi Carla! Aqui é a Bia do Studio Bella Forma. O Design de Sobrancelhas com Henna está por R$ 63,00 nesta campanha!'],
    ]),
    at('Renata Oliveira', '11944443333', 'Indicação', 'concluido', 'finalizado', 160, 30, [
      ['cliente', 'Amei a massagem, muito obrigada!'],
      ['humano', 'Nós que agradecemos, Renata! Volte sempre.'],
    ]),
    at('Beatriz Costa', '11933332222', 'Semana da Drenagem', 'pos_venda', 'ia', 150, 50, [
      ['ia', 'Oi Beatriz! Aqui é a Nina. Como foi sua Drenagem? De 0 a 10, qual nota você daria?'],
      ['cliente', '10! Vocês são ótimas'],
      ['ia', 'Que alegria! Deixa sua avaliação no Google? https://g.page/r/studio-bella-forma/review'],
    ]),
  ]

  const today = new Date()
  const agendamentos: DB['agendamentos'] = [
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Fernanda Lima', cliente_telefone: '11976543210', servico_nome: 'Drenagem Linfática', valor: 127.5, data: isoDate(addDays(today, 1)), horario: '15:00', status: 'confirmado', pagamento_status: 'pendente', created_at: ts(0) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Patrícia Gomes', cliente_telefone: '21998877665', servico_nome: 'Limpeza de Pele Profunda', valor: 144, data: isoDate(today), horario: '16:00', status: 'pendente', pagamento_status: 'pendente', created_at: ts(0) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Juliana Prado', cliente_telefone: '11922221111', servico_nome: 'Massagem Relaxante', valor: 160, data: isoDate(today), horario: '10:00', status: 'confirmado', pagamento_status: 'pago_pix', created_at: ts(2) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Renata Oliveira', cliente_telefone: '11944443333', servico_nome: 'Massagem Relaxante', valor: 160, data: isoDate(addDays(today, -1)), horario: '14:00', status: 'concluido', pagamento_status: 'pago_pix', created_at: ts(3) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Aline Ferraz', cliente_telefone: '11911110000', servico_nome: 'Design de Sobrancelhas com Henna', valor: 70, data: isoDate(addDays(today, 2)), horario: '11:00', status: 'confirmado', pagamento_status: 'pago_pix', created_at: ts(1) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Sofia Nunes', cliente_telefone: '11900009999', servico_nome: 'Limpeza de Pele Profunda', valor: 180, data: isoDate(addDays(today, 3)), horario: '09:00', status: 'cancelado', pagamento_status: 'pendente', created_at: ts(4) },
  ]

  const pix = (valor: number, tx: string) =>
    gerarPixCopiaECola({ chave: '12345678000190', nome: 'Studio Bella Forma', cidade: 'Sao Paulo', valor, txid: tx })

  const patricia = conversas[2].atendimento
  const vendas_pagamentos: DB['vendas_pagamentos'] = [
    { id: uid(), empresa_id: empresaId, atendimento_id: patricia.id, cliente_nome: 'Patrícia Gomes', cliente_telefone: '21998877665', item_nome: 'Limpeza de Pele Profunda', valor: 144, metodo: 'pix', codigo_pix: pix(144, 'ATD0001'), status: 'pendente', created_at: ts(0, 9) },
    ...[
      [6, 'Juliana Prado', 'Massagem Relaxante', 160],
      [5, 'Renata Oliveira', 'Massagem Relaxante', 160],
      [5, 'Aline Ferraz', 'Design de Sobrancelhas com Henna', 70],
      [4, 'Beatriz Costa', 'Drenagem Linfática', 150],
      [3, 'Luiza Prates', 'Kit Skincare Home Care', 239.9],
      [3, 'Marta Silva', 'Limpeza de Pele Profunda', 144],
      [2, 'Elaine Cruz', 'Limpeza de Pele Profunda', 180],
      [2, 'Gabriela Reis', 'Drenagem Linfática', 127.5],
      [1, 'Tatiane Melo', 'Massagem Relaxante', 160],
      [1, 'Paula Brito', 'Kit Skincare Home Care', 239.9],
      [0, 'Débora Santos', 'Design de Sobrancelhas com Henna', 63],
    ].map(([d, nome, item, valor], i) => ({
      id: uid(),
      empresa_id: empresaId,
      atendimento_id: null,
      cliente_nome: nome as string,
      cliente_telefone: `1190000${String(1000 + i)}`,
      item_nome: item as string,
      valor: valor as number,
      metodo: 'pix' as const,
      codigo_pix: pix(valor as number, `ATD${100 + i}`),
      status: 'pago' as const,
      created_at: ts(d as number, 11 + i % 6),
    })),
  ]

  const pos_venda_automacoes: DB['pos_venda_automacoes'] = [
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Beatriz Costa', cliente_telefone: '11933332222', item_comprado: 'Drenagem Linfática', tipo_acao: 'pesquisa_nps', mensagem_enviada: 'Oi Beatriz! Como foi sua Drenagem Linfática? De 0 a 10, qual nota você daria?', nota_nps: 10, data_programada: isoDate(addDays(today, -2)), status: 'respondido', created_at: ts(2) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Beatriz Costa', cliente_telefone: '11933332222', item_comprado: 'Drenagem Linfática', tipo_acao: 'lembrete_recompra', mensagem_enviada: '', nota_nps: null, data_programada: isoDate(addDays(today, 5)), status: 'pendente', created_at: ts(2) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Renata Oliveira', cliente_telefone: '11944443333', item_comprado: 'Massagem Relaxante', tipo_acao: 'pesquisa_nps', mensagem_enviada: '', nota_nps: null, data_programada: isoDate(today), status: 'pendente', created_at: ts(1) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Renata Oliveira', cliente_telefone: '11944443333', item_comprado: 'Massagem Relaxante', tipo_acao: 'lembrete_recompra', mensagem_enviada: '', nota_nps: null, data_programada: isoDate(addDays(today, 14)), status: 'pendente', created_at: ts(1) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Juliana Prado', cliente_telefone: '11922221111', item_comprado: 'Massagem Relaxante', tipo_acao: 'pesquisa_nps', mensagem_enviada: 'Oi Juliana! Qual nota de 0 a 10?', nota_nps: 9, data_programada: isoDate(addDays(today, -6)), status: 'respondido', created_at: ts(6) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Luiza Prates', cliente_telefone: '11900001004', item_comprado: 'Kit Skincare Home Care', tipo_acao: 'lembrete_recompra', mensagem_enviada: 'Oi Luiza! Seu kit está acabando? Use o cupom VOLTEI15.', nota_nps: null, data_programada: isoDate(addDays(today, -1)), status: 'recomprou', created_at: ts(3) },
    { id: uid(), empresa_id: empresaId, cliente_nome: 'Elaine Cruz', cliente_telefone: '11900001006', item_comprado: 'Limpeza de Pele Profunda', tipo_acao: 'pesquisa_nps', mensagem_enviada: 'Oi Elaine! Qual nota de 0 a 10?', nota_nps: 7, data_programada: isoDate(addDays(today, -2)), status: 'respondido', created_at: ts(2) },
  ]

  const whatsapp_conexoes: DB['whatsapp_conexoes'] = [
    { id: uid(), empresa_id: empresaId, api_provider: 'evolution_api', instance_name: 'bella-forma', display_phone_number: '+55 11 99999-0000', status: 'conectado', qr_code_base64: '', auto_resposta_ia: true, updated_at: ts(1) },
  ]

  const clientesMap = new Map<string, DB['clientes_crm'][number]>()
  const addCliente = (nome: string, telefone: string, extra: Partial<DB['clientes_crm'][number]> = {}) => {
    const atual = clientesMap.get(telefone)
    clientesMap.set(telefone, {
      id: atual?.id ?? uid(),
      empresa_id: empresaId,
      nome,
      telefone,
      email: '',
      aniversario: null,
      preferencias: '',
      tags: [],
      ltv: 0,
      score_lead: 40,
      ultima_compra: null,
      ultima_interacao: ts(1),
      proxima_acao: 'Acompanhar conversa',
      opt_in: true,
      opt_out: false,
      created_at: ts(60),
      ...atual,
      ...extra,
    })
  }
  for (const v of vendas_pagamentos.filter((v) => v.status === 'pago')) {
    const c = clientesMap.get(v.cliente_telefone)
    addCliente(v.cliente_nome, v.cliente_telefone, {
      ltv: (c?.ltv ?? 0) + v.valor,
      ultima_compra: v.created_at,
      tags: ['cliente'],
      score_lead: 70,
      proxima_acao: 'Lembrete de recompra',
    })
  }
  for (const c of conversas) {
    addCliente(c.atendimento.cliente_nome, c.atendimento.cliente_telefone, {
      ultima_interacao: c.atendimento.updated_at,
      score_lead: c.atendimento.etapa_funil === 'aguardando_pagamento' ? 85 : c.atendimento.etapa_funil === 'captado' ? 35 : 60,
    })
  }
  addCliente('Helena Duarte', '11988880001', {
    ltv: 540,
    ultima_compra: ts(75),
    ultima_interacao: ts(75),
    tags: ['cliente', 'vip'],
    preferencias: 'Prefere horários pela manhã. Pele sensível.',
    aniversario: isoDate(addDays(today, 3)).slice(5),
    proxima_acao: 'Reativar: sem compra há 75 dias',
    score_lead: 55,
  })
  addCliente('Vanessa Torres', '11988880002', {
    ltv: 320,
    ultima_compra: ts(92),
    ultima_interacao: ts(90),
    tags: ['cliente'],
    proxima_acao: 'Reativar: sem compra há 92 dias',
    score_lead: 40,
  })
  addCliente('Joana Pires', '11988880003', { opt_in: false, opt_out: true, tags: ['descadastrado'], score_lead: 10, proxima_acao: 'Não contatar (opt-out)' })
  const clientes_crm = [...clientesMap.values()]

  // Histórico fictício (modo demonstração): vendas dos últimos 6 meses, crescendo mês a mês,
  // para o simulador e a projeção terem base. Não entram no CRM.
  let semente = 20260
  const aleatorio = () => {
    semente = (semente * 1664525 + 1013904223) % 4294967296
    return semente / 4294967296
  }
  const pesos: [string, number][] = [[cLimpeza, 0.25], [cDrenagem, 0.5], [cDesign, 0.7], [cMassagem, 0.9], [cKit, 1]]
  const historico: DB['vendas_pagamentos'] = []
  for (let m = 6; m >= 1; m--) {
    const qtd = 40 + (6 - m) * 6 + (m % 3)
    for (let i = 0; i < qtd; i++) {
      const r = aleatorio()
      const itemId = pesos.find(([, p]) => r <= p)![0]
      const item = catalogo.find((c) => c.id === itemId)!
      const dia = 1 + Math.floor(aleatorio() * 27)
      const d = new Date(now.getFullYear(), now.getMonth() - m, dia, 9 + Math.floor(aleatorio() * 9), 0, 0, 0)
      historico.push({
        id: uid(),
        empresa_id: empresaId,
        atendimento_id: null,
        cliente_nome: `Cliente demo ${m}-${i + 1}`,
        cliente_telefone: `118${String(m)}${String(1000 + i)}00`,
        item_nome: item.nome,
        valor: item.preco,
        metodo: 'pix',
        codigo_pix: '',
        status: 'pago',
        created_at: d.toISOString(),
      })
    }
  }
  vendas_pagamentos.push(...historico)

  const financeiro_config: DB['financeiro_config'] = [
    { id: uid(), empresa_id: empresaId, regime: 'simples', anexo: 'III', faturamento_estimado: 9000, aliquota_efetiva: 6, aliquota_manual: false, dia_pagamento: 20, comissao_padrao: 8, das_mei: 81.9, simulador_ativo: false, created_at: ts(100) },
  ]
  const fixo = (descricao: string, categoria: DB['financeiro_custos_fixos'][number]['categoria'], valor: number, dia: number, recorrencia: 'mensal' | 'trimestral' | 'anual' = 'mensal') => ({
    id: uid(), empresa_id: empresaId, descricao, categoria, valor, recorrencia, dia_vencimento: dia, ativo: true, created_at: ts(100),
  })
  const financeiro_custos_fixos: DB['financeiro_custos_fixos'] = [
    fixo('Aluguel do espaço', 'Estrutura', 1500, 5),
    fixo('Energia e água', 'Estrutura', 280, 10),
    fixo('Auxiliar de atendimento', 'Pessoal', 1200, 5),
    fixo('Anúncios (Instagram e Google)', 'Marketing', 600, 15),
    fixo('Sistemas e assinaturas', 'Tecnologia', 197, 8),
    fixo('Contabilidade', 'Fiscal', 200, 12),
    fixo('Seguro do espaço', 'Estrutura', 960, 20, 'anual'),
  ]
  const financeiro_custos_variaveis: DB['financeiro_custos_variaveis'] = [
    { id: uid(), empresa_id: empresaId, descricao: 'Taxa da maquininha (cartão)', tipo: 'percentual', valor: 2.5, catalogo_id: null, ativo: true, created_at: ts(100) },
    { id: uid(), empresa_id: empresaId, descricao: 'Material descartável por atendimento', tipo: 'valor', valor: 2.5, catalogo_id: null, ativo: true, created_at: ts(100) },
  ]
  const despesa = (descricao: string, categoria: DB['financeiro_despesas'][number]['categoria'], valor: number, data: string, pago: boolean, forma: DB['financeiro_despesas'][number]['forma_pagamento']) => ({
    id: uid(), empresa_id: empresaId, descricao, categoria, valor, data, pago, forma_pagamento: forma, created_at: ts(1),
  })
  const financeiro_despesas: DB['financeiro_despesas'] = [
    despesa('Manutenção do ar-condicionado', 'Estrutura', 350, isoDate(addDays(today, 3)), false, 'boleto'),
    despesa('Reposição de material de limpeza', 'Estrutura', 240, isoDate(addDays(today, -1)), true, 'pix'),
    despesa('Impulsionamento extra de campanha', 'Marketing', 180, isoDate(addDays(today, -2)), true, 'cartao_credito'),
    despesa('Uniformes da equipe', 'Pessoal', 420, isoDate(addDays(today, -35)), true, 'pix'),
    despesa('Curso de atualização técnica', 'Outros', 290, isoDate(addDays(today, -62)), true, 'cartao_credito'),
    despesa('Reparo de maca', 'Estrutura', 160, isoDate(addDays(today, -95)), true, 'dinheiro'),
  ]
  const mesAtual = isoDate(today).slice(0, 7)
  const financeiro_metas: DB['financeiro_metas'] = [
    { id: uid(), empresa_id: empresaId, mes: mesAtual, meta_faturamento: 12000, meta_lucro: 2500, created_at: ts(5) },
  ]

  const base_conhecimento: DB['base_conhecimento'] = [
    { id: uid(), empresa_id: empresaId, categoria: 'horarios', titulo: 'Horário de funcionamento', conteudo: 'Segunda a sábado, das 9h às 19h. Domingo fechado.', origem: 'manual', status: 'ativo', created_at: ts(100) },
    { id: uid(), empresa_id: empresaId, categoria: 'politicas', titulo: 'Política de cancelamento', conteudo: 'Cancelamentos com até 12h de antecedência sem custo. Após esse prazo, cobramos 50% do valor.', origem: 'manual', status: 'ativo', created_at: ts(100) },
    { id: uid(), empresa_id: empresaId, categoria: 'faq', titulo: 'Estacionamento', conteudo: 'Temos convênio com o estacionamento ao lado: 1h grátis para clientes.', origem: 'manual', status: 'ativo', created_at: ts(80) },
    { id: uid(), empresa_id: empresaId, categoria: 'regras', titulo: 'Desconto máximo', conteudo: 'A IA pode oferecer no máximo 10% de desconto fora de campanhas, apenas para pagamento via PIX.', origem: 'manual', status: 'ativo', created_at: ts(80) },
    { id: uid(), empresa_id: empresaId, categoria: 'faq', titulo: 'Gestantes podem fazer drenagem?', conteudo: 'Sim, a partir do segundo trimestre e com liberação médica.', origem: 'aprendido', status: 'sugerido', created_at: ts(1) },
  ]

  const auditoria: DB['auditoria'] = [
    { id: uid(), empresa_id: empresaId, ator: 'ia', ator_nome: 'Theo', acao: 'Enviou cobrança PIX', detalhe: 'Patrícia Gomes · R$ 144,00', created_at: ts(0, 9) },
    { id: uid(), empresa_id: empresaId, ator: 'ia', ator_nome: 'Theo', acao: 'Transferiu para humano', detalhe: 'Patrícia Gomes pediu atendimento humano', created_at: ts(0, 9) },
    { id: uid(), empresa_id: empresaId, ator: 'ia', ator_nome: 'Bia', acao: 'Criou agendamento', detalhe: 'Fernanda Lima · Drenagem Linfática', created_at: ts(0, 8) },
    { id: uid(), empresa_id: empresaId, ator: 'usuario', ator_nome: 'Juliana Martins', acao: 'Criou campanha', detalhe: 'Semana da Drenagem', created_at: ts(9) },
  ]

  const integracoes: DB['integracoes'] = []

  const sites_vitrine: DB['sites_vitrine'] = [
    {
      id: uid(),
      empresa_id: empresaId,
      slug: 'studio-bella-forma',
      publicado: true,
      template: 'estetica',
      cor_destaque: '#be5a76',
      modo_escuro: false,
      logo_url: '',
      banner_url: '/vitrine/bella-banner.png',
      og_image_url: '',
      favicon_url: '',
      headline: 'Seu momento de cuidado, sem pressa.',
      subtitulo: 'Drenagem, massagem modeladora e estética facial em Pinheiros. Agende em 1 minuto pelo WhatsApp.',
      sobre:
        'O Studio Bella Forma nasceu em 2016 com uma ideia simples: tratamento estético de verdade, com tempo para ouvir cada cliente. Nossa equipe é formada por fisioterapeutas e esteticistas especializadas em pós-operatório e bem-estar.',
      endereco: 'Rua dos Pinheiros, 1200 - Pinheiros, São Paulo - SP',
      telefone: '(11) 3456-7890',
      whatsapp: '11987654321',
      instagram: 'studiobellaforma',
      facebook: 'studiobellaforma',
      tiktok: '',
      horario_funcionamento: 'Segunda a sábado, das 9h às 19h',
      meta_title: '',
      meta_description: '',
      secoes_ativas: { sobre: true, servicos: true, galeria: true, depoimentos: true, contato: true, mapa: true, faq: true },
      faq: [
        { pergunta: 'Preciso agendar com antecedência?', resposta: 'Recomendamos 24h, mas sempre que houver horário livre atendemos no mesmo dia.' },
        { pergunta: 'Vocês têm estacionamento?', resposta: 'Sim, convênio com o estacionamento ao lado: 1h grátis para clientes.' },
        { pergunta: 'Quais formas de pagamento?', resposta: 'PIX, cartão de crédito e débito.' },
      ],
      created_at: ts(60),
      updated_at: ts(2),
    },
  ]

  const sites_galeria: DB['sites_galeria'] = [
    { id: uid(), empresa_id: empresaId, imagem_url: '/vitrine/galeria-1.png', legenda: 'Drenagem linfática', ordem: 1 },
    { id: uid(), empresa_id: empresaId, imagem_url: '/vitrine/galeria-2.png', legenda: 'Linha de cuidados faciais', ordem: 2 },
    { id: uid(), empresa_id: empresaId, imagem_url: '/vitrine/galeria-3.png', legenda: 'Nossa recepção', ordem: 3 },
  ]

  const sites_depoimentos: DB['sites_depoimentos'] = [
    { id: uid(), empresa_id: empresaId, nome_cliente: 'Camila R.', texto: 'Fiz a drenagem no pós-operatório e fez toda a diferença. Atendimento carinhoso e pontual.', nota: 5, foto_url: '', ordem: 1 },
    { id: uid(), empresa_id: empresaId, nome_cliente: 'Renata S.', texto: 'Agendei pelo WhatsApp em dois minutos. Ambiente lindo e muito limpo.', nota: 5, foto_url: '', ordem: 2 },
    { id: uid(), empresa_id: empresaId, nome_cliente: 'Luciana M.', texto: 'A limpeza de pele é a melhor que já fiz. Já virei cliente fixa.', nota: 5, foto_url: '', ordem: 3 },
  ]

  return {
    empresaId,
    db: {
      financeiro_config,
      financeiro_custos_fixos,
      financeiro_custos_variaveis,
      financeiro_despesas,
      financeiro_simulacoes: [],
      financeiro_metas,
      sites_vitrine,
      sites_galeria,
      sites_depoimentos,
      sites_visitas: [],
      sites_formularios: [],
      clientes_crm,
      base_conhecimento,
      auditoria,
      integracoes,
      empresas,
      perfis,
      funcionarios_ia,
      catalogo,
      campanhas_divulgacao,
      atendimentos: conversas.map((c) => c.atendimento),
      mensagens: conversas.flatMap((c) => c.mensagens),
      agendamentos,
      vendas_pagamentos,
      pos_venda_automacoes,
      whatsapp_conexoes,
    },
  }
}
