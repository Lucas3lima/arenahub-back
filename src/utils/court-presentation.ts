import type { CourtWithSettings } from '../repositories/courts-repository'
import { groupOpeningHoursByRange } from './court-schedule'

export function toCourtResponse(data: CourtWithSettings) {
  return {
    courtId: data.court.id,
    facilityId: data.court.facilityId,
    name: data.court.name,
    description: data.court.description,
    sportType: data.court.sportType,
    status: data.court.status,
    basePriceCents: data.court.basePriceCents,
    rentalDurationMinutes: data.court.rentalDurationMinutes,
    bufferMinutes: data.court.bufferMinutes,
    isActive: data.court.isActive,
    openingHours: groupOpeningHoursByRange(
      data.openingHours.map((item) => ({
        weekday: item.weekday,
        startMinute: item.startMinute,
        endMinute: item.endMinute,
      })),
    ),
    weekdayPrices: data.weekdayPrices.map((item) => ({
      weekday: item.weekday,
      priceCents: item.priceCents,
    })),
  }
}
