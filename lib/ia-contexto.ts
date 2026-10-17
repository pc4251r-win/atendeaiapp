import type { BaseConhecimento, CatalogoItem, ClienteCRM, FuncionarioIA, Mensagem } from './types'
import { brl } from './format'

export interface ContextoIA {
  empresa: { nome: string; segmento: string }
  funcionario?: Pick<FuncionarioIA, 'nome' | 'titulo_cargo' | 'tom_voz' | 'instrucoes_especificas' | 'meta_principal' | 'permissoes' | 'funcao'>
  cliente?: Pick<ClienteCRM, 'nome' | 'preferencias' | 'tags' | 'ltv' | 'ultima_compra'> | null
  catalogo: Pick<CatalogoItem, 'nome' | 'preco' | 'duracao_minutos' | 'descricao'>[]
  conhecimento: Pick<BaseConhecimento, 'categoria' | 'titulo' | 'conteudo'>[]
  horariosLivres: string[]
  historico: Pick<Mensagem, 'remetente' | 'texto'>[]
  etapa: string
}

const TOM: Record<string, string> = {
  informal: 'informal e próximo, frases curtas, pode usar gírias leves',
  formal: 'formal e respeitoso, sem gírias',
  empatico: 'empático e acolhedor, valida o sentimento do cliente antes de responder',
  consultivo: 'consultivo: faz perguntas para entender a necessidade e recomenda a melhor opção',
}

export function montarSystemPrompt(c: ContextoIA) {
  const f = c.funcionario
  return [
    `Você é ${f?.nome ?? 'a assistente'}, ${f?.titulo_cargo ?? 'atendente'} da empresa "${c.empresa.nome}" (${c.empresa.segmento}), atendendo pelo WhatsApp.`,
    `Tom de voz: ${TOM[f?.tom_voz ?? 'consultivo']}.`,
    f?.meta_principal ? `Seu objetivo principal: ${f.meta_principal}.` : '',
    f?.instrucoes_especificas ? `Instruções da empresa: ${f.instrucoes_especificas}` : '',
    `Permissões: ${f?.permissoes?.join(', ') || 'nenhuma ação especial'}. Nunca prometa algo fora dessas permissões.`,
    `Etapa atual do funil: ${c.etapa}.`,
    c.cliente
      ? `Ficha do cliente: ${c.cliente.nome}. Preferências: ${c.cliente.preferencias || 'não registradas'}. Tags: ${c.cliente.tags.join(', ') || 'nenhuma'}. LTV: ${brl(c.cliente.ltv)}. Última compra: ${c.cliente.ultima_compra?.slice(0, 10) ?? 'nunca'}.`
      : '',
    `Catálogo (use SOMENTE estes preços):\n${c.catalogo.map((i) => `- ${i.nome}: ${brl(i.preco)}${i.duracao_minutos ? ` (${i.duracao_minutos} min)` : ''}`).join('\n')}`,
    c.conhecimento.length ? `Base de conhecimento:\n${c.conhecimento.map((k) => `- [${k.categoria}] ${k.titulo}: ${k.conteudo}`).join('\n')}` : '',
    c.horariosLivres.length ? `Próximos horários livres: ${c.horariosLivres.join(', ')}.` : '',
    'Regras: responda em português do Brasil, no máximo 3 frases, sem markdown. Se não souber, diga que vai confirmar com a equipe. Se o cliente pedir humano ou demonstrar frustração, diga que vai transferir para um atendente.',
  ]
    .filter(Boolean)
    .join('\n')
}
