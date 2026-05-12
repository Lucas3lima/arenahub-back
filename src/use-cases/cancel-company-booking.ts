import { BookingNotFoundError } from '../_errors/booking-not-found-error'
import type { BookingsRepository } from '../repositories/bookings-repository'
import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import { ensureCompanyContext } from './_guards/ensure-company-context'

interface CancelCompanyBookingUseCaseRequest {
  companySlug: string
  userId: string
  bookingId: string
  reason?: string
}

export class CancelCompanyBooking {
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
    reason,
  }: CancelCompanyBookingUseCaseRequest) {
    const now = new Date()
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

    const booking = await this.bookingsRepository.findByIdAndCompanyId(
      bookingId,
      company.id,
    )

    if (!booking) {
      throw new BookingNotFoundError()
    }

    if (booking.status === 'cancelled' || booking.status === 'expired') {
      return { booking }
    }

    const cancelledBooking = await this.bookingsRepository.updateById(
      booking.id,
      {
        status: 'cancelled',
        cancelledAt: now,
        cancelledByUserId: userId,
        cancellationReason: reason ?? null,
      },
    )

    if (!cancelledBooking) {
      throw new BookingNotFoundError()
    }

    return { booking: cancelledBooking }
  }
}
