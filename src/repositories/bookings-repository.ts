import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { bookings, classes, memberships } from '../db/schema'

export type Booking = InferSelectModel<typeof bookings>
export type Membership = InferSelectModel<typeof memberships>
export type Class = InferSelectModel<typeof classes>
export type CreateBookingInput = InferInsertModel<typeof bookings>
export type UpdateBookingInput = Partial<
  Pick<
    CreateBookingInput,
    | 'status'
    | 'paymentStatus'
    | 'paymentMethod'
    | 'paidAt'
    | 'externalPaymentId'
    | 'paymentExpiresAt'
    | 'cancelledAt'
    | 'cancelledByUserId'
    | 'cancellationReason'
    | 'notes'
  >
>

export type BlockingInterval = {
  startsAt: Date
  endsAt: Date
}

export type BookingWithContext = {
  booking: Booking
  courtName: string
  facilityName: string
  facilitySlug: string
}

export interface BookingsRepository {
  create(data: CreateBookingInput): Promise<Booking>
  findById(id: string): Promise<Booking | null>
  findByIdAndCompanyId(id: string, companyId: string): Promise<Booking | null>
  findWithContextByIdAndCompanyId(
    id: string,
    companyId: string,
  ): Promise<BookingWithContext | null>
  listByCompanyInRange(params: {
    companyId: string
    startsAt: Date
    endsAt: Date
    courtId?: string
    status?: Booking['status']
  }): Promise<BookingWithContext[]>
  expirePendingPayments(params: {
    companyId: string
    now: Date
    courtId?: string
  }): Promise<number>
  listBlockingIntervals(params: {
    companyId: string
    courtId: string
    startsAt: Date
    endsAt: Date
    now: Date
  }): Promise<BlockingInterval[]>
  createWithAvailabilityCheck(params: {
    booking: CreateBookingInput
    now: Date
  }): Promise<Booking | null>
  updateById(id: string, data: UpdateBookingInput): Promise<Booking | null>
}
