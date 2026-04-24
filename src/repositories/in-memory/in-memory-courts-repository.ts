import type {
  Court,
  CourtOpeningHour,
  CourtOpeningHourInput,
  CourtsRepository,
  CourtWeekdayPrice,
  CourtWeekdayPriceInput,
  CreateCourtInput,
  UpdateCourtInput,
} from '../courts-repository'
import type { InMemoryFacilitiesRepository } from './in-memory-facilities-repository'

export class InMemoryCourtsRepository implements CourtsRepository {
  public courts: Court[] = []
  public openingHours: CourtOpeningHour[] = []
  public weekdayPrices: CourtWeekdayPrice[] = []
  private now = () => new Date()

  constructor(private facilitiesRepository: InMemoryFacilitiesRepository) {}

  async create(data: {
    court: CreateCourtInput
    openingHours: CourtOpeningHourInput[]
    weekdayPrices: CourtWeekdayPriceInput[]
  }) {
    const court: Court = {
      id: crypto.randomUUID(),
      facilityId: data.court.facilityId,
      name: data.court.name,
      description: data.court.description ?? null,
      sportType: data.court.sportType,
      status: data.court.status ?? 'open',
      basePriceCents: data.court.basePriceCents,
      rentalDurationMinutes: data.court.rentalDurationMinutes,
      bufferMinutes: data.court.bufferMinutes ?? 0,
      isActive: data.court.isActive ?? true,
      createdAt: this.now(),
      updatedAt: this.now(),
    }

    this.courts.push(court)

    const openingHours = data.openingHours.map((item) => ({
      id: crypto.randomUUID(),
      courtId: court.id,
      weekday: item.weekday,
      startMinute: item.startMinute,
      endMinute: item.endMinute,
      createdAt: this.now(),
      updatedAt: this.now(),
    }))

    this.openingHours.push(...openingHours)

    const weekdayPrices = data.weekdayPrices.map((item) => ({
      id: crypto.randomUUID(),
      courtId: court.id,
      weekday: item.weekday,
      priceCents: item.priceCents,
      createdAt: this.now(),
      updatedAt: this.now(),
    }))

    this.weekdayPrices.push(...weekdayPrices)

    return { court, openingHours, weekdayPrices }
  }

  async updateById(
    courtId: string,
    data: {
      court: UpdateCourtInput
      openingHours: CourtOpeningHourInput[]
      weekdayPrices: CourtWeekdayPriceInput[]
    },
  ) {
    const courtIndex = this.courts.findIndex((item) => item.id === courtId)

    if (courtIndex < 0) {
      return null
    }

    const current = this.courts[courtIndex]
    const updatedCourt: Court = {
      ...current,
      ...data.court,
      description:
        data.court.description === undefined
          ? current.description
          : data.court.description,
      updatedAt: this.now(),
    }

    this.courts[courtIndex] = updatedCourt
    this.openingHours = this.openingHours.filter((item) => item.courtId !== courtId)
    this.weekdayPrices = this.weekdayPrices.filter((item) => item.courtId !== courtId)

    const openingHours = data.openingHours.map((item) => ({
      id: crypto.randomUUID(),
      courtId,
      weekday: item.weekday,
      startMinute: item.startMinute,
      endMinute: item.endMinute,
      createdAt: this.now(),
      updatedAt: this.now(),
    }))

    const weekdayPrices = data.weekdayPrices.map((item) => ({
      id: crypto.randomUUID(),
      courtId,
      weekday: item.weekday,
      priceCents: item.priceCents,
      createdAt: this.now(),
      updatedAt: this.now(),
    }))

    this.openingHours.push(...openingHours)
    this.weekdayPrices.push(...weekdayPrices)

    return {
      court: updatedCourt,
      openingHours,
      weekdayPrices,
    }
  }

  async findById(courtId: string) {
    const court = this.courts.find((item) => item.id === courtId)

    if (!court) {
      return null
    }

    const openingHours = this.openingHours
      .filter((item) => item.courtId === courtId)
      .sort((a, b) => {
        if (a.weekday !== b.weekday) return a.weekday - b.weekday
        return a.startMinute - b.startMinute
      })

    const weekdayPrices = this.weekdayPrices
      .filter((item) => item.courtId === courtId)
      .sort((a, b) => a.weekday - b.weekday)

    return {
      court,
      openingHours,
      weekdayPrices,
    }
  }

  async listByFacilityId(facilityId: string) {
    return this.courts
      .filter((item) => item.facilityId === facilityId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((court) => ({
        court,
        openingHours: this.openingHours
          .filter((item) => item.courtId === court.id)
          .sort((a, b) => {
            if (a.weekday !== b.weekday) return a.weekday - b.weekday
            return a.startMinute - b.startMinute
          }),
        weekdayPrices: this.weekdayPrices
          .filter((item) => item.courtId === court.id)
          .sort((a, b) => a.weekday - b.weekday),
      }))
  }

  async countByCompanyId(companyId: string) {
    const facilityIds = new Set(
      this.facilitiesRepository.items
        .filter((item) => item.companyId === companyId)
        .map((item) => item.id),
    )

    return this.courts.filter((item) => facilityIds.has(item.facilityId)).length
  }
}
