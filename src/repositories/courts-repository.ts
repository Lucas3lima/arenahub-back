import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { courtOpeningHours, courtWeekdayPrices, courts } from '../db/schema'

export type Court = InferSelectModel<typeof courts>
export type CourtOpeningHour = InferSelectModel<typeof courtOpeningHours>
export type CourtWeekdayPrice = InferSelectModel<typeof courtWeekdayPrices>

export type CreateCourtInput = Pick<
  InferInsertModel<typeof courts>,
  | 'facilityId'
  | 'name'
  | 'description'
  | 'sportType'
  | 'status'
  | 'basePriceCents'
  | 'rentalDurationMinutes'
  | 'bufferMinutes'
  | 'isActive'
>

export type UpdateCourtInput = Partial<
  Pick<
    InferInsertModel<typeof courts>,
    | 'name'
    | 'description'
    | 'sportType'
    | 'status'
    | 'basePriceCents'
    | 'rentalDurationMinutes'
    | 'bufferMinutes'
    | 'isActive'
  >
>

export type CourtOpeningHourInput = Pick<
  InferInsertModel<typeof courtOpeningHours>,
  'weekday' | 'startMinute' | 'endMinute'
>

export type CourtWeekdayPriceInput = Pick<
  InferInsertModel<typeof courtWeekdayPrices>,
  'weekday' | 'priceCents'
>

export type CourtWithSettings = {
  court: Court
  openingHours: CourtOpeningHour[]
  weekdayPrices: CourtWeekdayPrice[]
}

export interface CourtsRepository {
  create(data: {
    court: CreateCourtInput
    openingHours: CourtOpeningHourInput[]
    weekdayPrices: CourtWeekdayPriceInput[]
  }): Promise<CourtWithSettings>
  updateById(
    courtId: string,
    data: {
      court: UpdateCourtInput
      openingHours: CourtOpeningHourInput[]
      weekdayPrices: CourtWeekdayPriceInput[]
    },
  ): Promise<CourtWithSettings | null>
  findById(courtId: string): Promise<CourtWithSettings | null>
  listByFacilityId(facilityId: string): Promise<CourtWithSettings[]>
  countByCompanyId(companyId: string): Promise<number>
}
