import type {
  Agendamento,
  Campanha,
  CatalogoItem,
  Empresa,
  EtapaFunil,
  FuncionarioIA,
  TomVoz,
} from './types'
import { addDays, brl, fmtDate, isoDate } from './format'

const SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

const firstName = (n: string) => n.split(' ')[0] ?? n

const saudacao: Record<TomVoz, (n: string) => string> = {
  informal: (n) => `Eaí ${n}, tudo certo?`,
  formal: (n) => `Olá, ${n}. Tudo bem?`,
  empatico: (n) => `Oi ${n}, que bom ter você aqui!`,
  consultivo: (n) => `Oi ${n}!`,
}

const fecho: Record<TomVoz, string> = {
  informal: 'Bora fechar?',
  formal: 'Fico à disposição para esclarecer qualquer dúvida.',
  empatico: 'Me conta o que é mais importante pra você, que eu te ajudo.',
  consultivo: 'Posso te recomendar a melhor opção agora?',
}

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** Detecta pedidos explícitos de humano ou frustração para acionar o handoff. */
export function precisaHumano(texto: string) {
  const t = normalizar(texto)
  return /(atendente|humano|pessoa real|gerente|falar com alguem|reclama|absurdo|pessimo|horrivel|procon|cancelar tudo|ninguem responde|palhacada)/.test(
    t,
  )
}

/** Detecta pedido de descadastro (compliance Meta / LGPD). */
export function pediuOptOut(texto: string) {
  const t = normalizar(texto).trim()
  return /^(sair|parar|stop|descadastrar|cancelar inscricao|nao quero mais receber)/.test(t)
}

/** Score 0-100 com base em engajamento, intenção e histórico. */
export function calcularScoreLead(p: { mensagensCliente: number; textos: string[]; ltv: number; etapa?: EtapaFunil }) {
  let s = 20
  s += Math.min(p.mensagensCliente * 8, 32)
  const t = normalizar(p.textos.join(' '))
  if (/(quero|agendar|pix|pagar|fechado|confirmo)/.test(t)) s += 25
  if (/(preco|valor|quanto|horario)/.test(t)) s += 10
  if (p.ltv > 0) s += 10
  if (p.etapa === 'aguardando_pagamento' || p.etapa === 'agendado') s += 15
  return Math.max(0, Math.min(100, s))
}

export function resumoParaHumano(p: { cliente: string; mensagens: { remetente: string; texto: string }[]; etapa: EtapaFunil }) {
  const doCliente = p.mensagens.filter((m) => m.remetente === 'cliente').slice(-3).map((m) => `"${m.texto}"`)
  return `Resumo para o atendente: ${firstName(p.cliente)} está na etapa "${p.etapa.replace('_', ' ')}". Últimas falas do cliente: ${doCliente.join(' · ') || 'nenhuma'}. Assuma a conversa a partir daqui.`
}

export function horariosLivres(agendamentos: Agendamento[], dias = 3) {
  const result: { data: string; horario: string }[] = []
  const now = new Date()
  for (let d = 0; d < dias + 2 && result.length < 6; d++) {
    const date = addDays(now, d)
    if (date.getDay() === 0) continue
    const iso = isoDate(date)
    const ocupados = new Set(
      agendamentos.filter((a) => a.data === iso && a.status !== 'cancelado').map((a) => a.horario),
    )
    for (const s of SLOTS) {
      if (d === 0 && Number(s.slice(0, 2)) <= now.getHours()) continue
      if (!ocupados.has(s)) result.push({ data: iso, horario: s })
      if (result.filter((r) => r.data === iso).length >= 2) break
    }
  }
  return result.slice(0, 3)
}

export function precoComDesconto(preco: number, desconto: number) {
  return Math.round(preco * (1 - desconto / 100) * 100) / 100
}

