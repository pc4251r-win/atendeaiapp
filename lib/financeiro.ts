import type {
  AnexoSimples,
  CatalogoItem,
  CategoriaFinanceira,
  CustoFixo,
  CustoVariavel,
  DB,
  FinanceiroConfig,
  RegimeTributario,
  SimulacaoParametros,
} from './types'
import { brl } from './format'

export type FinAba = 'dashboard' | 'produtos' | 'custos' | 'relatorios' | 'fiscal' | 'simulador'

export const CATEGORIAS: CategoriaFinanceira[] = ['Estrutura', 'Pessoal', 'Marketing', 'Tecnologia', 'Fiscal', 'Outros']
export const LIMITE_MEI = 81_000
export const LIMITE_SIMPLES = 4_800_000
export const LIMITE_PRESUMIDO = 78_000_000
export const MARGEM_ALVO = 0.3
export const MARGEM_ATENCAO = 0.15

export const REGIME_LABEL: Record<RegimeTributario, string> = {
  mei: 'MEI',
  simples: 'Simples Nacional',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// ---------- Datas ----------
const p2 = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const mesDe = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`
export const diasNoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}
export const somarMeses = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return mesDe(d)
}
export const rotuloMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]}/${String(a).slice(2)}`
}
export const rotuloMesLongo = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`
}
const dataLocal = (iso: string) => (iso.length === 10 ? iso : ymd(new Date(iso)))

// ---------- Configuração ----------
export function configPadrao(empresaId: string): FinanceiroConfig {
  return {
    id: '',
    empresa_id: empresaId,
    regime: 'simples',
    anexo: 'III',
    faturamento_estimado: 15000,
    aliquota_efetiva: 6,
    aliquota_manual: false,
    dia_pagamento: 20,
    comissao_padrao: 0,
    das_mei: 81.9,
    simulador_ativo: false,
    created_at: '',
  }
}

// ---------- Simples Nacional (LC 123/2006, tabelas vigentes) ----------
const FAIXAS_RBT12 = [180_000, 360_000, 720_000, 1_800_000, 3_600_000, 4_800_000]
/** [alíquota nominal %, parcela a deduzir R$] por faixa */
const SIMPLES: Record<AnexoSimples, [number, number][]> = {
  I: [[4, 0], [7.3, 5940], [9.5, 13860], [10.7, 22500], [14.3, 87300], [19, 378000]],
  II: [[4.5, 0], [7.8, 5940], [10, 13860], [11.2, 22500], [14.7, 85500], [30, 720000]],
  III: [[6, 0], [11.2, 9360], [13.5, 17640], [16, 35640], [21, 125640], [33, 648000]],
  IV: [[4.5, 0], [9, 8100], [10.2, 12420], [14, 39780], [22, 183780], [33, 828000]],
  V: [[15.5, 0], [18, 4500], [19.5, 9900], [20.5, 17100], [23, 62100], [30.5, 540000]],
}
export const ANEXO_LABEL: Record<AnexoSimples, string> = {
  I: 'Anexo I · Comércio',
  II: 'Anexo II · Indústria',
  III: 'Anexo III · Serviços (locação, instalação, saúde, estética)',
  IV: 'Anexo IV · Serviços (construção, limpeza, vigilância)',
  V: 'Anexo V · Serviços intelectuais',
}

export function faixaSimples(rbt12: number) {
  const i = FAIXAS_RBT12.findIndex((l) => rbt12 <= l)
  return i === -1 ? FAIXAS_RBT12.length - 1 : i
}

/** Alíquota efetiva (%) = (RBT12 × alíquota nominal − parcela a deduzir) / RBT12 */
export function aliquotaSimples(anexo: AnexoSimples, rbt12: number) {
  const [nominal, deduzir] = SIMPLES[anexo][faixaSimples(rbt12)]
  if (rbt12 <= 0) return SIMPLES[anexo][0][0]
  return Math.max(0, ((rbt12 * nominal) / 100 - deduzir) / rbt12 * 100)
}

// ---------- Contexto ----------
export interface Receita {
  id: string
  data: string
  valor: number
  item: string
  cliente: string
  telefone: string
  origem: 'venda' | 'agendamento'
  catalogoId: string | null
}

export interface FinCtx {
  cfg: FinanceiroConfig
  ref: Date
  mesAtual: string
  /** alíquota variável aplicada por venda (fração, ex.: 0.06). MEI = 0 (DAS é fixo). */
  aliq: number
  comPadrao: number
  variaveis: CustoVariavel[]
  fixos: CustoFixo[]
  catalogo: CatalogoItem[]
  porNome: Map<string, CatalogoItem>
  porId: Map<string, CatalogoItem>
  receitas: Receita[]
  despesas: DB['financeiro_despesas']
  rbt12: number
  mei: boolean
}

export function receitasDe(db: DB): Receita[] {
  const catalogo = new Map(db.catalogo.map((c) => [c.nome.toLowerCase(), c]))
  const out: Receita[] = []
  const pagas = db.vendas_pagamentos.filter((v) => v.status === 'pago')
  for (const v of pagas) {
    out.push({
      id: `v-${v.id}`,
      data: dataLocal(v.created_at),
      valor: v.valor,
      item: v.item_nome,
      cliente: v.cliente_nome,
      telefone: v.cliente_telefone,
      origem: 'venda',
      catalogoId: catalogo.get(v.item_nome.toLowerCase())?.id ?? null,
    })
  }
  // Agendamento concluído vira receita, exceto se já existe venda paga do mesmo cliente/serviço no período
  for (const a of db.agendamentos.filter((x) => x.status === 'concluido')) {
    const t = new Date(a.data).getTime()
    const duplicada = pagas.some(
      (v) =>
        v.cliente_telefone === a.cliente_telefone &&
        v.item_nome.toLowerCase() === a.servico_nome.toLowerCase() &&
        Math.abs(new Date(v.created_at).getTime() - t) <= 14 * 86_400_000,
    )
    if (duplicada) continue
    out.push({
      id: `a-${a.id}`,
      data: a.data,
      valor: a.valor,
      item: a.servico_nome,
      cliente: a.cliente_nome,
      telefone: a.cliente_telefone,
      origem: 'agendamento',
      catalogoId: catalogo.get(a.servico_nome.toLowerCase())?.id ?? null,
    })
  }
  return out.sort((a, b) => a.data.localeCompare(b.data))
}

function estimarRbt12(receitas: Receita[], cfg: FinanceiroConfig, mesAtual: string) {
  const porMes = new Map<string, number>()
  const inicio = somarMeses(mesAtual, -12)
  for (const r of receitas) {
    const m = r.data.slice(0, 7)
    if (m >= mesAtual || m < inicio) continue
    porMes.set(m, (porMes.get(m) ?? 0) + r.valor)
  }
  if (porMes.size >= 3) return ([...porMes.values()].reduce((a, b) => a + b, 0) / porMes.size) * 12
  return cfg.faturamento_estimado * 12
}

/** Alíquota efetiva automática (%) para o regime escolhido. */
export function aliquotaAutomatica(cfg: FinanceiroConfig, rbt12: number, servicoShare = 1, margemOperacional = 0.15) {
  switch (cfg.regime) {
    case 'mei':
      return cfg.faturamento_estimado > 0 ? (cfg.das_mei / cfg.faturamento_estimado) * 100 : 0
    case 'simples':
      return aliquotaSimples(cfg.anexo, rbt12)
    case 'presumido':
      return presumido(servicoShare).total
    case 'real':
      return real(servicoShare, margemOperacional).total
  }
}

function presumido(servicoShare: number) {
  const s = servicoShare >= 0.5
  const irpj = s ? 4.8 : 1.2
  const csll = s ? 2.88 : 1.08
  const pis = 0.65
  const cofins = 3
  const iss = s ? 5 : 0
  return { irpj, csll, pis, cofins, iss, total: irpj + csll + pis + cofins + iss }
}

function real(servicoShare: number, margemOperacional: number) {
  const iss = servicoShare >= 0.5 ? 5 : 0
  const pis = 1.65
  const cofins = 7.6
  const lucro = Math.max(0, margemOperacional) * 100
  const irpj = 0.15 * lucro
  const csll = 0.09 * lucro
  return { irpj, csll, pis, cofins, iss, total: pis + cofins + iss + irpj + csll }
}

export function servicoShareDe(receitas: Receita[], porId: Map<string, CatalogoItem>) {
  let serv = 0
  let total = 0
  for (const r of receitas) {
    total += r.valor
    const c = r.catalogoId ? porId.get(r.catalogoId) : undefined
    if (!c || c.tipo === 'servico') serv += r.valor
  }
  return total > 0 ? serv / total : 1
}

export function criarCtx(db: DB, empresaId: string, ref: Date = new Date()): FinCtx {
  const cfg = db.financeiro_config.find((c) => c.empresa_id === empresaId) ?? configPadrao(empresaId)
  const mesAtual = mesDe(ref)
  const receitas = receitasDe(db)
  const porNome = new Map(db.catalogo.map((c) => [c.nome.toLowerCase(), c]))
  const porId = new Map(db.catalogo.map((c) => [c.id, c]))
  const rbt12 = estimarRbt12(receitas, cfg, mesAtual)
  const mei = cfg.regime === 'mei'
  const auto = aliquotaAutomatica(cfg, rbt12, servicoShareDe(receitas, porId))
  const aliqPct = mei ? 0 : cfg.aliquota_manual ? cfg.aliquota_efetiva : auto
  return {
    cfg,
    ref,
    mesAtual,
    aliq: aliqPct / 100,
    comPadrao: (cfg.comissao_padrao ?? 0) / 100,
    variaveis: db.financeiro_custos_variaveis.filter((v) => v.ativo),
    fixos: db.financeiro_custos_fixos.filter((f) => f.ativo),
    catalogo: db.catalogo,
    porNome,
    porId,
    receitas,
    despesas: db.financeiro_despesas,
    rbt12,
    mei,
  }
}

export const mensalizar = (c: Pick<CustoFixo, 'valor' | 'recorrencia'>) =>
  c.recorrencia === 'mensal' ? c.valor : c.recorrencia === 'trimestral' ? c.valor / 3 : c.valor / 12

// ---------- Custos por item ----------
const num = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)

export interface Detalhe {
  aquisicao: number
  maoObra: number
  variaveis: number
  comissao: number
  imposto: number
}

export function detalharItem(preco: number, item: CatalogoItem | undefined, ctx: FinCtx): Detalhe {
  const aplicaveis = ctx.variaveis.filter((v) => v.catalogo_id === null || v.catalogo_id === item?.id)
  const variaveis = aplicaveis.reduce((a, v) => a + (v.tipo === 'percentual' ? (preco * v.valor) / 100 : v.valor), 0)
  const comPct = item?.comissao_percentual != null ? item.comissao_percentual / 100 : ctx.comPadrao
  return {
    aquisicao: num(item?.custo_aquisicao),
    maoObra: num(item?.custo_mao_obra),
    variaveis,
    comissao: preco * comPct,
    imposto: preco * ctx.aliq,
  }
}

const lucroDe = (preco: number, d: Detalhe) => preco - d.aquisicao - d.maoObra - d.variaveis - d.comissao - d.imposto

export interface LinhaProduto {
  item: CatalogoItem
  preco: number
  custo: number
  imposto: number
  comissao: number
  lucro: number
  margem: number
  markup: number | null
  precoIdeal: number | null
  vendas90: number
  lucro90: number
}

export function precoIdeal(item: CatalogoItem, ctx: FinCtx, margemAlvo = MARGEM_ALVO) {
  const aplicaveis = ctx.variaveis.filter((v) => v.catalogo_id === null || v.catalogo_id === item.id)
  const fixo = num(item.custo_aquisicao) + num(item.custo_mao_obra) + aplicaveis.filter((v) => v.tipo === 'valor').reduce((a, v) => a + v.valor, 0)
  const pct = aplicaveis.filter((v) => v.tipo === 'percentual').reduce((a, v) => a + v.valor / 100, 0)
  const com = item.comissao_percentual != null ? item.comissao_percentual / 100 : ctx.comPadrao
  const denom = 1 - pct - com - ctx.aliq - margemAlvo
  if (denom <= 0.01) return null
  return Math.ceil((fixo / denom) * 100) / 100
}

export function analisarProdutos(ctx: FinCtx): LinhaProduto[] {
  const limite = ymd(new Date(ctx.ref.getTime() - 90 * 86_400_000))
  return ctx.catalogo.map((item) => {
    const d = detalharItem(item.preco, item, ctx)
    const custo = d.aquisicao + d.maoObra + d.variaveis
    const lucro = lucroDe(item.preco, d)
    const total = custo + d.imposto + d.comissao
    const vendidas = ctx.receitas.filter((r) => r.catalogoId === item.id && r.data >= limite)
    const lucro90 = vendidas.reduce((a, r) => a + lucroDe(r.valor, detalharItem(r.valor, item, ctx)), 0)
    return {
      item,
      preco: item.preco,
      custo,
      imposto: d.imposto,
      comissao: d.comissao,
      lucro,
      margem: item.preco > 0 ? lucro / item.preco : 0,
      markup: total > 0 ? lucro / total : null,
      precoIdeal: precoIdeal(item, ctx),
      vendas90: vendidas.length,
      lucro90,
    }
  })
}

// ---------- Cálculo mensal ----------
export interface MesCalc {
  mes: string
  faturamento: number
  vendas: number
  ticket: number
  receitaServicos: number
  receitaProdutos: number
  custoAquisicao: number
  custoMaoObra: number
  custoVariaveisExtra: number
  comissoes: number
  /** soma de aquisição + mão de obra + variáveis + comissões */
  custosVariaveis: number
  impostoVariavel: number
  impostoFixo: number
  imposto: number
  margemContribuicao: number
  fixos: number
  despesas: number
  despesasPendentes: number
  /** custos totais = custos variáveis + custos fixos */
  custosTotais: number
  lucro: number
  margemLiquida: number
}

export function fixosPorCategoria(ctx: FinCtx) {
  const m = new Map<CategoriaFinanceira, number>()
  for (const f of ctx.fixos) m.set(f.categoria, (m.get(f.categoria) ?? 0) + mensalizar(f))
  return m
}

export function calcularMes(ctx: FinCtx, mes: string): MesCalc {
  const rs = ctx.receitas.filter((r) => r.data.startsWith(mes))
  let aq = 0
  let mo = 0
  let vx = 0
  let co = 0
  let im = 0
  let fat = 0
  let serv = 0
  for (const r of rs) {
    const item = r.catalogoId ? ctx.porId.get(r.catalogoId) : undefined
    const d = detalharItem(r.valor, item, ctx)
    fat += r.valor
    aq += d.aquisicao
    mo += d.maoObra
    vx += d.variaveis
    co += d.comissao
    im += d.imposto
    if (!item || item.tipo === 'servico') serv += r.valor
  }
  const impostoFixo = ctx.mei ? ctx.cfg.das_mei : 0
  const fixos = ctx.fixos.reduce((a, f) => a + mensalizar(f), 0)
  const dsp = ctx.despesas.filter((d) => d.data.startsWith(mes))
  const despesas = dsp.reduce((a, d) => a + d.valor, 0)
  const despesasPendentes = dsp.filter((d) => !d.pago).reduce((a, d) => a + d.valor, 0)
  const custosVariaveis = aq + mo + vx + co
  const imposto = im + impostoFixo
  const margemContribuicao = fat - im - custosVariaveis
  const lucro = margemContribuicao - impostoFixo - fixos - despesas
  return {
    mes,
    faturamento: fat,
    vendas: rs.length,
    ticket: rs.length ? fat / rs.length : 0,
    receitaServicos: serv,
    receitaProdutos: fat - serv,
    custoAquisicao: aq,
    custoMaoObra: mo,
    custoVariaveisExtra: vx,
    comissoes: co,
    custosVariaveis,
    impostoVariavel: im,
    impostoFixo,
    imposto,
    margemContribuicao,
    fixos,
    despesas,
    despesasPendentes,
    custosTotais: custosVariaveis + fixos,
    lucro,
    margemLiquida: fat > 0 ? lucro / fat : 0,
  }
}

export function primeiroMesComReceita(ctx: FinCtx) {
  return ctx.receitas.length ? ctx.receitas[0].data.slice(0, 7) : ctx.mesAtual
}

export function serieMensal(ctx: FinCtx, n = 6): MesCalc[] {
  const primeiro = primeiroMesComReceita(ctx)
  const out: MesCalc[] = []
  for (let i = n - 1; i >= 0; i--) {
    const m = somarMeses(ctx.mesAtual, -i)
    if (m < primeiro && i !== 0) continue
    out.push(calcularMes(ctx, m))
  }
  return out
}

export function serieDiaria(ctx: FinCtx, dias = 30) {
  const out: { data: string; rotulo: string; valor: number }[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(ctx.ref)
    d.setDate(d.getDate() - i)
    const data = ymd(d)
    out.push({
      data,
      rotulo: `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`,
      valor: ctx.receitas.filter((r) => r.data === data).reduce((a, r) => a + r.valor, 0),
    })
  }
  return out
}

/** Margem de contribuição média (fração da receita) dos últimos 90 dias; cai para a média do catálogo. */
export function margemContribuicaoMedia(ctx: FinCtx) {
  const limite = ymd(new Date(ctx.ref.getTime() - 90 * 86_400_000))
  let fat = 0
  let mc = 0
  for (const r of ctx.receitas.filter((x) => x.data >= limite)) {
    const item = r.catalogoId ? ctx.porId.get(r.catalogoId) : undefined
    const d = detalharItem(r.valor, item, ctx)
    fat += r.valor
    mc += r.valor - d.aquisicao - d.maoObra - d.variaveis - d.comissao - d.imposto
  }
  if (fat > 0) return Math.max(0.01, mc / fat)
  const ativos = ctx.catalogo.filter((c) => c.ativo && c.preco > 0)
  if (!ativos.length) return 0.5
  const m = ativos.reduce((a, c) => a + lucroDe(c.preco, detalharItem(c.preco, c, ctx)) / c.preco, 0) / ativos.length
  return Math.max(0.01, m)
}

export interface Equilibrio {
  custosFixosTotais: number
  margemContribuicao: number
  necessario: number
  falta: number
  atingido: boolean
}

export function pontoEquilibrio(ctx: FinCtx, m: MesCalc): Equilibrio {
  const custosFixosTotais = m.fixos + m.despesas + m.impostoFixo
  const margemContribuicao = margemContribuicaoMedia(ctx)
  const necessario = custosFixosTotais / margemContribuicao
  return { custosFixosTotais, margemContribuicao, necessario, falta: Math.max(0, necessario - m.faturamento), atingido: m.faturamento >= necessario }
}

// ---------- Limites fiscais ----------
export function limiteFiscal(cfg: FinanceiroConfig, rbt12: number) {
  if (cfg.regime === 'mei') return { limite: LIMITE_MEI, usado: rbt12, pct: rbt12 / LIMITE_MEI, nome: 'MEI' }
  if (cfg.regime === 'simples') return { limite: LIMITE_SIMPLES, usado: rbt12, pct: rbt12 / LIMITE_SIMPLES, nome: 'Simples Nacional' }
  if (cfg.regime === 'presumido') return { limite: LIMITE_PRESUMIDO, usado: rbt12, pct: rbt12 / LIMITE_PRESUMIDO, nome: 'Lucro Presumido' }
  return null
}

// ---------- Movimentações e alertas ----------
export interface Movimento {
  id: string
  data: string
  descricao: string
  categoria: string
  valor: number
  tipo: 'receita' | 'despesa'
  pago: boolean
}

export function movimentacoes(ctx: FinCtx, limite = 10): Movimento[] {
  const rec: Movimento[] = ctx.receitas.map((r) => ({
    id: r.id,
    data: r.data,
    descricao: `${r.item} · ${r.cliente}`,
    categoria: r.origem === 'venda' ? 'Venda' : 'Agendamento',
    valor: r.valor,
    tipo: 'receita',
    pago: true,
  }))
  const dsp: Movimento[] = ctx.despesas.map((d) => ({
    id: d.id,
    data: d.data,
    descricao: d.descricao,
    categoria: d.categoria,
    valor: -d.valor,
    tipo: 'despesa',
    pago: d.pago,
  }))
  return [...rec, ...dsp].sort((a, b) => b.data.localeCompare(a.data)).slice(0, limite)
}

export interface AlertaFin {
  id: string
  nivel: 'critico' | 'atencao' | 'info'
  titulo: string
  detalhe: string
  aba?: FinAba
}

export function gerarAlertas(ctx: FinCtx, db: DB, m: MesCalc): AlertaFin[] {
  const out: AlertaFin[] = []
  const hoje = ymd(ctx.ref)
  const dia = ctx.ref.getDate()

  const linhas = analisarProdutos(ctx).filter((l) => l.item.ativo)
  const negativos = linhas.filter((l) => l.margem < 0)
  for (const l of negativos.slice(0, 3))
    out.push({ id: `neg-${l.item.id}`, nivel: 'critico', titulo: `${l.item.nome} dá prejuízo`, detalhe: `Cada venda perde ${brl(Math.abs(l.lucro))}. Preço ideal: ${l.precoIdeal ? brl(l.precoIdeal) : 'revise os custos'}.`, aba: 'produtos' })
  if (negativos.length > 3) out.push({ id: 'neg-mais', nivel: 'critico', titulo: `Mais ${negativos.length - 3} itens com margem negativa`, detalhe: 'Revise preços e custos em Produtos & Margens.', aba: 'produtos' })
  const baixos = linhas.filter((l) => l.margem >= 0 && l.margem < MARGEM_ATENCAO)
  if (baixos.length) out.push({ id: 'baixas', nivel: 'atencao', titulo: `${baixos.length} ${baixos.length === 1 ? 'item com margem' : 'itens com margem'} abaixo de 15%`, detalhe: baixos.slice(0, 3).map((b) => b.item.nome).join(', '), aba: 'produtos' })

  const em7 = ymd(new Date(ctx.ref.getTime() + 7 * 86_400_000))
  const vencendo = ctx.despesas.filter((d) => !d.pago && d.data <= em7)
  if (vencendo.length) {
    const atrasadas = vencendo.filter((d) => d.data < hoje).length
    out.push({
      id: 'dsp',
      nivel: atrasadas ? 'critico' : 'atencao',
      titulo: `${vencendo.length} ${vencendo.length === 1 ? 'despesa' : 'despesas'} a pagar`,
      detalhe: `${brl(vencendo.reduce((a, d) => a + d.valor, 0))}${atrasadas ? ` · ${atrasadas} em atraso` : ' vencendo nos próximos 7 dias'}.`,
      aba: 'custos',
    })
  }
  const proximos = ctx.fixos.filter((f) => f.dia_vencimento >= dia && f.dia_vencimento <= dia + 3)
  if (proximos.length) out.push({ id: 'fixos', nivel: 'info', titulo: `${proximos.length} custo(s) fixo(s) vencem em até 3 dias`, detalhe: proximos.map((f) => `${f.descricao} (dia ${f.dia_vencimento})`).join(', '), aba: 'custos' })

  const meta = db.financeiro_metas.find((x) => x.mes === ctx.mesAtual)
  if (meta && meta.meta_faturamento > 0) {
    const esperado = meta.meta_faturamento * (dia / diasNoMes(ctx.mesAtual))
    if (dia >= 5 && m.faturamento < esperado * 0.8)
      out.push({ id: 'meta', nivel: 'atencao', titulo: 'Faturamento abaixo da meta do mês', detalhe: `${brl(m.faturamento)} de ${brl(meta.meta_faturamento)} (esperado até hoje: ${brl(esperado)}).`, aba: 'simulador' })
  }

  const lim = limiteFiscal(ctx.cfg, ctx.rbt12)
  if (lim && lim.pct >= 0.8 && lim.nome !== 'Lucro Presumido')
    out.push({ id: 'limite', nivel: lim.pct >= 1 ? 'critico' : 'atencao', titulo: `Faturamento em ${Math.round(lim.pct * 100)}% do limite do ${lim.nome}`, detalhe: `Projeção anual ${brl(lim.usado)} para um limite de ${brl(lim.limite)}. Avalie mudar de regime.`, aba: 'fiscal' })

  return out
}

// ---------- Fluxo de caixa e extrato ----------
export interface DiaFluxo {
  dia: number
  data: string
  entradas: number
  custosVariaveis: number
  impostos: number
  fixos: number
  despesas: number
  saidas: number
  saldoDia: number
  saldoAcumulado: number
}

export function fluxoDeCaixa(ctx: FinCtx, mes: string): DiaFluxo[] {
  const n = diasNoMes(mes)
  const m = calcularMes(ctx, mes)
  const dias: DiaFluxo[] = Array.from({ length: n }, (_, i) => ({
    dia: i + 1,
    data: `${mes}-${p2(i + 1)}`,
    entradas: 0,
    custosVariaveis: 0,
    impostos: 0,
    fixos: 0,
    despesas: 0,
    saidas: 0,
    saldoDia: 0,
    saldoAcumulado: 0,
  }))
  for (const r of ctx.receitas.filter((x) => x.data.startsWith(mes))) {
    const d = dias[Number(r.data.slice(8, 10)) - 1]
    const item = r.catalogoId ? ctx.porId.get(r.catalogoId) : undefined
    const det = detalharItem(r.valor, item, ctx)
    d.entradas += r.valor
    d.custosVariaveis += det.aquisicao + det.maoObra + det.variaveis + det.comissao
  }
  for (const f of ctx.fixos) dias[Math.min(n, Math.max(1, f.dia_vencimento)) - 1].fixos += mensalizar(f)
  for (const x of ctx.despesas.filter((d) => d.data.startsWith(mes))) dias[Number(x.data.slice(8, 10)) - 1].despesas += x.valor
  dias[Math.min(n, Math.max(1, ctx.cfg.dia_pagamento)) - 1].impostos += m.imposto
  let acc = 0
  for (const d of dias) {
    d.saidas = d.custosVariaveis + d.impostos + d.fixos + d.despesas
    d.saldoDia = d.entradas - d.saidas
    acc += d.saldoDia
    d.saldoAcumulado = acc
  }
  return dias
}

export interface LinhaExtrato {
  grupo: 'Receitas' | 'Custos variáveis' | 'Impostos' | 'Custos fixos' | 'Despesas'
  categoria: string
  valor: number
}

export function extratoPorCategoria(ctx: FinCtx, mes: string): LinhaExtrato[] {
  const m = calcularMes(ctx, mes)
  const linhas: LinhaExtrato[] = [
    { grupo: 'Receitas', categoria: 'Serviços', valor: m.receitaServicos },
    { grupo: 'Receitas', categoria: 'Produtos', valor: m.receitaProdutos },
    { grupo: 'Custos variáveis', categoria: 'Custo de aquisição', valor: m.custoAquisicao },
    { grupo: 'Custos variáveis', categoria: 'Mão de obra', valor: m.custoMaoObra },
    { grupo: 'Custos variáveis', categoria: 'Custos variáveis cadastrados', valor: m.custoVariaveisExtra },
    { grupo: 'Custos variáveis', categoria: 'Comissões', valor: m.comissoes },
    { grupo: 'Impostos', categoria: ctx.mei ? 'DAS (MEI)' : REGIME_LABEL[ctx.cfg.regime], valor: m.imposto },
  ]
  for (const [cat, v] of fixosPorCategoria(ctx)) linhas.push({ grupo: 'Custos fixos', categoria: cat, valor: v })
  const dsp = new Map<string, number>()
  for (const d of ctx.despesas.filter((x) => x.data.startsWith(mes))) dsp.set(d.categoria, (dsp.get(d.categoria) ?? 0) + d.valor)
  for (const [cat, v] of dsp) linhas.push({ grupo: 'Despesas', categoria: cat, valor: v })
  return linhas.filter((l) => l.valor > 0)
}

// ---------- Simulador ----------
export interface BaseCenario {
  faturamento: number
  vendas: number
  ticket: number
  varDireto: number
  comissoes: number
  imposto: number
  fixos: number
  /** meses usados na média (0 = sem histórico) */
  meses: number
}

export function mesesCompletos(ctx: FinCtx, n: number): MesCalc[] {
  const out: MesCalc[] = []
  for (let i = 1; i <= n; i++) {
    const m = calcularMes(ctx, somarMeses(ctx.mesAtual, -i))
    if (m.faturamento > 0) out.push(m)
  }
  return out.reverse()
}

export function baseCenario(ctx: FinCtx): BaseCenario {
  let base = mesesCompletos(ctx, 3)
  if (!base.length) {
    const atual = calcularMes(ctx, ctx.mesAtual)
    base = atual.faturamento > 0 ? [atual] : []
  }
  const k = base.length || 1
  const soma = (f: (m: MesCalc) => number) => base.reduce((a, m) => a + f(m), 0) / k
  const fixosMes = ctx.fixos.reduce((a, f) => a + mensalizar(f), 0)
  const dspMedia = ctx.despesas.length ? soma((m) => m.despesas) : 0
  const vendas = soma((m) => m.vendas)
  const faturamento = soma((m) => m.faturamento)
  return {
    faturamento,
    vendas,
    ticket: vendas > 0 ? faturamento / vendas : 0,
    varDireto: soma((m) => m.custoAquisicao + m.custoMaoObra + m.custoVariaveisExtra),
    comissoes: soma((m) => m.comissoes),
    imposto: soma((m) => m.impostoVariavel),
    fixos: fixosMes + dspMedia + (ctx.mei ? ctx.cfg.das_mei : 0),
    meses: base.length,
  }
}

export interface ResultadoCenario {
  faturamento: number
  lucro: number
  margem: number
  lucroBase: number
  margemBase: number
  deltaLucro: number
  faturamentoNecessario: number | null
  vendasNecessarias: number | null
  ticket: number
}

const lucroBase = (b: BaseCenario) => b.faturamento - b.varDireto - b.comissoes - b.imposto - b.fixos

export function simularCenario(b: BaseCenario, p: SimulacaoParametros): ResultadoCenario {
  const preco = 1 + p.aumento_preco / 100
  const vol = 1 + p.aumento_volume / 100
  const red = 1 - p.reducao_custo / 100
  const faturamento = b.faturamento * preco * vol
  const varDireto = b.varDireto * vol * red
  const comissoes = b.comissoes * preco * vol
  const imposto = b.imposto * preco * vol
  const fixos = b.fixos * red
  const lucro = faturamento - varDireto - comissoes - imposto - fixos
  const mc = faturamento > 0 ? (faturamento - varDireto - comissoes - imposto) / faturamento : 0
  const ticket = b.ticket * preco
  const necessario = p.meta_lucro > 0 && mc > 0 ? (p.meta_lucro + fixos) / mc : null
  const lb = lucroBase(b)
  return {
    faturamento,
    lucro,
    margem: faturamento > 0 ? lucro / faturamento : 0,
    lucroBase: lb,
    margemBase: b.faturamento > 0 ? lb / b.faturamento : 0,
    deltaLucro: lucro - lb,
    faturamentoNecessario: necessario,
    vendasNecessarias: necessario && ticket > 0 ? Math.ceil(necessario / ticket) : null,
    ticket,
  }
}

export function curvaEquilibrio(eq: Equilibrio) {
  const max = Math.max(eq.necessario * 2, 1000)
  const passos = 12
  return Array.from({ length: passos + 1 }, (_, i) => {
    const receita = (max / passos) * i
    return { receita, custo: eq.custosFixosTotais + receita * (1 - eq.margemContribuicao) }
  })
}

// ---------- Projeção de 12 meses ----------
export interface PontoProjecao {
  mes: string
  rotulo: string
  real?: number
  otimista?: number
  realista?: number
  pessimista?: number
}

export interface Projecao {
  suficiente: boolean
  mesesHistorico: number
  sazonalidade: boolean
  crescimentoMensal: number
  margemMedia: number
  pontos: PontoProjecao[]
  lucroRealista12: number
  faturamentoRealista12: number
}

export function projetar(ctx: FinCtx): Projecao {
  const hist = mesesCompletos(ctx, 12)
  const n = hist.length
  const suficiente = n >= 3
  const fats = hist.map((h) => h.faturamento)
  const media = fats.reduce((a, b) => a + b, 0) / (n || 1)
  const ultimos = fats.slice(-3)
  const base = ultimos.length ? ultimos.reduce((a, b) => a + b, 0) / ultimos.length : 0

  let g = 0
  if (n >= 3 && media > 0) {
    const xs = fats.map((_, i) => i)
    const mx = xs.reduce((a, b) => a + b, 0) / n
    const num = xs.reduce((a, x, i) => a + (x - mx) * (fats[i] - media), 0)
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    g = den > 0 ? num / den / media : 0
    g = Math.max(-0.05, Math.min(0.08, g))
  }

  const sazonalidade = n >= 12
  const indice = new Map<number, number>()
  if (sazonalidade && media > 0) {
    const soma = new Map<number, number>()
    for (const h of hist) soma.set(Number(h.mes.slice(5, 7)), h.faturamento / media)
    const medio = [...soma.values()].reduce((a, b) => a + b, 0) / soma.size
    for (const [k, v] of soma) indice.set(k, v / medio)
  }

  const margemMedia = hist.length ? hist.slice(-3).reduce((a, h) => a + h.margemLiquida, 0) / Math.min(3, hist.length) : 0
  const pontos: PontoProjecao[] = hist.slice(-6).map((h) => ({ mes: h.mes, rotulo: rotuloMes(h.mes), real: Math.round(h.faturamento) }))
  const ancora = hist.length ? Math.round(hist[hist.length - 1].faturamento) : 0
  if (pontos.length) {
    const ult = pontos[pontos.length - 1]
    ult.otimista = ancora
    ult.realista = ancora
    ult.pessimista = ancora
  }
  let realista12 = 0
  const proj = (taxa: number, t: number, mes: string) => {
    const saz = indice.get(Number(mes.slice(5, 7))) ?? 1
    return Math.max(0, Math.round(base * (1 + taxa) ** t * saz))
  }
  for (let t = 1; t <= 12; t++) {
    const mes = somarMeses(ctx.mesAtual, t - 1)
    const realista = proj(g, t, mes)
    realista12 += realista
    pontos.push({
      mes,
      rotulo: rotuloMes(mes),
      otimista: proj(g + 0.02, t, mes),
      realista,
      pessimista: proj(Math.max(-0.1, g - 0.02), t, mes),
    })
  }
  return {
    suficiente,
    mesesHistorico: n,
    sazonalidade,
    crescimentoMensal: g,
    margemMedia,
    pontos,
    faturamentoRealista12: realista12,
    lucroRealista12: realista12 * margemMedia,
  }
}

// ---------- Comparador de regimes ----------
export interface LinhaRegime {
  regime: RegimeTributario
  nome: string
  elegivel: boolean
  impostoAnual: number
  impostoMensal: number
  aliquota: number
  nota: string
  recomendado: boolean
  atual: boolean
}

export function compararRegimes(ctx: FinCtx, base: BaseCenario): LinhaRegime[] {
  const fatAnual = ctx.rbt12
  const fatMes = fatAnual / 12
  const share = servicoShareDe(ctx.receitas, ctx.porId)
  const baseSemImposto = base.faturamento > 0 ? base : { ...base, faturamento: fatMes }
  const margemOp = baseSemImposto.faturamento > 0 ? (baseSemImposto.faturamento - baseSemImposto.varDireto - baseSemImposto.comissoes - baseSemImposto.fixos) / baseSemImposto.faturamento : 0.15

  const mei = ctx.cfg.das_mei * 12
  const aliqSimples = aliquotaSimples(ctx.cfg.anexo, fatAnual)
  const simples = (fatAnual * aliqSimples) / 100
  const pres = presumido(share)
  const rl = real(share, margemOp)

  const linhas: LinhaRegime[] = [
    { regime: 'mei', nome: 'MEI', elegivel: fatAnual <= LIMITE_MEI, impostoAnual: mei, impostoMensal: mei / 12, aliquota: fatAnual > 0 ? (mei / fatAnual) * 100 : 0, nota: `DAS fixo de ${brl(ctx.cfg.das_mei)}/mês. Limite de ${brl(LIMITE_MEI)}/ano.`, recomendado: false, atual: ctx.cfg.regime === 'mei' },
    { regime: 'simples', nome: `Simples Nacional · Anexo ${ctx.cfg.anexo}`, elegivel: fatAnual <= LIMITE_SIMPLES, impostoAnual: simples, impostoMensal: simples / 12, aliquota: aliqSimples, nota: 'Alíquota efetiva pela tabela oficial da faixa de faturamento.', recomendado: false, atual: ctx.cfg.regime === 'simples' },
    { regime: 'presumido', nome: 'Lucro Presumido', elegivel: fatAnual <= LIMITE_PRESUMIDO, impostoAnual: (fatAnual * pres.total) / 100, impostoMensal: (fatMes * pres.total) / 100, aliquota: pres.total, nota: `IRPJ, CSLL, PIS, COFINS${pres.iss ? ' e ISS (5%)' : ''}. ICMS não incluído.`, recomendado: false, atual: ctx.cfg.regime === 'presumido' },
    { regime: 'real', nome: 'Lucro Real', elegivel: true, impostoAnual: (fatAnual * rl.total) / 100, impostoMensal: (fatMes * rl.total) / 100, aliquota: rl.total, nota: 'Estimativa sem créditos de PIS/COFINS; IRPJ e CSLL sobre o lucro.', recomendado: false, atual: ctx.cfg.regime === 'real' },
  ]
  const melhor = linhas.filter((l) => l.elegivel).sort((a, b) => a.impostoAnual - b.impostoAnual)[0]
  if (melhor) melhor.recomendado = true
  return linhas
}

// ---------- Integrações (Radar, Copiloto, Inbox) ----------
export interface OportunidadeFin {
  id: string
  tipo: 'equilibrio' | 'margem_negativa'
  titulo: string
  detalhe: string
  valor: number
  urgencia: 'alta' | 'media' | 'baixa'
}

export function oportunidadesFinanceiras(db: DB, empresaId: string, ref: Date = new Date()): OportunidadeFin[] {
  const ctx = criarCtx(db, empresaId, ref)
  if (!ctx.fixos.length && !ctx.despesas.length) return []
  const out: OportunidadeFin[] = []
  const m = calcularMes(ctx, ctx.mesAtual)
  const eq = pontoEquilibrio(ctx, m)
  if (!eq.atingido && eq.falta > 0 && ctx.receitas.length)
    out.push({
      id: 'fin-equilibrio',
      tipo: 'equilibrio',
      titulo: `Faltam ${brl(eq.falta)} para fechar o mês no positivo`,
      detalhe: `Ponto de equilíbrio de ${brl(eq.necessario)}; você faturou ${brl(m.faturamento)} até agora.`,
      valor: eq.falta,
      urgencia: ref.getDate() >= 20 ? 'alta' : 'media',
    })
  const neg = analisarProdutos(ctx).filter((l) => l.item.ativo && l.margem < 0)
  for (const l of neg.slice(0, 2))
    out.push({ id: `fin-neg-${l.item.id}`, tipo: 'margem_negativa', titulo: `${l.item.nome} está com margem negativa`, detalhe: `Perde ${brl(Math.abs(l.lucro))} por venda. Revise o preço.`, valor: 0, urgencia: 'media' })
  return out
}

export function produtoHabitual(db: DB, empresaId: string, telefone: string, ref: Date = new Date()) {
  const ctx = criarCtx(db, empresaId, ref)
  const contagem = new Map<string, number>()
  for (const r of ctx.receitas.filter((x) => x.telefone === telefone && x.catalogoId)) contagem.set(r.catalogoId!, (contagem.get(r.catalogoId!) ?? 0) + 1)
  const top = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  const linha = analisarProdutos(ctx).find((l) => l.item.id === top[0])
  return linha ? { nome: linha.item.nome, compras: top[1], margem: linha.margem, lucro: linha.lucro } : null
}

export function resumoFinanceiro(db: DB, empresaId: string, ref: Date = new Date()) {
  const ctx = criarCtx(db, empresaId, ref)
  const m = calcularMes(ctx, ctx.mesAtual)
  const eq = pontoEquilibrio(ctx, m)
  const linhas = analisarProdutos(ctx).filter((l) => l.item.ativo)
  const ord = [...linhas].sort((a, b) => b.lucro90 - a.lucro90 || b.margem - a.margem)
  return { ctx, m, eq, linhas, melhor: ord[0], pior: [...linhas].sort((a, b) => a.margem - b.margem)[0] }
}

/** Respostas financeiras calculadas localmente (sem LLM) para o Copiloto. */
export function responderFinanceiro(db: DB, empresaId: string, pergunta: string): string | null {
  const t = pergunta.toLowerCase()
  const fin = /lucr|margem|equil[ií]brio|imposto|custo|despesa|prejuízo|prejuizo|regime|das\b/.test(t)
  if (!fin) return null
  const { ctx, m, eq, melhor, pior } = resumoFinanceiro(db, empresaId)
  if (/mais lucrativ|maior lucro|melhor produto|melhor servi/.test(t))
    return melhor ? `Seu item mais lucrativo nos últimos 90 dias é ${melhor.item.nome}: ${brl(melhor.lucro90)} de lucro em ${melhor.vendas90} vendas (margem de ${(melhor.margem * 100).toFixed(0)}% por venda).` : 'Ainda não há vendas suficientes para apontar o item mais lucrativo.'
  if (/menos lucrativ|pior|margem negativ|preju[ií]zo/.test(t) && pior)
    return `O item com menor margem é ${pior.item.nome}: ${(pior.margem * 100).toFixed(0)}% (${brl(pior.lucro)} por venda).${pior.precoIdeal ? ` Para chegar a 30% de margem, o preço ideal seria ${brl(pior.precoIdeal)}.` : ''}`
  if (/equil[ií]brio/.test(t))
    return eq.atingido
      ? `Você já passou do ponto de equilíbrio deste mês (${brl(eq.necessario)}). Tudo que vender agora é lucro de ${(eq.margemContribuicao * 100).toFixed(0)}% de margem de contribuição.`
      : `Seu ponto de equilíbrio é ${brl(eq.necessario)}/mês. Você faturou ${brl(m.faturamento)} e faltam ${brl(eq.falta)} para não ter prejuízo.`
  if (/imposto|regime|\bdas\b/.test(t))
    return `Regime: ${REGIME_LABEL[ctx.cfg.regime]}. Impostos provisionados este mês: ${brl(m.imposto)}${ctx.mei ? ' (DAS fixo)' : ` (alíquota efetiva de ${(ctx.aliq * 100).toFixed(2).replace('.', ',')}%)`}.`
  return `Neste mês: faturamento ${brl(m.faturamento)}, custos ${brl(m.custosTotais)}, impostos ${brl(m.imposto)}, despesas ${brl(m.despesas)}. Lucro líquido ${brl(m.lucro)} (margem ${(m.margemLiquida * 100).toFixed(1).replace('.', ',')}%).`
}
