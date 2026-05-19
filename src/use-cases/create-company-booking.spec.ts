import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingSlotUnavailableError } from '../_errors/booking-slot-unavailable-error'
import { InMemoryBookingsRepository } from '../repositories/in-memory/in-memory-bookings-repository'
import { InMemoryCompaniesRepository } from '../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryCourtsRepository } from '../repositories/in-memory/in-memory-courts-repository'
import { InMemoryFacilitiesRepository } from '../repositories/in-memory/in-memory-facilities-repository'
import { InMemoryPlansRepository } from '../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../repositories/in-memory/in-memory-subscriptions-repository'
import { CreateCompanyBooking } from './create-company-booking'
import {
  makeActiveSubscription,
  makeCompanyContext,
  seedPlan,
} from './test-helpers/company-context-helpers'

let companiesRepository: InMemoryCompaniesRepository
let companyUsersRepository: InMemoryCompanyUsersRepository
let plansRepository: InMemoryPlansRepository
let subscriptionsRepository: InMemorySubscriptionsRepository
let facilitiesRepository: InMemoryFacilitiesRepository
let courtsRepository: InMemoryCourtsRepository
let bookingsRepository: InMemoryBookingsRepository
const FROZEN_NOW = new Date('2030-05-11T08:00:00.000Z')
const TUESDAY_10AM = new Date('2030-05-14T10:00:00.000Z')
const TUESDAY_10_30AM = new Date('2030-05-14T10:30:00.000Z')

describe('Create company booking', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_NOW)

    companiesRepository = new InMemoryCompaniesRepository()
    companyUsersRepository = new InMemoryCompanyUsersRepository()
    plansRepository = new InMemoryPlansRepository()
    subscriptionsRepository = new InMemorySubscriptionsRepository({
      companyUsersRepository,
      plansRepository,
    })
    facilitiesRepository = new InMemoryFacilitiesRepository()
    courtsRepository = new InMemoryCourtsRepository(facilitiesRepository)
    bookingsRepository = new InMemoryBookingsRepository(
      courtsRepository,
      facilitiesRepository,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function makeScenario(options?: { includeStaffUser?: boolean }) {
    const { company, ownerUserId, staffUserId } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
      includeStaffUser: options?.includeStaffUser ?? false,
    })
    const plan = seedPlan(plansRepository, {
      hasOnlineReservations: true,
      hasOnlinePayment: true,
      isActive: true,
    })
    await makeActiveSubscription({
      subscriptionsRepository,
      companyId: company.id,
      planId: plan.id,
    })

    const facility = await facilitiesRepository.create({
      companyId: company.id,
      name: 'Matriz',
      slug: 'matriz',
    })

    const { court } = await courtsRepository.create({
      court: {
        facilityId: facility.id,
        name: 'Quadra 01',
        sportType: 'futebol',
        status: 'open',
        basePriceCents: 15000,
        rentalDurationMinutes: 60,
        bufferMinutes: 0,
        isActive: true,
        description: null,
      },
      openingHours: Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        startMinute: 0,
        endMinute: 24 * 60,
      })),
      weekdayPrices: [],
    })

    return { company, ownerUserId, staffUserId, court }
  }

  function makeSut() {
    return new CreateCompanyBooking(
      companiesRepository,
      companyUsersRepository,
      subscriptionsRepository,
      plansRepository,
      courtsRepository,
      facilitiesRepository,
      bookingsRepository,
    )
  }

  it('should create booking when slot is available', async () => {
    const { company, ownerUserId, court } = await makeScenario()
    const sut = makeSut()

    const { booking } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      courtId: court.id,
      customerName: 'Cliente',
      startsAt: TUESDAY_10AM,
    })

    expect(booking.id).toBeDefined()
    expect(booking.status).toBe('confirmed')
    expect(booking.paymentStatus).toBe('unpaid')
    expect(booking.paymentExpiresAt).toBeNull()
    expect(booking.startsAt.toISOString()).toBe('2030-05-14T10:00:00.000Z')
    expect(booking.endsAt.toISOString()).toBe('2030-05-14T11:00:00.000Z')
  })

  it('should not create booking when there is overlap with existing booking', async () => {
    const { company, ownerUserId, court } = await makeScenario()
    const sut = makeSut()

    await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      courtId: court.id,
      customerName: 'Cliente 1',
      startsAt: TUESDAY_10AM,
    })

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        courtId: court.id,
        customerName: 'Cliente 2',
        startsAt: TUESDAY_10_30AM,
      }),
    ).rejects.toBeInstanceOf(BookingSlotUnavailableError)
  })

  it('should not create booking when there is overlap with membership interval', async () => {
    const { company, ownerUserId, court } = await makeScenario()
    const sut = makeSut()

    bookingsRepository.memberships.push({
      id: crypto.randomUUID(),
      companyId: company.id,
      courtId: court.id,
      customerName: 'Mensalista',
      startsAt: TUESDAY_10AM,
      endsAt: new Date('2030-05-14T11:00:00.000Z'),
      recurrenceRule: 'FREQ=WEEKLY',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        courtId: court.id,
        customerName: 'Cliente',
        startsAt: TUESDAY_10_30AM,
      }),
    ).rejects.toBeInstanceOf(BookingSlotUnavailableError)
  })

  it('should not create booking when there is overlap with scheduled class', async () => {
    const { company, ownerUserId, court } = await makeScenario()
    const sut = makeSut()

    bookingsRepository.classes.push({
      id: crypto.randomUUID(),
      companyId: company.id,
      courtId: court.id,
      title: 'Aula de Iniciacao',
      capacity: 8,
      startsAt: TUESDAY_10AM,
      endsAt: new Date('2030-05-14T11:00:00.000Z'),
      recurrenceRule: null,
      status: 'scheduled',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        courtId: court.id,
        customerName: 'Cliente',
        startsAt: TUESDAY_10_30AM,
      }),
    ).rejects.toBeInstanceOf(BookingSlotUnavailableError)
  })

  it('should not create booking in the past', async () => {
    const { company, ownerUserId, court } = await makeScenario()
    const sut = makeSut()

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        courtId: court.id,
        customerName: 'Cliente',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
      }),
    ).rejects.toBeInstanceOf(BookingSlotUnavailableError)
  })

  it('should allow staff to create booking', async () => {
    const { company, staffUserId, court } = await makeScenario({
      includeStaffUser: true,
    })
    const sut = makeSut()

    const { booking } = await sut.execute({
      companySlug: company.slug,
      userId: staffUserId as string,
      courtId: court.id,
      customerName: 'Cliente',
      startsAt: TUESDAY_10AM,
    })

    expect(booking.status).toBe('confirmed')
    expect(booking.source).toBe('staff')
    expect(booking.paymentExpiresAt).toBeNull()
  })
})
