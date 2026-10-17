'use client'

import { Calculator, FileText, Landmark, LayoutDashboard, Lock, Package, Receipt, TrendingUp } from 'lucide-react'
import { Badge, PageHeader, Tabs } from '@/components/atendeai/ui'
import type { FinAba } from '@/lib/financeiro'
import { FinCustos } from './custos'
import { FinDashboard } from './dashboard'
import { FinFiscal } from './fiscal'
import { FinProdutos } from './produtos'
import { FinRelatorios } from './relatorios'
import { useFin } from './shared'
import { FinSimulador } from './simulador'

export function Financeiro() {
  const { finAba, setFinAba, ctx, session } = useFin()
  const bloqueado = !ctx.cfg.simulador_ativo

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Financeiro"
        title="Você está lucrando ou perdendo dinheiro?"
        description="Faturamento, custos, impostos e margem de cada item, calculados sozinhos a partir das suas vendas."
        tone="vendas"
        actions={
          session.mode === 'demo' ? (
            <Badge tone="pos">
              <Calculator className="size-3" /> Dados fictícios de demonstração
            </Badge>
          ) : undefined
        }
      />

      <div className="max-w-full overflow-x-auto">
        <Tabs<FinAba>
          value={finAba}
          onChange={setFinAba}
          items={[
            { value: 'dashboard', label: <><LayoutDashboard /> Dashboard</> },
            { value: 'produtos', label: <><Package /> Produtos & Margens</> },
            { value: 'custos', label: <><Receipt /> Custos & Despesas</> },
            { value: 'relatorios', label: <><FileText /> Relatórios</> },
            { value: 'fiscal', label: <><Landmark /> Configurações Fiscais</> },
            { value: 'simulador', label: <>{bloqueado ? <Lock /> : <TrendingUp />} Simulador & Projeções</> },
          ]}
        />
      </div>

      {finAba === 'dashboard' && <FinDashboard />}
      {finAba === 'produtos' && <FinProdutos />}
      {finAba === 'custos' && <FinCustos />}
      {finAba === 'relatorios' && <FinRelatorios />}
      {finAba === 'fiscal' && <FinFiscal />}
      {finAba === 'simulador' && <FinSimulador />}
    </div>
  )
}
