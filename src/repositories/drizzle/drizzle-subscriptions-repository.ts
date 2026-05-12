import { and, desc, eq, gte, inArray, or } from 'drizzle-orm'
import { db } from '../../db'
import { companyUsers, plans, subscriptions } from '../../db/schema'
import type {
  CreateSubscriptionInput,
  SubscriptionsRepository,
  UpdateSubscriptionInput,
} from '../subscriptions-repository'

const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due'] as const

export class DrizzleSubscriptionsRepository implements SubscriptionsRepository {
  /**
   * Cria uma nova assinatura no histórico da empresa.
   * Uso: fluxo de assinatura inicial, renovação e troca de plano.
   */
  async create(data: CreateSubscriptionInput) {
    const [subscription] = await db.insert(subscriptions).values(data).returning()
    return subscription
  }

  /**
   * Busca uma assinatura específica pelo ID.
   * Uso: endpoints internos de billing, auditoria e suporte.
   */
  async findById(id: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1)

    if (!subscription) {
      return null
    }

    return subscription
  }

  /**
   * Retorna a assinatura ativa atual da empresa.
   * Uso: validações backend de acesso a recursos por plano e futuro middleware.
   */
  async findActiveByCompanyId(companyId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          inArray(subscriptions.status, ACTIVE_SUBSCRIPTION_STATUSES),
          gte(subscriptions.currentPeriodEndsAt, new Date()),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)

    if (!subscription) {
      return null
    }

    return subscription
  }

  /**
   * Retorna a assinatura mais recente que pode colidir com o índice único de assinatura ativa.
   * Uso: criação de nova assinatura após período encerrado com status legado.
   */
  async findConflictingByCompanyId(companyId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          inArray(subscriptions.status, ACTIVE_SUBSCRIPTION_STATUSES),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)

    if (!subscription) {
      return null
    }

    return subscription
  }

  /**
   * Lista o histórico de assinaturas da empresa, da mais recente para a mais antiga.
   * Uso: tela de histórico de cobrança e auditoria.
   */
  async listByCompanyId(companyId: string) {
    return db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.companyId, companyId))
      .orderBy(desc(subscriptions.createdAt))
  }

  /**
   * Atualiza campos permitidos de uma assinatura existente.
   * Uso: cancelamento, expiração e ajustes internos de ciclo.
   */
  async updateById(id: string, data: UpdateSubscriptionInput) {
    const [subscription] = await db
      .update(subscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning()

    if (!subscription) {
      return null
    }

    return subscription
  }

  /**
   * Verifica se o usuário já utilizou trial em alguma empresa onde era owner.
   * Uso: bloquear múltiplos trials no onboarding inicial.
   */
  async hasUserUsedTrial(userId: string) {
    const [trialSubscription] = await db
      .select({
        id: subscriptions.id,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .innerJoin(companyUsers, eq(companyUsers.companyId, subscriptions.companyId))
      .where(
        and(
          eq(companyUsers.userId, userId),
          eq(companyUsers.role, 'owner'),
          or(eq(plans.slug, 'free_trial'), eq(subscriptions.status, 'trialing')),
        ),
      )
      .limit(1)

    return !!trialSubscription
  }
}
