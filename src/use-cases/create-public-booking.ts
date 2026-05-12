import { BookingSlotUnavailableError } from '../_errors/booking-slot-unavailable-error'
import { CourtNotFoundError } from '../_errors/court-not-found-error'
import { CourtUnavailableError } from '../_errors/court-unavailable-error'
import { FacilityNotFoundError } from '../_errors/facility-not-found-error'
import { OnlineReservationsNotAvailableError } from '../_errors/online-reservations-not-available-error'
import type { BookingsRepository } from '../repositories/bookings-repository'
import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CourtsRepository } from '../repositories/courts-repository'
import type { FacilitiesRepository } from '../repositories/facilities-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import {
  assertBookingWindowValid,
  assertWithinCourtOpeningHours,
  calculateBookingPrice,
} from '../utils/booking-schedule'
import { ensurePublicCompanyContext } from './_guards/ensure-public-company-context'

interface CreatePublicBookingUseCaseRequest {
  companySlug: string
  facilitySlug: string
  courtId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerDocument?: string
  startsAt: Date
  notes?: string
}

export class CreatePublicBooking {
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
    customerName,
    customerPhone,
    customerEmail,
    customerDocument,
    startsAt,
    notes,
  }: CreatePublicBookingUseCaseRequest) {
    const now = new Date()
    const { company, plan } = await ensurePublicCompanyContext({
      companySlug,
      companiesRepository: this.companiesRepository,
      subscriptionsRepository: this.subscriptionsRepository,
      plansRepository: this.plansRepository,
    })

    if (!plan.hasOnlineReservations) {
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

    if (!courtWithSettings || courtWithSettings.court.facilityId !== facility.id) {
      throw new CourtNotFoundError()
    }

    if (
      !courtWithSettings.court.isActive ||
      courtWithSettings.court.status !== 'open'
    ) {
      throw new CourtUnavailableError()
    }

    const endsAt = new Date(startsAt)
    endsAt.setUTCMinutes(
      endsAt.getUTCMinutes() + courtWithSettings.court.rentalDurationMinutes,
    )

    assertBookingWindowValid({ startsAt, endsAt })
    assertWithinCourtOpeningHours({
      startsAt,
      endsAt,
      openingHours: courtWithSettings.openingHours,
    })

    if (startsAt <= now) {
      throw new BookingSlotUnavailableError()
    }

    const price = calculateBookingPrice({
      basePriceCents: courtWithSettings.court.basePriceCents,
      weekdayPrices: courtWithSettings.weekdayPrices,
      startsAt,
    })

    const status = plan.hasOnlinePayment ? 'pending_payment' : 'confirmed'
    const paymentExpiresAt = plan.hasOnlinePayment ? addMinutes(now, 15) : null
    const booking = await this.bookingsRepository.createWithAvailabilityCheck({
      booking: {
        companyId: company.id,
        courtId,
        customerName,
        customerPhone: customerPhone ?? null,
        customerEmail: customerEmail ?? null,
        customerDocument: customerDocument ?? null,
        startsAt,
        endsAt,
        status,
        source: 'public',
        createdByUserId: null,
        notes: notes ?? null,
        totalPriceCents: price.totalPriceCents,
        pricingRule: price.pricingRule,
        paymentStatus: 'unpaid',
        paymentMethod: null,
        paidAt: null,
        externalPaymentId: null,
        paymentExpiresAt,
      },
      now,
    })

    if (!booking) {
      throw new BookingSlotUnavailableError()
    }

    return {
      booking,
      paymentMode: plan.hasOnlinePayment
        ? ('online_or_counter' as const)
        : ('counter_only' as const),
    }
  }
}

function addMinutes(baseDate: Date, minutes: number) {
  const date = new Date(baseDate)
  date.setUTCMinutes(date.getUTCMinutes() + minutes)
  return date
}
