import type { Plans } from '../../repositories/plans-repository'
import type { InMemoryCompaniesRepository } from '../../repositories/in-memory/in-memory-companies-repository'
import type { InMemoryCompanyUsersRepository } from '../../repositories/in-memory/in-memory-company-users-repository'
import type { InMemoryPlansRepository } from '../../repositories/in-memory/in-memory-plans-repository'
import type { InMemorySubscriptionsRepository } from '../../repositories/in-memory/in-memory-subscriptions-repository'

type MakeCompanyContextInput = {
  companiesRepository: InMemoryCompaniesRepository
  companyUsersRepository: InMemoryCompanyUsersRepository
  companyName?: string
  companySlug?: string
  ownerUserId?: string
  includeStaffUser?: boolean
}

export async function makeCompanyContext({
  companiesRepository,
  companyUsersRepository,
  companyName = 'Arena Hub',
  companySlug = 'arena-hub',
  ownerUserId = crypto.randomUUID(),
  includeStaffUser = false,
}: MakeCompanyContextInput) {
  const company = await companiesRepository.create({
    name: companyName,
    slug: companySlug,
  })

  await companyUsersRepository.create({
    companyId: company.id,
    userId: ownerUserId,
    role: 'owner',
  })

  const staffUserId = includeStaffUser ? crypto.randomUUID() : null

  if (staffUserId) {
    await companyUsersRepository.create({
      companyId: company.id,
      userId: staffUserId,
      role: 'staff',
    })
  }

  return {
    company,
    ownerUserId,
    staffUserId,
  }
}

export function makePlan(overrides: Partial<Plans> = {}): Plans {
  const now = new Date()

  return {
    id: crypto.randomUUID(),
    name: 'Growth',
    slug: 'growth',
    description: 'Growth plan',
    price: 399,
    maxCourts: 5,
    maxUsers: 8,
    maxFacilities: 2,
    trialDays: 0,
    hasAdvancedReports: true,
    hasCustomPermissions: true,
    hasCancellationPolicies: true,
    hasPublicPage: true,
    hasOnlineReservations: true,
    hasFinancialControl: true,
    hasOnlinePayment: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function seedPlan(
  plansRepository: InMemoryPlansRepository,
  overrides: Partial<Plans> = {},
) {
  const plan = makePlan(overrides)
  plansRepository.items.push(plan)
  return plan
}

type MakeActiveSubscriptionInput = {
  subscriptionsRepository: InMemorySubscriptionsRepository
  companyId: string
  planId: string
  status?: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'
  trialEndsAt?: Date | null
  daysUntilExpiration?: number
}

export async function makeActiveSubscription({
  subscriptionsRepository,
  companyId,
  planId,
  status = 'active',
  trialEndsAt = null,
  daysUntilExpiration = 1,
}: MakeActiveSubscriptionInput) {
  const now = new Date()
  const currentPeriodEndsAt = new Date(
    now.getTime() + daysUntilExpiration * 24 * 60 * 60 * 1000,
  )

  return subscriptionsRepository.create({
    companyId,
    planId,
    status,
    currentPeriodStartsAt: now,
    currentPeriodEndsAt,
    trialEndsAt,
  })
}