export function primeiraMensagemCampanha(p: {
  cliente: string
  funcionario?: FuncionarioIA
  campanha: Campanha
  item?: CatalogoItem
  empresa: Empresa
}) {
  const tom = p.funcionario?.tom_voz ?? 'consultivo'
  const nome = firstName(p.cliente)
  const ag = p.funcionario?.nome ?? 'assistente'
  const item = p.item
  const oferta = item
    ? `${item.nome} de ${brl(item.preco)} por apenas ${brl(precoComDesconto(item.preco, p.campanha.desconto_oferta))} (${p.campanha.desconto_oferta}% OFF)`
    : `uma condição especial de ${p.campanha.desconto_oferta}% OFF`
  return `${saudacao[tom](nome)} Aqui é ${tom === 'formal' ? 'o(a)' : 'a'} ${ag}, da ${p.empresa.nome}. Vi que você chegou pela campanha "${p.campanha.titulo}" e separei pra você: ${oferta}. ${item?.tipo === 'servico' ? 'Quer que eu veja um horário livre para você?' : 'Quer que eu já gere o seu pedido?'}`
}

export function responderComoIA(p: {
  texto: string
  cliente: string
  funcionario?: FuncionarioIA
  catalogo: CatalogoItem[]
  agendamentos: Agendamento[]
  campanha?: Campanha
  empresa: Empresa
  etapa?: EtapaFunil
}) {
  const t = p.texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const tom = p.funcionario?.tom_voz ?? 'consultivo'
  const nome = firstName(p.cliente)
  const ativos = p.catalogo.filter((c) => c.ativo)
  const desconto = p.campanha?.desconto_oferta ?? 0
  const itemCampanha = ativos.find((c) => c.id === p.campanha?.catalogo_id)
  const itemCitado = ativos.find((c) =>
    c.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(' ')
      .some((w) => w.length > 4 && t.includes(w)),
  )
  const item = itemCitado ?? itemCampanha

  const notaMatch = t.match(/\b(10|[0-9])\b/)
  if (p.etapa === 'pos_venda' && notaMatch) {
    const nota = Number(notaMatch[1])
    if (nota >= 9)
      return `Uau, ${nota}! Muito obrigada, ${nome}! Pode deixar sua avaliação 5 estrelas no Google? Isso ajuda demais a ${p.empresa.nome}. E como presente, você ganhou um cupom para a próxima visita.`
    if (nota >= 7)
      return `Obrigada pela nota ${nota}, ${nome}! O que faltou para ser um 10? Sua opinião vai direto para a nossa equipe.`
    return `Poxa, ${nome}, sinto muito pela experiência. Vou chamar nossa gerente agora mesmo para resolver isso com você.`
  }

  if (/(preco|valor|quanto|custa|tabela|servicos|opcoes|cardapio)/.test(t)) {
    const lista = (item ? [item, ...ativos.filter((c) => c.id !== item.id)] : ativos)
      .slice(0, 4)
      .map((c) => {
        const temDesc = desconto > 0 && c.id === itemCampanha?.id
        return `• ${c.nome}: ${temDesc ? `~${brl(c.preco)}~ ${brl(precoComDesconto(c.preco, desconto))}` : brl(c.preco)}${c.duracao_minutos ? ` (${c.duracao_minutos} min)` : ''}`
      })
      .join('\n')
    return `${saudacao[tom](nome)} Nossos valores atualizados:\n${lista}\n${fecho[tom]}`
  }

  if (/(horario|agenda|marcar|agendar|disponivel|amanha|hoje|quando|dia)/.test(t)) {
    const livres = horariosLivres(p.agendamentos)
    if (!livres.length) return `${nome}, a agenda está lotada nos próximos dias. Posso te colocar na lista de espera?`
    const ops = livres.map((l) => `• ${fmtDate(l.data)} às ${l.horario}`).join('\n')
    return `Tenho estes horários livres${item ? ` para ${item.nome}` : ''}:\n${ops}\nQual fica melhor pra você?`
  }

  if (/(pix|pagar|pagamento|cartao|transferencia|link)/.test(t)) {
    const valor = item ? precoComDesconto(item.preco, item.id === itemCampanha?.id ? desconto : 0) : 0
    return `Aceitamos PIX (aprovação na hora) e cartão. ${valor ? `O valor de ${item?.nome} fica ${brl(valor)}. ` : ''}Vou gerar o seu PIX Copia e Cola agora mesmo.`
  }

  if (/(desconto|promocao|cupom|oferta)/.test(t)) {
    return desconto && itemCampanha
      ? `Sim! Pela campanha "${p.campanha?.titulo}" você tem ${desconto}% OFF em ${itemCampanha.nome}: sai por ${brl(precoComDesconto(itemCampanha.preco, desconto))}. ${fecho[tom]}`
      : `${nome}, hoje consigo te oferecer condição especial no PIX. ${fecho[tom]}`
  }

  if (/(caro|pensar|depois|nao sei|duvida)/.test(t)) {
    return `Entendo totalmente, ${nome}. ${item ? `O ${item.nome} inclui ${item.descricao.toLowerCase()} ` : ''}E as vagas com desconto são limitadas. Posso segurar um horário sem compromisso por 2 horas?`
  }

  if (/(sim|quero|pode|fechado|ok|confirmo|bora|beleza)/.test(t)) {
    return `Perfeito, ${nome}! ${item?.tipo === 'servico' ? 'Já vou reservar seu horário e te enviar o PIX para confirmação.' : 'Já vou gerar seu pedido e o PIX.'}`
  }

  if (/(obrigad|valeu|amei|gostei)/.test(t)) {
    return `Nós que agradecemos, ${nome}! Qualquer coisa é só chamar aqui.`
  }

  if (/(endereco|onde|local|fica)/.test(t)) {
    return `Estamos esperando você na ${p.empresa.nome}! Te mando a localização certinha ao confirmar o horário.`
  }

  const porFuncao: Record<string, string> = {
    atendimento: `${saudacao[tom](nome)} Que bom falar com você! Quer conhecer nossos serviços mais procurados ou já tem algo em mente?`,
    campanha: `${saudacao[tom](nome)} Que bom que você respondeu! Quer aproveitar a condição especial desta semana?`,
    vendas: `${saudacao[tom](nome)} Posso te mostrar a melhor opção para o que você procura. ${fecho[tom]}`,
    agendamento: `${nome}, me diz o melhor dia e período (manhã ou tarde) que eu vejo a agenda pra você.`,
    suporte: `${saudacao[tom](nome)} Estou aqui para ajudar. Pode me contar mais detalhes?`,
    pos_venda: `${saudacao[tom](nome)} Como foi sua experiência com a gente? De 0 a 10, qual nota você daria?`,
  }
  return porFuncao[p.funcionario?.funcao ?? 'vendas']
}

