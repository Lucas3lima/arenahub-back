import { BookingNotFoundError } from '../../_errors/booking-not-found-error'
import { OnlineReservationsNotAvailableError } from '../../_errors/online-reservations-not-available-error'
import type { BookingsRepository } from '../../repositories/bookings-repository'
import type { CompaniesRepository } from '../../repositories/companies-repository'
import type { PlansRepository } from '../../repositories/plans-repository'
import type { SubscriptionsRepository } from '../../repositories/subscriptions-repository'
import { resolveCompanyFeatureSettings } from '../../utils/company-feature-settings'
import { ensurePublicCompanyContext } from '../_guards/ensure-public-company-context'

interface GetPublicBookingDetailsUseCaseRequest {
  companySlug: string
  bookingId: string
}

export class GetPublicBookingDetails {
  constructor(
    private companiesRepository: CompaniesRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
    private bookingsRepository: BookingsRepository,
  ) {}

  async execute({
    companySlug,
    bookingId,
  }: GetPublicBookingDetailsUseCaseRequest) {
    const now = new Date()
    const { company, plan } = await ensurePublicCompanyContext({
      companySlug,
      companiesRepository: this.companiesRepository,
      subscriptionsRepository: this.subscriptionsRepository,
      plansRepository: this.plansRepository,
    })

    const features = resolveCompanyFeatureSettings({ company, plan })

    if (!features.canUseOnlineReservations) {
      throw new OnlineReservationsNotAvailableError()
    }

    await this.bookingsRepository.expirePendingPaymentHolds({
      companyId: company.id,
      now,
    })

    const booking = await this.bookingsRepository.findWithContextByIdAndCompanyId(
      bookingId,
      company.id,
    )

    if (!booking) {
      throw new BookingNotFoundError()
    }

    return {
      booking,
      canPayOnline: features.canUseOnlinePayment,
      requiresOnlineDeposit: booking.booking.depositPercent > 0,
      depositPercent: booking.booking.depositPercent,
      depositAmountCents: booking.booking.depositAmountCents,
    }
  }
}
