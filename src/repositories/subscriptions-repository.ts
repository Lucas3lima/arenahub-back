import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { subscriptions } from '../db/schema'

export type Subscription = InferSelectModel<typeof subscriptions>
export type CreateSubscriptionInput = InferInsertModel<typeof subscriptions>
export type UpdateSubscriptionInput = Partial<
  Pick<
    CreateSubscriptionInput,
    | 'status'
    | 'currentPeriodStartsAt'
    | 'currentPeriodEndsAt'
    | 'trialEndsAt'
    | 'cancelledAt'
    | 'endedAt'
    | 'externalSubscriptionId'
  >
>

export interface SubscriptionsRepository {
  /**
   * Cria uma nova assinatura no histórico da empresa.
   * Uso: fluxo de assinatura inicial, renovação e troca de plano.
   */
  create(data: CreateSubscriptionInput): Promise<Subscription>

  /**
   * Busca uma assinatura específica pelo ID.
   * Uso: endpoints internos de billing, auditoria e suporte.
   */
  findById(id: string): Promise<Subscription | null>

  /**
   * Retorna a assinatura ativa atual da empresa.
   * Uso: validações backend de acesso a recursos por plano e futuro middleware.
   */
  findActiveByCompanyId(companyId: string): Promise<Subscription | null>

  /**
   * Lista o histórico de assinaturas da empresa, da mais recente para a mais antiga.
   * Uso: tela de histórico de cobrança e auditoria.
   */
  listByCompanyId(companyId: string): Promise<Subscription[]>

  /**
   * Atualiza campos permitidos de uma assinatura existente.
   * Uso: cancelamento, expiração e ajustes internos de ciclo.
   */
  updateById(
    id: string,
    data: UpdateSubscriptionInput,
  ): Promise<Subscription | null>

  /**
   * Verifica se o usuário já utilizou trial em alguma empresa onde era owner.
   * Uso: bloquear múltiplos trials no onboarding inicial.
   */
  hasUserUsedTrial(userId: string): Promise<boolean>
}
