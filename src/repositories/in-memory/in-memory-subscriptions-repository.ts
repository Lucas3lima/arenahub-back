import type { InMemoryCompanyUsersRepository } from './in-memory-company-users-repository'
import type { InMemoryPlansRepository } from './in-memory-plans-repository'
import type {
  CreateSubscriptionInput,
  Subscription,
  SubscriptionsRepository,
  UpdateSubscriptionInput,
} from '../subscriptions-repository'

const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due'] as const

type InMemorySubscriptionsDeps = {
  companyUsersRepository?: InMemoryCompanyUsersRepository
  plansRepository?: InMemoryPlansRepository
}

export class InMemorySubscriptionsRepository
  implements SubscriptionsRepository
{
  public items: Subscription[] = []

  private companyUsersRepository?: InMemoryCompanyUsersRepository
  private plansRepository?: InMemoryPlansRepository

  constructor(deps: InMemorySubscriptionsDeps = {}) {
    this.companyUsersRepository = deps.companyUsersRepository
    this.plansRepository = deps.plansRepository
  }

  async create(data: CreateSubscriptionInput) {
    const subscription: Subscription = {
      id: data.id ?? crypto.randomUUID(),
      companyId: data.companyId,
      planId: data.planId,
      status: data.status ?? 'active',
      currentPeriodStartsAt: data.currentPeriodStartsAt,
      currentPeriodEndsAt: data.currentPeriodEndsAt,
      trialEndsAt: data.trialEndsAt ?? null,
      cancelledAt: data.cancelledAt ?? null,
      endedAt: data.endedAt ?? null,
      externalSubscriptionId: data.externalSubscriptionId ?? null,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    }

    this.items.push(subscription)
    return subscription
  }

  async findById(id: string) {
    const subscription = this.items.find((item) => item.id === id)
    return subscription ?? null
  }

  async findActiveByCompanyId(companyId: string) {
    const now = new Date()

    const subscriptions = this.items
      .filter(
        (item) =>
          item.companyId === companyId &&
          ACTIVE_SUBSCRIPTION_STATUSES.includes(
            item.status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number],
          ) &&
          item.currentPeriodEndsAt >= now,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return subscriptions.at(0) ?? null
  }

  async listByCompanyId(companyId: string) {
    return this.items
      .filter((item) => item.companyId === companyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async updateById(id: string, data: UpdateSubscriptionInput) {
    const subscriptionIndex = this.items.findIndex((item) => item.id === id)

    if (subscriptionIndex < 0) {
      return null
    }

    const currentSubscription = this.items[subscriptionIndex]
    const updatedSubscription: Subscription = {
      ...currentSubscription,
      ...data,
      updatedAt: new Date(),
    }

    this.items[subscriptionIndex] = updatedSubscription
    return updatedSubscription
  }

  async hasUserUsedTrial(userId: string) {
    if (!this.companyUsersRepository || !this.plansRepository) {
      return false
    }

    const userOwnedCompanyIds = new Set(
      this.companyUsersRepository.items
        .filter((item) => item.userId === userId && item.role === 'owner')
        .map((item) => item.companyId),
    )

    if (userOwnedCompanyIds.size === 0) {
      return false
    }

    return this.items.some((subscription) => {
      if (!userOwnedCompanyIds.has(subscription.companyId)) {
        return false
      }

      if (subscription.status === 'trialing') {
        return true
      }

      const plan = this.plansRepository?.items.find(
        (item) => item.id === subscription.planId,
      )

      return plan?.slug === 'free_trial'
    })
  }
}
