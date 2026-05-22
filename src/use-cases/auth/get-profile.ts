import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UserNotFoundError } from '../../_errors/user-not-found-error'
import type { CompaniesRepository } from '../../repositories/companies-repository'
import type { CompanyUsersRepository } from '../../repositories/company-users-repository'
import type { PlansRepository } from '../../repositories/plans-repository'
import type { SubscriptionsRepository } from '../../repositories/subscriptions-repository'
import type { UsersRepository } from '../../repositories/users-repository'

type CompanyRole = 'owner' | 'admin' | 'staff'

interface GetProfileUseCaseRequest {
  userId: string
}

export interface GetProfileUseCaseResponse {
  user: {
    id: string
    name: string
    email: string
    createdAt: Date
  }
  company: null | {
    id: string
    name: string
    slug: string
    isActive: boolean
    role: CompanyRole
  }
  subscription: null | {
    id: string
    status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'
    currentPeriodEndsAt: Date
    trialEndsAt: Date | null
    plan: {
      slug: string
      name: string
    }
  }
  onboarding: {
    hasCompany: boolean
    hasActiveSubscription: boolean
    canManageBilling: boolean
    canManageCompanySettings: boolean
  }
}

export class GetProfile {
  constructor(
    private usersRepository: UsersRepository,
    private companyUsersRepository: CompanyUsersRepository,
    private companiesRepository: CompaniesRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
  ) {}

  async execute({
    userId,
  }: GetProfileUseCaseRequest): Promise<GetProfileUseCaseResponse> {
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundError()
    }

    const companyUser = await this.companyUsersRepository.findByUserId(userId)

    if (!companyUser) {
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        company: null,
        subscription: null,
        onboarding: {
          hasCompany: false,
          hasActiveSubscription: false,
          canManageBilling: false,
          canManageCompanySettings: false,
        },
      }
    }

    const company = await this.companiesRepository.findById(companyUser.companyId)

    if (!company) {
      throw new CompanyNotFoundError()
    }

    const activeSubscription =
      await this.subscriptionsRepository.findActiveByCompanyId(company.id)

    let subscription: GetProfileUseCaseResponse['subscription'] = null

    if (activeSubscription) {
      const plan = await this.plansRepository.findById(activeSubscription.planId)

      if (!plan) {
        throw new PlanNotFoundError()
      }

      subscription = {
        id: activeSubscription.id,
        status: activeSubscription.status,
        currentPeriodEndsAt: activeSubscription.currentPeriodEndsAt,
        trialEndsAt: activeSubscription.trialEndsAt,
        plan: {
          slug: plan.slug,
          name: plan.name,
        },
      }
    }

    const role = companyUser.role as CompanyRole
    const canManageBilling = role === 'owner'
    const canManageCompanySettings = role === 'owner' || role === 'admin'

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        isActive: company.isActive,
        role,
      },
      subscription,
      onboarding: {
        hasCompany: true,
        hasActiveSubscription: !!subscription,
        canManageBilling,
        canManageCompanySettings,
      },
    }
  }
}
