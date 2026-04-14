import { getCurrentSubscription } from './get-current-subscription'

/**
 * Middleware para validar assinatura ativa e dentro dos limites.
 * Pode ser adaptado para Fastify, Express, etc.
 */
export async function validatePaywall(companyId: string) {
  const currentSub = await getCurrentSubscription(companyId)

  if (!currentSub) {
    throw new Error('Empresa não possui assinatura ativa.')
  }

  const now = new Date()
  
  // Regra de Paywall: Se não estiver active/trialing, bloqueia.
  // Se estiver past_due, o comportamento varia conforme a política (pode dar carência de X dias).
  const allowedStatuses = ['active', 'trialing']
  const isExpired = currentSub.currentPeriodEndsAt < now

  if (!allowedStatuses.includes(currentSub.status) || isExpired) {
    throw new Error('Assinatura expirada ou inativa. Bloqueado acesso de edição.')
  }

  return {
    isActive: true,
    plan: currentSub.plan,
  }
}
