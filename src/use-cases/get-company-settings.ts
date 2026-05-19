import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import { resolveCompanyFeatureSettings } from '../utils/company-feature-settings'
import { ensureCompanyContext } from './_guards/ensure-company-context'

interface GetCompanySettingsRequest {
  companySlug: string
  userId: string
}

export class GetCompanySettings {
  constructor(
    private companiesRepository: CompaniesRepository,
    private companyUsersRepository: CompanyUsersRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
  ) {}

  async execute({ companySlug, userId }: GetCompanySettingsRequest) {
    const { company, plan } = await ensureCompanyContext({
      companySlug,
      userId,
      allowedRoles: ['owner', 'admin'],
      requireActiveSubscription: true,
      companiesRepository: this.companiesRepository,
      companyUsersRepository: this.companyUsersRepository,
      subscriptionsRepository: this.subscriptionsRepository,
      plansRepository: this.plansRepository,
    })
    const effective = resolveCompanyFeatureSettings({ company, plan })

    return {
      company,
      plan: {
        slug: plan.slug,
        name: plan.name,
        hasOnlineReservations: plan.hasOnlineReservations,
        hasOnlinePayment: plan.hasOnlinePayment,
      },
      settings: {
        onlineReservationsEnabled: company.onlineReservationsEnabled,
        onlinePaymentEnabled: company.onlinePaymentEnabled,
        onlineBookingRequiresDeposit: company.onlineBookingRequiresDeposit,
        onlineBookingDepositPercent: company.onlineBookingDepositPercent,
      },
      effective,
    }
  }
}
