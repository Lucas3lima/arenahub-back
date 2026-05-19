import type { Companies } from '../repositories/companies-repository'
import type { Plans } from '../repositories/plans-repository'

export type EffectiveCompanyFeatureSettings = {
  canUseOnlineReservations: boolean
  canUseOnlinePayment: boolean
  requiresOnlineDeposit: boolean
  depositPercent: number
}

/**
 * Combina o que o plano permite com o que a company escolheu ativar.
 * O plano define o "pode"; a company define o "quer".
 */
export function resolveCompanyFeatureSettings(params: {
  company: Companies
  plan: Plans
}): EffectiveCompanyFeatureSettings {
  const canUseOnlineReservations =
    params.plan.hasOnlineReservations &&
    params.company.onlineReservationsEnabled

  const canUseOnlinePayment =
    canUseOnlineReservations &&
    params.plan.hasOnlinePayment &&
    params.company.onlinePaymentEnabled

  const requiresOnlineDeposit =
    canUseOnlinePayment &&
    params.company.onlineBookingRequiresDeposit &&
    params.company.onlineBookingDepositPercent > 0

  const depositPercent = requiresOnlineDeposit
    ? params.company.onlineBookingDepositPercent
    : 0

  return {
    canUseOnlineReservations,
    canUseOnlinePayment,
    requiresOnlineDeposit,
    depositPercent,
  }
}

export function calculateDepositAmountCents(params: {
  totalPriceCents: number
  depositPercent: number
}) {
  if (params.depositPercent <= 0) {
    return 0
  }
  return Math.ceil((params.totalPriceCents * params.depositPercent) / 100)
}
