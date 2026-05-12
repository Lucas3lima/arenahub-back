import type {
  Booking,
  BookingsRepository,
  Class,
  CreateBookingInput,
  Membership,
  UpdateBookingInput,
} from '../bookings-repository'
import type { InMemoryCourtsRepository } from './in-memory-courts-repository'
import type { InMemoryFacilitiesRepository } from './in-memory-facilities-repository'

const BLOCKING_STATUSES = new Set<Booking['status']>([
  'confirmed',
  'pending_payment',
])

export class InMemoryBookingsRepository implements BookingsRepository {
  public items: Booking[] = []
  public memberships: Membership[] = []
  public classes: Class[] = []
  private now = () => new Date()

  constructor(
    private courtsRepository: InMemoryCourtsRepository,
    private facilitiesRepository: InMemoryFacilitiesRepository,
  ) {}

  async create(data: CreateBookingInput) {
    const booking: Booking = {
      id: crypto.randomUUID(),
      companyId: data.companyId,
      courtId: data.courtId,
      customerName: data.customerName,
      customerPhone: data.customerPhone ?? null,
      customerEmail: data.customerEmail ?? null,
      customerDocument: data.customerDocument ?? null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      status: data.status ?? 'pending_payment',
      source: data.source ?? 'public',
      createdByUserId: data.createdByUserId ?? null,
      notes: data.notes ?? null,
      totalPriceCents: data.totalPriceCents,
      pricingRule: data.pricingRule ?? 'base',
      paymentStatus: data.paymentStatus ?? 'unpaid',
      paymentMethod: data.paymentMethod ?? null,
      paidAt: data.paidAt ?? null,
      externalPaymentId: data.externalPaymentId ?? null,
      paymentExpiresAt: data.paymentExpiresAt ?? null,
      cancelledAt: data.cancelledAt ?? null,
      cancelledByUserId: data.cancelledByUserId ?? null,
      cancellationReason: data.cancellationReason ?? null,
      createdAt: this.now(),
      updatedAt: this.now(),
    }

    this.items.push(booking)
    return booking
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null
  }

  async findByIdAndCompanyId(id: string, companyId: string) {
    return (
      this.items.find((item) => item.id === id && item.companyId === companyId) ?? null
    )
  }

  async findWithContextByIdAndCompanyId(id: string, companyId: string) {
    const booking = await this.findByIdAndCompanyId(id, companyId)

    if (!booking) {
      return null
    }

    const court = this.courtsRepository.courts.find((item) => item.id === booking.courtId)
    if (!court) {
      return null
    }

    const facility = this.facilitiesRepository.items.find(
      (item) => item.id === court.facilityId,
    )
    if (!facility) {
      return null
    }

    return {
      booking,
      courtName: court.name,
      facilityName: facility.name,
      facilitySlug: facility.slug,
    }
  }

  async listByCompanyInRange(params: {
    companyId: string
    startsAt: Date
    endsAt: Date
    courtId?: string
    status?: Booking['status']
  }) {
    return this.items
      .filter((booking) => {
        if (booking.companyId !== params.companyId) return false
        if (params.courtId && booking.courtId !== params.courtId) return false
        if (params.status && booking.status !== params.status) return false
        return booking.startsAt < params.endsAt && booking.endsAt > params.startsAt
      })
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .flatMap((booking) => {
        const court = this.courtsRepository.courts.find(
          (item) => item.id === booking.courtId,
        )
        if (!court) return []
        const facility = this.facilitiesRepository.items.find(
          (item) => item.id === court.facilityId,
        )
        if (!facility) return []
        return [
          {
            booking,
            courtName: court.name,
            facilityName: facility.name,
            facilitySlug: facility.slug,
          },
        ]
      })
  }

  async expirePendingPayments(params: {
    companyId: string
    now: Date
    courtId?: string
  }) {
    let expiredCount = 0
    this.items = this.items.map((item) => {
      const shouldExpire =
        item.companyId === params.companyId &&
        item.status === 'pending_payment' &&
        (!params.courtId || item.courtId === params.courtId) &&
        !!item.paymentExpiresAt &&
        item.paymentExpiresAt < params.now

      if (!shouldExpire) {
        return item
      }

      expiredCount += 1
      return {
        ...item,
        status: 'expired',
        updatedAt: params.now,
      }
    })

    return expiredCount
  }

  async listBlockingIntervals(params: {
    companyId: string
    courtId: string
    startsAt: Date
    endsAt: Date
    now: Date
  }) {
    const bookingIntervals = this.items
      .filter((item) => {
        if (item.companyId !== params.companyId || item.courtId !== params.courtId) {
          return false
        }

        if (!BLOCKING_STATUSES.has(item.status)) {
          return false
        }

        if (
          item.status === 'pending_payment' &&
          (!item.paymentExpiresAt || item.paymentExpiresAt <= params.now)
        ) {
          return false
        }

        return item.startsAt < params.endsAt && item.endsAt > params.startsAt
      })
      .map((item) => ({ startsAt: item.startsAt, endsAt: item.endsAt }))

    const membershipIntervals = this.memberships
      .filter((item) => {
        return (
          item.companyId === params.companyId &&
          item.courtId === params.courtId &&
          item.status === 'active' &&
          item.startsAt < params.endsAt &&
          item.endsAt > params.startsAt
        )
      })
      .map((item) => ({ startsAt: item.startsAt, endsAt: item.endsAt }))

    const classIntervals = this.classes
      .filter((item) => {
        return (
          item.companyId === params.companyId &&
          item.courtId === params.courtId &&
          item.status === 'scheduled' &&
          item.startsAt < params.endsAt &&
          item.endsAt > params.startsAt
        )
      })
      .map((item) => ({ startsAt: item.startsAt, endsAt: item.endsAt }))

    return [...bookingIntervals, ...membershipIntervals, ...classIntervals]
  }

  async createWithAvailabilityCheck(params: {
    booking: CreateBookingInput
    now: Date
  }) {
    await this.expirePendingPayments({
      companyId: params.booking.companyId,
      courtId: params.booking.courtId,
      now: params.now,
    })

    const conflicts = await this.listBlockingIntervals({
      companyId: params.booking.companyId,
      courtId: params.booking.courtId,
      startsAt: params.booking.startsAt,
      endsAt: params.booking.endsAt,
      now: params.now,
    })

    if (conflicts.length > 0) {
      return null
    }

    return this.create(params.booking)
  }

  async updateById(id: string, data: UpdateBookingInput) {
    const index = this.items.findIndex((item) => item.id === id)
    if (index < 0) {
      return null
    }

    const current = this.items[index]
    const updated: Booking = {
      ...current,
      ...data,
      updatedAt: this.now(),
    }

    this.items[index] = updated
    return updated
  }
}
