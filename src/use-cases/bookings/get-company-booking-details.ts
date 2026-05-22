import { BookingNotFoundError } from '../../_errors/booking-not-found-error'
import type { BookingsRepository } from '../../repositories/bookings-repository'
import type { CompaniesRepository } from '../../repositories/companies-repository'
import type { CompanyUsersRepository } from '../../repositories/company-users-repository'
import type { PlansRepository } from '../../repositories/plans-repository'
import type { SubscriptionsRepository } from '../../repositories/subscriptions-repository'
import { ensureCompanyContext } from '../_guards/ensure-company-context'

interface GetCompanyBookingDetailsUseCaseRequest {
  companySlug: string
  userId: string
  bookingId: string
}

export class GetCompanyBookingDetails {
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
    bookingId,
  }: GetCompanyBookingDetailsUseCaseRequest) {
    const { company } = await ensureCompanyContext({
      companySlug,
      userId,
      allowedRoles: ['owner', 'admin', 'staff'],
      requireActiveSubscription: true,
      companiesRepository: this.companiesRepository,
      companyUsersRepository: this.companyUsersRepository,
      subscriptionsRepository: this.subscriptionsRepository,
      plansRepository: this.plansRepository,
    })

    const booking =
      await this.bookingsRepository.findWithContextByIdAndCompanyId(
        bookingId,
        company.id,
      )

    if (!booking) {
      throw new BookingNotFoundError()
    }

    return { booking }
  }
}
