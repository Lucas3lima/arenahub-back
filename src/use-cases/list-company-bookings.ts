import type { BookingsRepository } from '../repositories/bookings-repository'
import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import { ensureCompanyContext } from './_guards/ensure-company-context'

interface ListCompanyBookingsUseCaseRequest {
  companySlug: string
  userId: string
  startsAt: Date
  endsAt: Date
  courtId?: string
  status?: 'pending_payment' | 'confirmed' | 'cancelled' | 'expired'
}

export class ListCompanyBookings {
  constructor(
    private companiesRepository: CompaniesRepository,
    private companyUsersRepository: CompanyUsersRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
    private bookingsRepository: BookingsRepository,
  ) {}

  async execute({
    companySlug,
    userId,
    startsAt,
    endsAt,
    courtId,
    status,
  }: ListCompanyBookingsUseCaseRequest) {
    const now = new Date()
    const { company } = await ensureCompanyContext({
      companySlug,
      userId,
      allowedRoles: ['owner', 'admin'],
      requireActiveSubscription: true,
      companiesRepository: this.companiesRepository,
      companyUsersRepository: this.companyUsersRepository,
      subscriptionsRepository: this.subscriptionsRepository,
      plansRepository: this.plansRepository,
    })

    await this.bookingsRepository.expirePendingPayments({
      companyId: company.id,
      now,
    })

    const bookings = await this.bookingsRepository.listByCompanyInRange({
      companyId: company.id,
      startsAt,
      endsAt,
      courtId,
      status,
    })

    return { bookings }
  }
}
