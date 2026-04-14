import { db } from '../db'
import { subscriptions, plans } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

/**
 * Inicia um trial de 14 dias para uma empresa recém-criada.
 */
export async function startTrial(companyId: string) {
  // Busca o plano de trial no banco pelo slug (definido no seed)
  const trialPlan = await db.query.plans.findFirst({
    where: eq(plans.slug, 'free_trial'),
  })

  if (!trialPlan) {
    throw new Error('Plano de trial não encontrado no banco.')
  }

  const now = new Date()
  const trialEndsAt = new Date()
  trialEndsAt.setDate(now.getDate() + 14) // 14 dias conforme regra

  return await db.insert(subscriptions).values({
    companyId,
    planId: trialPlan.id,
    status: 'trialing',
    currentPeriodStartsAt: now,
    currentPeriodEndsAt: trialEndsAt,
    trialEndsAt: trialEndsAt,
  }).returning()
}

/**
 * Converte trial para pago ou faz upgrade/downgrade.
 * Encerra a assinatura vigente anterior.
 */
export async function subscribeToPlan(companyId: string, planSlug: string) {
  const targetPlan = await db.query.plans.findFirst({
    where: eq(plans.slug, planSlug),
  })

  if (!targetPlan) throw new Error('Plano não encontrado.')

  const now = new Date()
  const nextPeriodEndsAt = new Date()
  nextPeriodEndsAt.setMonth(now.getMonth() + 1) // Assinatura mensal básica

  return await db.transaction(async (tx) => {
    // 1. Encerrar assinatura vigente (expired/ended)
    await tx
      .update(subscriptions)
      .set({
        status: 'expired',
        endedAt: now,
      })
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          sql`${subscriptions.status} IN ('trialing', 'active', 'past_due')`
        )
      )

    // 2. Criar nova assinatura paga
    return await tx.insert(subscriptions).values({
      companyId,
      planId: targetPlan.id,
      status: 'active',
      currentPeriodStartsAt: now,
      currentPeriodEndsAt: nextPeriodEndsAt,
    }).returning()
  })
}
