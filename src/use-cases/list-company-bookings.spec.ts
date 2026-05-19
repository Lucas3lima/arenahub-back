import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryBookingsRepository } from '../repositories/in-memory/in-memory-bookings-repository'
import { InMemoryCompaniesRepository } from '../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryCourtsRepository } from '../repositories/in-memory/in-memory-courts-repository'
import { InMemoryFacilitiesRepository } from '../repositories/in-memory/in-memory-facilities-repository'
import { InMemoryPlansRepository } from '../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../repositories/in-memory/in-memory-subscriptions-repository'
import { ListCompanyBookings } from './list-company-bookings'
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

const FROZEN_NOW = new Date('2030-05-15T10:00:00.000Z')

describe('List company bookings', () => {
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

  it('should filter bookings by paymentStatus', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    const plan = seedPlan(plansRepository, { slug: 'growth' })
    await makeActiveSubscription({
      subscriptionsRepository,
      companyId: company.id,
      planId: plan.id,
      daysUntilExpiration: 30,
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
        basePriceCents: 10000,
        rentalDurationMinutes: 60,
        bufferMinutes: 0,
        isActive: true,
        description: null,
      },
      openingHours: [{ weekday: 5, startMinute: 0, endMinute: 24 * 60 }],
      weekdayPrices: [],
    })

    await bookingsRepository.create({
      companyId: company.id,
      courtId: court.id,
      customerName: 'Pago',
      startsAt: new Date('2030-05-15T08:00:00.000Z'),
      endsAt: new Date('2030-05-15T09:00:00.000Z'),
      status: 'confirmed',
      source: 'staff',
      totalPriceCents: 10000,
      pricingRule: 'base',
      paymentStatus: 'paid',
    })

    await bookingsRepository.create({
      companyId: company.id,
      courtId: court.id,
      customerName: 'Em aberto',
      startsAt: new Date('2030-05-15T09:00:00.000Z'),
      endsAt: new Date('2030-05-15T10:00:00.000Z'),
      status: 'confirmed',
      source: 'staff',
      totalPriceCents: 10000,
      pricingRule: 'base',
      paymentStatus: 'unpaid',
    })

    const sut = new ListCompanyBookings(
      companiesRepository,
      companyUsersRepository,
      subscriptionsRepository,
      plansRepository,
      bookingsRepository,
    )

    const { bookings } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      startsAt: new Date('2030-05-15T00:00:00.000Z'),
      endsAt: new Date('2030-05-16T00:00:00.000Z'),
      paymentStatus: 'paid',
    })

    expect(bookings).toHaveLength(1)
    expect(bookings[0]?.booking.customerName).toBe('Pago')
    expect(bookings[0]?.booking.paymentStatus).toBe('paid')
  })

  it('should filter outstanding bookings already ended', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    const plan = seedPlan(plansRepository, { slug: 'growth' })
    await makeActiveSubscription({
      subscriptionsRepository,
      companyId: company.id,
      planId: plan.id,
      daysUntilExpiration: 30,
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
        basePriceCents: 10000,
        rentalDurationMinutes: 60,
        bufferMinutes: 0,
        isActive: true,
        description: null,
      },
      openingHours: [{ weekday: 5, startMinute: 0, endMinute: 24 * 60 }],
      weekdayPrices: [],
    })

    await bookingsRepository.create({
      companyId: company.id,
      courtId: court.id,
      customerName: 'Vencida em aberto',
      startsAt: new Date('2030-05-15T07:00:00.000Z'),
      endsAt: new Date('2030-05-15T08:00:00.000Z'),
      status: 'confirmed',
      source: 'staff',
      totalPriceCents: 10000,
      pricingRule: 'base',
      paymentStatus: 'unpaid',
    })

    await bookingsRepository.create({
      companyId: company.id,
      courtId: court.id,
      customerName: 'Futura em aberto',
      startsAt: new Date('2030-05-15T11:00:00.000Z'),
      endsAt: new Date('2030-05-15T12:00:00.000Z'),
      status: 'confirmed',
      source: 'staff',
      totalPriceCents: 10000,
      pricingRule: 'base',
      paymentStatus: 'unpaid',
    })

    await bookingsRepository.create({
      companyId: company.id,
      courtId: court.id,
      customerName: 'Vencida paga',
      startsAt: new Date('2030-05-15T06:00:00.000Z'),
      endsAt: new Date('2030-05-15T07:00:00.000Z'),
      status: 'confirmed',
      source: 'staff',
      totalPriceCents: 10000,
      pricingRule: 'base',
      paymentStatus: 'paid',
    })

    const sut = new ListCompanyBookings(
      companiesRepository,
      companyUsersRepository,
      subscriptionsRepository,
      plansRepository,
      bookingsRepository,
    )

    const { bookings } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      startsAt: new Date('2030-05-15T00:00:00.000Z'),
      endsAt: new Date('2030-05-16T00:00:00.000Z'),
      paymentDue: 'outstanding',
    })

    expect(bookings).toHaveLength(1)
    expect(bookings[0]?.booking.customerName).toBe('Vencida em aberto')
    expect(bookings[0]?.booking.paymentStatus).toBe('unpaid')
  })
})
