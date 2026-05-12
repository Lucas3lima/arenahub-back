import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import type { CompaniesRepository } from '../../repositories/companies-repository'
import type { PlansRepository } from '../../repositories/plans-repository'
import type { SubscriptionsRepository } from '../../repositories/subscriptions-repository'

type EnsurePublicCompanyContextParams = {
  companySlug: string
  companiesRepository: CompaniesRepository
  subscriptionsRepository: SubscriptionsRepository
  plansRepository: PlansRepository
}

export async function ensurePublicCompanyContext(
  params: EnsurePublicCompanyContextParams,
) {
  const company = await params.companiesRepository.findBySlug(params.companySlug)

  if (!company) {
    throw new CompanyNotFoundError()
  }

  const subscription = await params.subscriptionsRepository.findActiveByCompanyId(
    company.id,
  )

  if (!subscription) {
    throw new ActiveSubscriptionRequiredError()
  }

  const plan = await params.plansRepository.findById(subscription.planId)

  if (!plan) {
    throw new PlanNotFoundError()
  }

  return { company, subscription, plan }
}
