import { BookingSlotUnavailableError } from '../_errors/booking-slot-unavailable-error'
import { CourtNotFoundError } from '../_errors/court-not-found-error'
import { CourtUnavailableError } from '../_errors/court-unavailable-error'
import { FacilityNotFoundError } from '../_errors/facility-not-found-error'
import type { BookingsRepository } from '../repositories/bookings-repository'
import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { CourtsRepository } from '../repositories/courts-repository'
import type { FacilitiesRepository } from '../repositories/facilities-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import {
  assertBookingWindowValid,
  assertWithinCourtOpeningHours,
  calculateBookingPrice,
} from '../utils/booking-schedule'
import { ensureCompanyContext } from './_guards/ensure-company-context'

interface CreateCompanyBookingUseCaseRequest {
  companySlug: string
  userId: string
  courtId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerDocument?: string
  startsAt: Date
  status?: 'pending_payment' | 'confirmed'
  notes?: string
}

export class CreateCompanyBooking {
  constructor(
    private companiesRepository: CompaniesRepository,
    private companyUsersRepository: CompanyUsersRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
    private courtsRepository: CourtsRepository,
    private facilitiesRepository: FacilitiesRepository,
    private bookingsRepository: BookingsRepository,
  ) {}

  async execute({
    companySlug,
    userId,
    courtId,
    customerName,
    customerPhone,
    customerEmail,
    customerDocument,
    startsAt,
    status = 'confirmed',
    notes,
  }: CreateCompanyBookingUseCaseRequest) {
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

    const courtWithSettings = await this.courtsRepository.findById(courtId)
    if (!courtWithSettings) {
      throw new CourtNotFoundError()
    }

    const facility = await this.facilitiesRepository.findByIdAndCompanyId(
      courtWithSettings.court.facilityId,
      company.id,
    )

    if (!facility) {
      throw new FacilityNotFoundError()
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
        source: 'staff',
        createdByUserId: userId,
        notes: notes ?? null,
        totalPriceCents: price.totalPriceCents,
        pricingRule: price.pricingRule,
        paymentStatus: 'unpaid',
        paymentMethod: null,
        paidAt: null,
        externalPaymentId: null,
        paymentExpiresAt:
          status === 'pending_payment' ? addMinutes(now, 90) : null,
      },
      now,
    })

    if (!booking) {
      throw new BookingSlotUnavailableError()
    }

    return { booking }
  }
}

function addMinutes(baseDate: Date, minutes: number) {
  const result = new Date(baseDate)
  result.setUTCMinutes(result.getUTCMinutes() + minutes)
  return result
}
