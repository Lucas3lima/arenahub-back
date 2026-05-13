import { and, asc, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import {
  bookings,
  classes,
  courts,
  facilities,
  memberships,
} from '../../db/schema'
import type {
  BookingsRepository,
  CreateBookingInput,
  UpdateBookingInput,
} from '../bookings-repository'

const BLOCKING_BOOKING_STATUSES = ['confirmed', 'pending_payment'] as const

export class DrizzleBookingsRepository implements BookingsRepository {
  async create(data: CreateBookingInput) {
    const [booking] = await db.insert(bookings).values(data).returning()
    return booking
  }

  async findById(id: string) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1)

    if (!booking) {
      return null
    }

    return booking
  }

  async findByIdAndCompanyId(id: string, companyId: string) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.companyId, companyId)))
      .limit(1)

    if (!booking) {
      return null
    }

    return booking
  }

  async findWithContextByIdAndCompanyId(id: string, companyId: string) {
    const [result] = await db
      .select({
        booking: bookings,
        courtName: courts.name,
        facilityName: facilities.name,
        facilitySlug: facilities.slug,
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(facilities, eq(courts.facilityId, facilities.id))
      .where(and(eq(bookings.id, id), eq(bookings.companyId, companyId)))
      .limit(1)

    if (!result) {
      return null
    }

    return result
  }

  async listByCompanyInRange(params: {
    companyId: string
    startsAt: Date
    endsAt: Date
    courtId?: string
    status?: (typeof bookings.$inferSelect)['status']
  }) {
    const filters = [
      eq(bookings.companyId, params.companyId),
      lt(bookings.startsAt, params.endsAt),
      gt(bookings.endsAt, params.startsAt),
    ]

    if (params.courtId) {
      filters.push(eq(bookings.courtId, params.courtId))
    }

    if (params.status) {
      filters.push(eq(bookings.status, params.status))
    }

    return db
      .select({
        booking: bookings,
        courtName: courts.name,
        facilityName: facilities.name,
        facilitySlug: facilities.slug,
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(facilities, eq(courts.facilityId, facilities.id))
      .where(and(...filters))
      .orderBy(asc(bookings.startsAt), desc(bookings.createdAt))
  }

  async expirePendingPayments(params: {
    companyId: string
    now: Date
    courtId?: string
  }) {
    const filters = [
      eq(bookings.companyId, params.companyId),
      eq(bookings.status, 'pending_payment'),
      lt(bookings.paymentExpiresAt, params.now),
    ]

    if (params.courtId) {
      filters.push(eq(bookings.courtId, params.courtId))
    }

    const expired = await db
      .update(bookings)
      .set({
        status: 'expired',
        updatedAt: params.now,
      })
      .where(and(...filters))
      .returning({ id: bookings.id })

    return expired.length
  }

  async listBlockingIntervals(params: {
    companyId: string
    courtId: string
    startsAt: Date
    endsAt: Date
    now: Date
  }) {
    const bookingRows = await db
      .select({
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.companyId, params.companyId),
          eq(bookings.courtId, params.courtId),
          lt(bookings.startsAt, params.endsAt),
          gt(bookings.endsAt, params.startsAt),
          inArray(bookings.status, BLOCKING_BOOKING_STATUSES),
          or(
            eq(bookings.status, 'confirmed'),
            and(
              eq(bookings.status, 'pending_payment'),
              gt(bookings.paymentExpiresAt, params.now),
            ),
          ),
        ),
      )

    const [membershipRows, classRows] = await Promise.all([
      db
        .select({
          startsAt: memberships.startsAt,
          endsAt: memberships.endsAt,
        })
        .from(memberships)
        .where(
          and(
            eq(memberships.companyId, params.companyId),
            eq(memberships.courtId, params.courtId),
            eq(memberships.status, 'active'),
            lt(memberships.startsAt, params.endsAt),
            gt(memberships.endsAt, params.startsAt),
          ),
        ),
      db
        .select({
          startsAt: classes.startsAt,
          endsAt: classes.endsAt,
        })
        .from(classes)
        .where(
          and(
            eq(classes.companyId, params.companyId),
            eq(classes.courtId, params.courtId),
            eq(classes.status, 'scheduled'),
            lt(classes.startsAt, params.endsAt),
            gt(classes.endsAt, params.startsAt),
          ),
        ),
    ])

    return [...bookingRows, ...membershipRows, ...classRows]
  }

  async createWithAvailabilityCheck(params: {
    booking: CreateBookingInput
    now: Date
  }) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${params.booking.courtId}))`,
      )
      // Expire pending payments
      await tx
        .update(bookings)
        .set({
          status: 'expired',
          updatedAt: params.now,
        })
        .where(
          and(
            eq(bookings.companyId, params.booking.companyId),
            eq(bookings.courtId, params.booking.courtId),
            eq(bookings.status, 'pending_payment'),
            lt(bookings.paymentExpiresAt, params.now),
          ),
        )

      // Check for booking conflicts
      const [bookingConflict] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.companyId, params.booking.companyId),
            eq(bookings.courtId, params.booking.courtId),
            lt(bookings.startsAt, params.booking.endsAt),
            gt(bookings.endsAt, params.booking.startsAt),
            inArray(bookings.status, BLOCKING_BOOKING_STATUSES),
            or(
              eq(bookings.status, 'confirmed'),
              and(
                eq(bookings.status, 'pending_payment'),
                gt(bookings.paymentExpiresAt, params.now),
              ),
            ),
          ),
        )
        .limit(1)
      if (bookingConflict) {
        return null
      }
      // Check for membership conflicts
      const [[membershipConflict], [classConflict]] = await Promise.all([
        tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.companyId, params.booking.companyId),
              eq(memberships.courtId, params.booking.courtId),
              eq(memberships.status, 'active'),
              lt(memberships.startsAt, params.booking.endsAt),
              gt(memberships.endsAt, params.booking.startsAt),
            ),
          )
          .limit(1),
        tx
          .select({ id: classes.id })
          .from(classes)
          .where(
            and(
              eq(classes.companyId, params.booking.companyId),
              eq(classes.courtId, params.booking.courtId),
              eq(classes.status, 'scheduled'),
              lt(classes.startsAt, params.booking.endsAt),
              gt(classes.endsAt, params.booking.startsAt),
            ),
          )
          .limit(1),
      ])
      if (membershipConflict || classConflict) {
        return null
      }

      const [createdBooking] = await tx
        .insert(bookings)
        .values(params.booking)
        .returning()

      return createdBooking
    })
  }

  async updateById(id: string, data: UpdateBookingInput) {
    const [booking] = await db
      .update(bookings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning()

    if (!booking) {
      return null
    }

    return booking
  }
}
