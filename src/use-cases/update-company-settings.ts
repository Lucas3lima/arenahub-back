import { CompanyFeatureNotAllowedByPlanError } from '../_errors/company-feature-not-allowed-by-plan-error'
import { InvalidCompanySettingsError } from '../_errors/invalid-company-settings-error'
import type {
  CompaniesRepository,
  UpdateCompanySettingsInput,
} from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import { resolveCompanyFeatureSettings } from '../utils/company-feature-settings'
import { ensureCompanyContext } from './_guards/ensure-company-context'

interface UpdateCompanySettingsRequest {
  companySlug: string
  userId: string
  onlineReservationsEnabled?: boolean
  onlinePaymentEnabled?: boolean
  onlineBookingRequiresDeposit?: boolean
  onlineBookingDepositPercent?: number
}

export class UpdateCompanySettings {
  constructor(
    private companiesRepository: CompaniesRepository,
    private companyUsersRepository: CompanyUsersRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
  ) {}

  async execute({
    companySlug,
    userId,
    onlineReservationsEnabled,
    onlinePaymentEnabled,
    onlineBookingRequiresDeposit,
    onlineBookingDepositPercent,
  }: UpdateCompanySettingsRequest) {
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

    const nextOnlineReservationsEnabled =
      onlineReservationsEnabled ?? company.onlineReservationsEnabled
    const nextOnlinePaymentEnabled =
      onlinePaymentEnabled ?? company.onlinePaymentEnabled
    const nextOnlineBookingRequiresDeposit =
      onlineBookingRequiresDeposit ?? company.onlineBookingRequiresDeposit
    let nextOnlineBookingDepositPercent =
      onlineBookingDepositPercent ?? company.onlineBookingDepositPercent

    if (nextOnlineReservationsEnabled && !plan.hasOnlineReservations) {
      throw new CompanyFeatureNotAllowedByPlanError(
        'O plano atual não permite ativar reservas online.',
      )
    }

    if (nextOnlinePaymentEnabled && !plan.hasOnlinePayment) {
      throw new CompanyFeatureNotAllowedByPlanError(
        'O plano atual não permite ativar pagamento online.',
      )
    }

    if (nextOnlinePaymentEnabled && !nextOnlineReservationsEnabled) {
      throw new InvalidCompanySettingsError(
        'Para ativar pagamento online é necessário ter reservas online ativas.',
      )
    }

    if (
      nextOnlineBookingRequiresDeposit &&
      (!nextOnlinePaymentEnabled || !plan.hasOnlinePayment)
    ) {
      throw new InvalidCompanySettingsError(
        'Para exigir entrada online é necessário ter pagamento online ativo.',
      )
    }

    if (nextOnlineBookingRequiresDeposit) {
      if (
        !Number.isInteger(nextOnlineBookingDepositPercent) ||
        nextOnlineBookingDepositPercent < 1 ||
        nextOnlineBookingDepositPercent > 100
      ) {
        throw new InvalidCompanySettingsError(
          'O percentual da entrada deve ser um inteiro entre 1 e 100.',
        )
      }
    } else {
      nextOnlineBookingDepositPercent = 0
    }

    const updatePayload: UpdateCompanySettingsInput = {
      onlineReservationsEnabled: nextOnlineReservationsEnabled,
      onlinePaymentEnabled: nextOnlinePaymentEnabled,
      onlineBookingRequiresDeposit: nextOnlineBookingRequiresDeposit,
      onlineBookingDepositPercent: nextOnlineBookingDepositPercent,
    }

    const updated = await this.companiesRepository.updateSettingsById(
      company.id,
      updatePayload,
    )

    if (!updated) {
      throw new InvalidCompanySettingsError(
        'Não foi possível atualizar as configurações.',
      )
    }

    const effective = resolveCompanyFeatureSettings({
      company: updated,
      plan,
    })

    return {
      company: updated,
      plan: {
        slug: plan.slug,
        name: plan.name,
        hasOnlineReservations: plan.hasOnlineReservations,
        hasOnlinePayment: plan.hasOnlinePayment,
      },
      settings: {
        onlineReservationsEnabled: updated.onlineReservationsEnabled,
        onlinePaymentEnabled: updated.onlinePaymentEnabled,
        onlineBookingRequiresDeposit: updated.onlineBookingRequiresDeposit,
        onlineBookingDepositPercent: updated.onlineBookingDepositPercent,
      },
      effective,
    }
  }
}
