import { describe, expect, it } from 'vitest'
import { InvalidCourtConfigurationError } from '../_errors/invalid-court-configuration-error'
import {
  expandAndValidateOpeningHours,
  groupOpeningHoursByRange,
  validateAndSortWeekdayPrices,
} from './court-schedule'

describe('expandAndValidateOpeningHours', () => {
  it('should throw when groups is empty', () => {
    expect(() => expandAndValidateOpeningHours([])).toThrow(
      InvalidCourtConfigurationError,
    )
    expect(() => expandAndValidateOpeningHours([])).toThrow(
      /ao menos um horário/,
    )
  })

  it('should throw when a group has no weekdays', () => {
    expect(() =>
      expandAndValidateOpeningHours([
        { weekdays: [], startMinute: 540, endMinute: 1320 },
      ]),
    ).toThrow(/ao menos um dia da semana/)
  })

  it('should throw for invalid minute ranges', () => {
    expect(() =>
      expandAndValidateOpeningHours([
        { weekdays: [1], startMinute: 600, endMinute: 600 },
      ]),
    ).toThrow(/Intervalo de horário inválido/)

    expect(() =>
      expandAndValidateOpeningHours([
        { weekdays: [1], startMinute: -1, endMinute: 600 },
      ]),
    ).toThrow(/Intervalo de horário inválido/)

    expect(() =>
      expandAndValidateOpeningHours([
        { weekdays: [1], startMinute: 540, endMinute: 1441 },
      ]),
    ).toThrow(/Intervalo de horário inválido/)
  })

  it('should throw for invalid weekday values', () => {
    expect(() =>
      expandAndValidateOpeningHours([
        { weekdays: [7], startMinute: 540, endMinute: 1320 },
      ]),
    ).toThrow(/weekday deve estar entre 0 e 6/)
  })

  it('should throw when weekday is duplicated in the same group', () => {
    expect(() =>
      expandAndValidateOpeningHours([
        { weekdays: [1, 1], startMinute: 540, endMinute: 1320 },
      ]),
    ).toThrow(/duplicado no mesmo bloco/)
  })

  it('should throw when the same range is repeated for the same weekday', () => {
    expect(() =>
      expandAndValidateOpeningHours([
        { weekdays: [1], startMinute: 540, endMinute: 1320 },
        { weekdays: [1], startMinute: 540, endMinute: 1320 },
      ]),
    ).toThrow(/repetir o mesmo horário/)
  })

  it('should throw when ranges overlap on the same weekday', () => {
    expect(() =>
      expandAndValidateOpeningHours([
        { weekdays: [1], startMinute: 540, endMinute: 700 },
        { weekdays: [1], startMinute: 690, endMinute: 800 },
      ]),
    ).toThrow(/sobrepor horários/)
  })

  it('should allow touching ranges on the same weekday', () => {
    const result = expandAndValidateOpeningHours([
      { weekdays: [1], startMinute: 540, endMinute: 600 },
      { weekdays: [1], startMinute: 600, endMinute: 700 },
    ])

    expect(result).toEqual([
      { weekday: 1, startMinute: 540, endMinute: 600 },
      { weekday: 1, startMinute: 600, endMinute: 700 },
    ])
  })

  it('should expand and sort ranges by weekday and minutes', () => {
    const result = expandAndValidateOpeningHours([
      { weekdays: [2, 1], startMinute: 540, endMinute: 1320 },
      { weekdays: [0], startMinute: 480, endMinute: 900 },
    ])

    expect(result).toEqual([
      { weekday: 0, startMinute: 480, endMinute: 900 },
      { weekday: 1, startMinute: 540, endMinute: 1320 },
      { weekday: 2, startMinute: 540, endMinute: 1320 },
    ])
  })
})

describe('validateAndSortWeekdayPrices', () => {
  it('should return empty list when no weekday prices are provided', () => {
    expect(validateAndSortWeekdayPrices([])).toEqual([])
  })

  it('should throw for invalid weekday', () => {
    expect(() =>
      validateAndSortWeekdayPrices([{ weekday: 8, priceCents: 17000 }]),
    ).toThrow(/weekday deve estar entre 0 e 6/)
  })

  it('should throw for invalid custom prices', () => {
    expect(() =>
      validateAndSortWeekdayPrices([{ weekday: 1, priceCents: 0 }]),
    ).toThrow(/maior que zero/)

    expect(() =>
      validateAndSortWeekdayPrices([{ weekday: 1, priceCents: -10 }]),
    ).toThrow(/maior que zero/)

    expect(() =>
      validateAndSortWeekdayPrices([{ weekday: 1, priceCents: 10.5 }]),
    ).toThrow(/maior que zero/)
  })

  it('should throw for duplicated weekdays', () => {
    expect(() =>
      validateAndSortWeekdayPrices([
        { weekday: 5, priceCents: 17000 },
        { weekday: 5, priceCents: 18000 },
      ]),
    ).toThrow(/mais de um preço customizado/)
  })

  it('should sort weekday prices', () => {
    const result = validateAndSortWeekdayPrices([
      { weekday: 6, priceCents: 17000 },
      { weekday: 4, priceCents: 16000 },
      { weekday: 5, priceCents: 16500 },
    ])

    expect(result).toEqual([
      { weekday: 4, priceCents: 16000 },
      { weekday: 5, priceCents: 16500 },
      { weekday: 6, priceCents: 17000 },
    ])
  })
})

describe('groupOpeningHoursByRange', () => {
  it('should group weekdays with the same minute range', () => {
    const result = groupOpeningHoursByRange([
      { weekday: 4, startMinute: 540, endMinute: 1320 },
      { weekday: 1, startMinute: 540, endMinute: 1320 },
      { weekday: 2, startMinute: 540, endMinute: 1320 },
      { weekday: 6, startMinute: 420, endMinute: 900 },
    ])

    expect(result).toEqual([
      { weekdays: [1, 2, 4], startMinute: 540, endMinute: 1320 },
      { weekdays: [6], startMinute: 420, endMinute: 900 },
    ])
  })

  it('should keep deterministic order by min weekday and then minutes', () => {
    const result = groupOpeningHoursByRange([
      { weekday: 3, startMinute: 600, endMinute: 900 },
      { weekday: 1, startMinute: 700, endMinute: 1000 },
      { weekday: 1, startMinute: 500, endMinute: 600 },
    ])

    expect(result).toEqual([
      { weekdays: [1], startMinute: 500, endMinute: 600 },
      { weekdays: [1], startMinute: 700, endMinute: 1000 },
      { weekdays: [3], startMinute: 600, endMinute: 900 },
    ])
  })
})
