import { InvalidCourtConfigurationError } from '../_errors/invalid-court-configuration-error'

export type CourtOpeningHoursGroup = {
  weekdays: number[]
  startMinute: number
  endMinute: number
}

export type CourtOpeningHourInput = {
  weekday: number
  startMinute: number
  endMinute: number
}

export type CourtWeekdayPriceInput = {
  weekday: number
  priceCents: number
}

function assertValidWeekday(weekday: number) {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new InvalidCourtConfigurationError('weekday deve estar entre 0 e 6.')
  }
}

function assertValidMinuteRange(startMinute: number, endMinute: number) {
  if (
    !Number.isInteger(startMinute) ||
    !Number.isInteger(endMinute) ||
    startMinute < 0 ||
    endMinute > 1440 ||
    startMinute >= endMinute
  ) {
    throw new InvalidCourtConfigurationError(
      'Intervalo de horário inválido para a quadra.',
    )
  }
}

export function expandAndValidateOpeningHours(
  groups: CourtOpeningHoursGroup[],
): CourtOpeningHourInput[] {
  if (groups.length === 0) {
    throw new InvalidCourtConfigurationError(
      'A quadra deve possuir ao menos um horário de funcionamento.',
    )
  }

  const expanded: CourtOpeningHourInput[] = []
  const uniqueRanges = new Set<string>()

  for (const group of groups) {
    if (group.weekdays.length === 0) {
      throw new InvalidCourtConfigurationError(
        'Cada bloco de horário deve ter ao menos um dia da semana.',
      )
    }

    assertValidMinuteRange(group.startMinute, group.endMinute)

    const weekdaysInGroup = new Set<number>()

    for (const weekday of group.weekdays) {
      assertValidWeekday(weekday)

      if (weekdaysInGroup.has(weekday)) {
        throw new InvalidCourtConfigurationError(
          'Dia da semana duplicado no mesmo bloco de horário.',
        )
      }

      weekdaysInGroup.add(weekday)

      const key = `${weekday}:${group.startMinute}:${group.endMinute}`

      if (uniqueRanges.has(key)) {
        throw new InvalidCourtConfigurationError(
          'Não é permitido repetir o mesmo horário para o mesmo dia.',
        )
      }

      uniqueRanges.add(key)
      expanded.push({
        weekday,
        startMinute: group.startMinute,
        endMinute: group.endMinute,
      })
    }
  }

  const sorted = expanded.sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute
    return a.endMinute - b.endMinute
  })

  let previousRange: CourtOpeningHourInput | null = null

  for (const range of sorted) {
    if (
      previousRange &&
      previousRange.weekday === range.weekday &&
      previousRange.endMinute > range.startMinute
    ) {
      throw new InvalidCourtConfigurationError(
        'Não é permitido sobrepor horários no mesmo dia.',
      )
    }

    previousRange = range
  }

  return sorted
}

export function validateAndSortWeekdayPrices(
  weekdayPrices: CourtWeekdayPriceInput[],
) {
  const weekdays = new Set<number>()

  for (const item of weekdayPrices) {
    assertValidWeekday(item.weekday)

    if (!Number.isInteger(item.priceCents) || item.priceCents <= 0) {
      throw new InvalidCourtConfigurationError(
        'Preço customizado deve ser um inteiro maior que zero.',
      )
    }

    if (weekdays.has(item.weekday)) {
      throw new InvalidCourtConfigurationError(
        'Não é permitido mais de um preço customizado para o mesmo dia.',
      )
    }

    weekdays.add(item.weekday)
  }

  return weekdayPrices.sort((a, b) => a.weekday - b.weekday)
}

export function groupOpeningHoursByRange(
  openingHours: CourtOpeningHourInput[],
) {
  const grouped = new Map<string, CourtOpeningHoursGroup>()

  for (const item of openingHours) {
    const key = `${item.startMinute}:${item.endMinute}`
    const existing = grouped.get(key)

    if (existing) {
      existing.weekdays.push(item.weekday)
      continue
    }

    grouped.set(key, {
      weekdays: [item.weekday],
      startMinute: item.startMinute,
      endMinute: item.endMinute,
    })
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      weekdays: [...item.weekdays].sort((a, b) => a - b),
    }))
    .sort((a, b) => {
      const minA = a.weekdays[0] ?? 0
      const minB = b.weekdays[0] ?? 0
      if (minA !== minB) return minA - minB
      if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute
      return a.endMinute - b.endMinute
    })
}
