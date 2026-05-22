import { CourtNotFoundError } from '../../_errors/court-not-found-error'
import { CourtUnavailableError } from '../../_errors/court-unavailable-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { OnlineReservationsNotAvailableError } from '../../_errors/online-reservations-not-available-error'
import type { BookingsRepository } from '../../repositories/bookings-repository'
import type { CompaniesRepository } from '../../repositories/companies-repository'
import type { CourtsRepository } from '../../repositories/courts-repository'
import type { FacilitiesRepository } from '../../repositories/facilities-repository'
import type { PlansRepository } from '../../repositories/plans-repository'
import type { SubscriptionsRepository } from '../../repositories/subscriptions-repository'
import {
  calculateBookingPrice,
  generateDaySlots,
  getUtcDayBounds,
  overlaps,
} from '../../utils/booking-schedule'
import { resolveCompanyFeatureSettings } from '../../utils/company-feature-settings'
import { ensurePublicCompanyContext } from '../_guards/ensure-public-company-context'

interface GetPublicCourtAvailabilityUseCaseRequest {
  companySlug: string
  facilitySlug: string
  courtId: string
  date: string
}

export class GetPublicCourtAvailability {
  constructor(
    private companiesRepository: CompaniesRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
    private facilitiesRepository: FacilitiesRepository,
    private courtsRepository: CourtsRepository,
    private bookingsRepository: BookingsRepository,
  ) {}

  async execute({
    companySlug,
    facilitySlug,
    courtId,
    date,
  }: GetPublicCourtAvailabilityUseCaseRequest) {
    const now = new Date()
    const { startsAt: dayStartsAt, endsAt: dayEndsAt } = getUtcDayBounds(date)
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
    const facility = await this.facilitiesRepository.findBySlugAndCompanyId(
      facilitySlug,
      company.id,
    )

    if (!facility) {
      throw new FacilityNotFoundError()
    }
    const courtWithSettings = await this.courtsRepository.findById(courtId)

    if (!courtWithSettings) {
      throw new CourtNotFoundError()
    }

    if (courtWithSettings.court.facilityId !== facility.id) {
      throw new CourtNotFoundError()
    }

    if (
      !courtWithSettings.court.isActive ||
      courtWithSettings.court.status !== 'open'
    ) {
      throw new CourtUnavailableError()
    }

    await this.bookingsRepository.expirePendingPaymentHolds({
      companyId: company.id,
      courtId,
      now,
    })

    const blockingIntervals =
      await this.bookingsRepository.listBlockingIntervals({
        companyId: company.id,
        courtId,
        startsAt: dayStartsAt,
        endsAt: dayEndsAt,
        now,
      })

    const candidateSlots = generateDaySlots({
      dayDate: dayStartsAt,
      openingHours: courtWithSettings.openingHours,
      durationMinutes: courtWithSettings.court.rentalDurationMinutes,
      bufferMinutes: courtWithSettings.court.bufferMinutes,
    })

    const price = calculateBookingPrice({
      basePriceCents: courtWithSettings.court.basePriceCents,
      weekdayPrices: courtWithSettings.weekdayPrices,
      startsAt: dayStartsAt,
    })

    return {
      court: courtWithSettings.court,
      slots: candidateSlots.map((slot) => {
        const isAvailable = !blockingIntervals.some((interval) =>
          overlaps(slot, interval),
        )

        return {
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          isAvailable,
          totalPriceCents: price.totalPriceCents,
          pricingRule: price.pricingRule,
        }
      }),
      paymentMode: features.canUseOnlinePayment
        ? ('online_or_counter' as const)
        : ('counter_only' as const),
      requiresOnlineDeposit: features.requiresOnlineDeposit,
      depositPercent: features.depositPercent,
    }
  }
}
