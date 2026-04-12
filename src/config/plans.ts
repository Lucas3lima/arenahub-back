export type SubscriptionPlan = 'base' | 'growth' | 'pro'

export interface PlanLimits {
  maxCourts: number | 'unlimited'
  maxArenas: number
  maxUsers: number
  features: string[]
}

export const PLANS: Record<SubscriptionPlan, PlanLimits> = {
  base: {
    maxCourts: 2,
    maxArenas: 1,
    maxUsers: 3,
    features: [
      'Agenda',
      'Mensalistas',
      'Aulas',
      'Página Pública',
      'Reservas Online',
      'Controle Financeiro Básico',
    ],
  },
  growth: {
    maxCourts: 5,
    maxArenas: 1,
    maxUsers: 8,
    features: [
      'Tudo do Base',
      'Relatórios Avançados (Ocupação/Receita)',
      'Permissões Customizadas',
      'Políticas de Cancelamento',
    ],
  },
  pro: {
    maxCourts: 'unlimited',
    maxArenas: 3,
    maxUsers: 'unlimited' as any, // Using 'unlimited' for consistency in logic later
    features: [
      'Tudo do Growth',
      'Suporte Prioritário (WhatsApp)',
      'Auditoria de Alterações',
      'Multi-unidades',
    ],
  },
}

export const TRIAL_DAYS = 14
export const DEFAULT_TRIAL_PLAN: SubscriptionPlan = 'pro'
