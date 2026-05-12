import type { CourtWithSettings } from '../repositories/courts-repository'
import { InvalidBookingTimeRangeError } from '../_errors/invalid-booking-time-range-error'

type SlotGenerationParams = {
  dayDate: Date
  openingHours: CourtWithSettings['openingHours']
  durationMinutes: number
  bufferMinutes: number
}

export type GeneratedSlot = {
  startsAt: Date
  endsAt: Date
}

function toUtcDate(dayDate: Date, minuteOfDay: number) {
  const result = new Date(dayDate)
  result.setUTCHours(0, 0, 0, 0)
  result.setUTCMinutes(minuteOfDay)
  return result
}

export function getUtcDayBounds(day: string) {
  const startsAt = new Date(`${day}T00:00:00.000Z`)
  if (Number.isNaN(startsAt.getTime())) {
    throw new InvalidBookingTimeRangeError('Data inválida. Use YYYY-MM-DD.')
  }

  const endsAt = new Date(startsAt)
  endsAt.setUTCDate(endsAt.getUTCDate() + 1)
  return { startsAt, endsAt }
}

export function assertBookingWindowValid({
  startsAt,
  endsAt,
}: {
  startsAt: Date
  endsAt: Date
}) {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new InvalidBookingTimeRangeError()
  }

  if (startsAt >= endsAt) {
    throw new InvalidBookingTimeRangeError(
      'Data de início deve ser menor que data de fim.',
    )
  }
}

export function assertWithinCourtOpeningHours(params: {
  startsAt: Date
  endsAt: Date
  openingHours: CourtWithSettings['openingHours']
}) {
  const weekday = params.startsAt.getUTCDay()
  const startMinute =
    params.startsAt.getUTCHours() * 60 + params.startsAt.getUTCMinutes()
  const endMinute = params.endsAt.getUTCHours() * 60 + params.endsAt.getUTCMinutes()
  const hasMatchingWindow = params.openingHours.some((window) => {
    return (
      window.weekday === weekday &&
      startMinute >= window.startMinute &&
      endMinute <= window.endMinute
    )
  })

  if (!hasMatchingWindow) {
    throw new InvalidBookingTimeRangeError(
      'Reserva fora do horário de funcionamento da quadra.',
    )
  }
}

export function calculateBookingPrice(params: {
  basePriceCents: number
  weekdayPrices: CourtWithSettings['weekdayPrices']
  startsAt: Date
}) {
  const weekday = params.startsAt.getUTCDay()
  const weekdayPrice = params.weekdayPrices.find((item) => item.weekday === weekday)

  if (!weekdayPrice) {
    return {
      totalPriceCents: params.basePriceCents,
      pricingRule: 'base' as const,
    }
  }

  return {
    totalPriceCents: weekdayPrice.priceCents,
    pricingRule: 'weekday' as const,
  }
}

export function generateDaySlots(params: SlotGenerationParams) {
  const weekday = params.dayDate.getUTCDay()
  const dayWindows = params.openingHours.filter((item) => item.weekday === weekday)
  const stepMinutes = params.durationMinutes + params.bufferMinutes
  const slots: GeneratedSlot[] = []

  for (const window of dayWindows) {
    let minutePointer = window.startMinute
    while (minutePointer + params.durationMinutes <= window.endMinute) {
      const startsAt = toUtcDate(params.dayDate, minutePointer)
      const endsAt = toUtcDate(params.dayDate, minutePointer + params.durationMinutes)
      slots.push({ startsAt, endsAt })
      minutePointer += stepMinutes
    }
  }

  return slots
}

export function overlaps(a: GeneratedSlot, b: GeneratedSlot) {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt
}
