import { CompanyAlreadyHasActiveSubscriptionError } from '../_errors/company-already-has-active-subscription-error'
import { CompanyNotFoundError } from '../_errors/company-not-found-error'
import { InvalidSubscriptionPeriodError } from '../_errors/invalid-subscription-period-error'
import { PlanInactiveError } from '../_errors/plan-inactive-error'
import { PlanNotFoundError } from '../_errors/plan-not-found-error'
import { TrialAlreadyUsedError } from '../_errors/trial-already-used-error'
import { UnauthorizedCompanyAccessError } from '../_errors/unauthorized-company-access-error'
import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'

interface CreateSubscriptionUseCaseRequest {
  companySlug: string
  userId: string
  planSlug: string
}

export class CreateSubscription {
  private companiesRepository: CompaniesRepository
  private companyUsersRepository: CompanyUsersRepository
  private plansRepository: PlansRepository
  private subscriptionsRepository: SubscriptionsRepository

  constructor(
    companiesRepository: CompaniesRepository,
    companyUsersRepository: CompanyUsersRepository,
    plansRepository: PlansRepository,
    subscriptionsRepository: SubscriptionsRepository,
  ) {
    this.companiesRepository = companiesRepository
    this.companyUsersRepository = companyUsersRepository
    this.plansRepository = plansRepository
    this.subscriptionsRepository = subscriptionsRepository
  }

  async execute({
    companySlug,
    userId,
    planSlug,
  }: CreateSubscriptionUseCaseRequest) {
    const company = await this.companiesRepository.findBySlug(companySlug)

    if (!company) {
      throw new CompanyNotFoundError()
    }

    const companyUser =
      await this.companyUsersRepository.findByCompanyIdAndUserId(
        company.id,
        userId,
      )

    if (!companyUser || companyUser.role !== 'owner') {
      throw new UnauthorizedCompanyAccessError()
    }

    const plan = await this.plansRepository.findBySlug(planSlug)

    if (!plan) {
      throw new PlanNotFoundError()
    }

    if (!plan.isActive) {
      throw new PlanInactiveError()
    }

    const activeSubscription =
      await this.subscriptionsRepository.findActiveByCompanyId(company.id)

    if (activeSubscription) {
      throw new CompanyAlreadyHasActiveSubscriptionError()
    }

    const now = new Date()
    let status: 'trialing' | 'active' = 'active'
    let trialEndsAt: Date | null = null
    let currentPeriodEndsAt = addDays(now, 30)

    if (plan.slug === 'free_trial') {
      const hasUsedTrial =
        await this.subscriptionsRepository.hasUserUsedTrial(userId)

      if (hasUsedTrial) {
        throw new TrialAlreadyUsedError()
      }

      status = 'trialing'
      trialEndsAt = addDays(now, plan.trialDays)
      currentPeriodEndsAt = trialEndsAt
    }

    if (now >= currentPeriodEndsAt) {
      throw new InvalidSubscriptionPeriodError()
    }

    const subscription = await this.subscriptionsRepository.create({
      companyId: company.id,
      planId: plan.id,
      status,
      currentPeriodStartsAt: now,
      currentPeriodEndsAt,
      trialEndsAt,
    })

    return {
      subscription,
    }
  }
}

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + days)
  return date
}
