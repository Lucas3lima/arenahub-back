import { db } from '../db'
import { subscriptions } from '../db/schema'
import { eq, and, inArray } from 'drizzle-orm'

/**
 * Busca a assinatura vigente de uma empresa.
 * Critério: status trialing, active ou past_due e dentro do período de validade.
 */
export async function getCurrentSubscription(companyId: string) {
  const currentSub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.companyId, companyId),
      inArray(subscriptions.status, ['trialing', 'active', 'past_due'])
    ),
    with: {
      plan: true,
    },
    orderBy: (subs, { desc }) => [desc(subs.createdAt)],
  })

  if (!currentSub) return null

  // Validação extra por data se necessário (paywall logic)
  const now = new Date()
  const isExpired = currentSub.currentPeriodEndsAt < now && currentSub.status !== 'past_due'

  return {
    ...currentSub,
    isExpired,
  }
}
