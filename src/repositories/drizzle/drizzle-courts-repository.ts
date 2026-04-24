import { asc, count, eq, inArray } from 'drizzle-orm'
import { db } from '../../db'
import {
  courtOpeningHours,
  courtWeekdayPrices,
  courts,
  facilities,
} from '../../db/schema'
import type {
  CourtOpeningHourInput,
  CourtWeekdayPriceInput,
  CourtsRepository,
  CreateCourtInput,
  UpdateCourtInput,
} from '../courts-repository'

export class DrizzleCourtsRepository implements CourtsRepository {
  async create(data: {
    court: CreateCourtInput
    openingHours: CourtOpeningHourInput[]
    weekdayPrices: CourtWeekdayPriceInput[]
  }) {
    return db.transaction(async (tx) => {
      const [court] = await tx.insert(courts).values(data.court).returning()

      const openingHours =
        data.openingHours.length > 0
          ? await tx
              .insert(courtOpeningHours)
              .values(
                data.openingHours.map((item) => ({
                  courtId: court.id,
                  weekday: item.weekday,
                  startMinute: item.startMinute,
                  endMinute: item.endMinute,
                })),
              )
              .returning()
          : []

      const weekdayPrices =
        data.weekdayPrices.length > 0
          ? await tx
              .insert(courtWeekdayPrices)
              .values(
                data.weekdayPrices.map((item) => ({
                  courtId: court.id,
                  weekday: item.weekday,
                  priceCents: item.priceCents,
                })),
              )
              .returning()
          : []

      return {
        court,
        openingHours,
        weekdayPrices,
      }
    })
  }

  async updateById(
    courtId: string,
    data: {
      court: UpdateCourtInput
      openingHours: CourtOpeningHourInput[]
      weekdayPrices: CourtWeekdayPriceInput[]
    },
  ) {
    return db.transaction(async (tx) => {
      const [court] = await tx
        .update(courts)
        .set(data.court)
        .where(eq(courts.id, courtId))
        .returning()

      if (!court) {
        return null
      }

      await tx.delete(courtOpeningHours).where(eq(courtOpeningHours.courtId, courtId))
      await tx
        .delete(courtWeekdayPrices)
        .where(eq(courtWeekdayPrices.courtId, courtId))

      const openingHours =
        data.openingHours.length > 0
          ? await tx
              .insert(courtOpeningHours)
              .values(
                data.openingHours.map((item) => ({
                  courtId,
                  weekday: item.weekday,
                  startMinute: item.startMinute,
                  endMinute: item.endMinute,
                })),
              )
              .returning()
          : []

      const weekdayPrices =
        data.weekdayPrices.length > 0
          ? await tx
              .insert(courtWeekdayPrices)
              .values(
                data.weekdayPrices.map((item) => ({
                  courtId,
                  weekday: item.weekday,
                  priceCents: item.priceCents,
                })),
              )
              .returning()
          : []

      return {
        court,
        openingHours,
        weekdayPrices,
      }
    })
  }

  async findById(courtId: string) {
    const [court] = await db.select().from(courts).where(eq(courts.id, courtId)).limit(1)

    if (!court) {
      return null
    }

    const openingHours = await db
      .select()
      .from(courtOpeningHours)
      .where(eq(courtOpeningHours.courtId, courtId))
      .orderBy(asc(courtOpeningHours.weekday), asc(courtOpeningHours.startMinute))

    const weekdayPrices = await db
      .select()
      .from(courtWeekdayPrices)
      .where(eq(courtWeekdayPrices.courtId, courtId))
      .orderBy(asc(courtWeekdayPrices.weekday))

    return {
      court,
      openingHours,
      weekdayPrices,
    }
  }

  async listByFacilityId(facilityId: string) {
    const facilityCourts = await db
      .select()
      .from(courts)
      .where(eq(courts.facilityId, facilityId))
      .orderBy(asc(courts.name))

    if (facilityCourts.length === 0) {
      return []
    }

    const courtIds = facilityCourts.map((item) => item.id)

    const [openingHours, weekdayPrices] = await Promise.all([
      db
        .select()
        .from(courtOpeningHours)
        .where(inArray(courtOpeningHours.courtId, courtIds))
        .orderBy(
          asc(courtOpeningHours.courtId),
          asc(courtOpeningHours.weekday),
          asc(courtOpeningHours.startMinute),
        ),
      db
        .select()
        .from(courtWeekdayPrices)
        .where(inArray(courtWeekdayPrices.courtId, courtIds))
        .orderBy(
          asc(courtWeekdayPrices.courtId),
          asc(courtWeekdayPrices.weekday),
        ),
    ])

    return facilityCourts.map((court) => ({
      court,
      openingHours: openingHours.filter((item) => item.courtId === court.id),
      weekdayPrices: weekdayPrices.filter((item) => item.courtId === court.id),
    }))
  }

  async countByCompanyId(companyId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(courts)
      .innerJoin(facilities, eq(courts.facilityId, facilities.id))
      .where(eq(facilities.companyId, companyId))

    return Number(result.count)
  }
}
