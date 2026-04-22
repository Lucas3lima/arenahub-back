import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import type { CompaniesRepository, Companies } from '../../repositories/companies-repository'
import type {
  CompanyUsersRepository,
  CompanyUsers,
} from '../../repositories/company-users-repository'
import type { PlansRepository, Plans } from '../../repositories/plans-repository'
import type {
  SubscriptionsRepository,
  Subscription,
} from '../../repositories/subscriptions-repository'

type CompanyRole = CompanyUsers['role']

type EnsureCompanyContextBaseRequest = {
  companySlug: string
  userId: string
  allowedRoles: CompanyRole[]
}

type EnsureCompanyContextWithActiveSubscription =
  EnsureCompanyContextBaseRequest & {
    requireActiveSubscription: true
  }

type EnsureCompanyContextWithoutActiveSubscription =
  EnsureCompanyContextBaseRequest & {
    requireActiveSubscription?: false
  }

type EnsureCompanyContextDeps = {
  companiesRepository: CompaniesRepository
  companyUsersRepository: CompanyUsersRepository
  subscriptionsRepository: SubscriptionsRepository
  plansRepository: PlansRepository
}

type EnsureCompanyContextWithSubscriptionResult = {
  company: Companies
  companyUser: CompanyUsers
  subscription: Subscription
  plan: Plans
}

type EnsureCompanyContextWithoutSubscriptionResult = {
  company: Companies
  companyUser: CompanyUsers
  subscription: null
  plan: null
}

export async function ensureCompanyContext(
  params: EnsureCompanyContextDeps & EnsureCompanyContextWithActiveSubscription,
): Promise<EnsureCompanyContextWithSubscriptionResult>
export async function ensureCompanyContext(
  params: EnsureCompanyContextDeps & EnsureCompanyContextWithoutActiveSubscription,
): Promise<EnsureCompanyContextWithoutSubscriptionResult>
export async function ensureCompanyContext(
  params:
    | (EnsureCompanyContextDeps & EnsureCompanyContextWithActiveSubscription)
    | (EnsureCompanyContextDeps & EnsureCompanyContextWithoutActiveSubscription),
): Promise<
  | EnsureCompanyContextWithSubscriptionResult
  | EnsureCompanyContextWithoutSubscriptionResult
> {
  const company = await params.companiesRepository.findBySlug(params.companySlug)

  if (!company) {
    throw new CompanyNotFoundError()
  }

  const companyUser =
    await params.companyUsersRepository.findByCompanyIdAndUserId(
      company.id,
      params.userId,
    )

  if (!companyUser || !params.allowedRoles.includes(companyUser.role)) {
    throw new UnauthorizedCompanyAccessError()
  }

  if (!params.requireActiveSubscription) {
    return {
      company,
      companyUser,
      subscription: null,
      plan: null,
    }
  }

  const subscription =
    await params.subscriptionsRepository.findActiveByCompanyId(company.id)

  if (!subscription) {
    throw new ActiveSubscriptionRequiredError()
  }

  const plan = await params.plansRepository.findById(subscription.planId)

  if (!plan) {
    throw new PlanNotFoundError()
  }

  return {
    company,
    companyUser,
    subscription,
    plan,
  }
}