const MENSAGENS_CLIENTE: Record<EtapaFunil, string[]> = {
  captado: ['Oi! Quanto custa?', 'Ainda tem desconto?', 'Quais horários vocês têm?', 'Como funciona?'],
  em_negociacao: ['Tem horário amanhã?', 'Achei um pouco caro...', 'Quais são os valores?', 'Quero agendar!'],
  agendado: ['Posso pagar no PIX?', 'Qual o endereço?', 'Confirmo sim!', 'Tem como pagar adiantado?'],
  aguardando_pagamento: ['Acabei de pagar o PIX', 'Pode mandar o link de novo?', 'Aceita cartão?'],
  concluido: ['Amei, muito obrigada!', 'Gostei muito do atendimento'],
  pos_venda: ['10! Amei tudo', 'Nota 9', 'Nota 6, demorou um pouco', 'Quero agendar de novo!'],
}

export function mensagemClienteSimulada(etapa: EtapaFunil) {
  const list = MENSAGENS_CLIENTE[etapa]
  return list[Math.floor(Math.random() * list.length)]
}

export function gerarCopiesCampanha(p: {
  item: CatalogoItem
  desconto: number
  empresa: Empresa
  funcionario?: FuncionarioIA
}) {
  const novo = precoComDesconto(p.item.preco, p.desconto)
  const off = p.desconto > 0 ? `${p.desconto}% OFF` : 'condição especial'
  return {
    instagram: `${p.item.nome} com ${off} na ${p.empresa.nome}!\n\nDe ${brl(p.item.preco)} por ${brl(novo)}. ${p.item.descricao}\n\nVagas limitadas esta semana. Toque em "Enviar mensagem" e a ${p.funcionario?.nome ?? 'nossa equipe'} reserva seu horário em 1 minuto pelo WhatsApp.`,
    status: `HOJE: ${p.item.nome} por ${brl(novo)} (${off}). Responda este status com "EU QUERO" e garanta sua vaga!`,
    lista: `Oi, {nome}! Tudo bem? Aqui é da ${p.empresa.nome}.\n\nPreparamos uma oferta exclusiva pra você: ${p.item.nome} de ${brl(p.item.preco)} por ${brl(novo)}.\n\nResponda "SIM" que eu te mostro os horários disponíveis.`,
  }
}
