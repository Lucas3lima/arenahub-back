import { beforeEach, describe, expect, it } from 'vitest'
import { BookingSlotUnavailableError } from '../_errors/booking-slot-unavailable-error'
import { InMemoryBookingsRepository } from '../repositories/in-memory/in-memory-bookings-repository'
import { InMemoryCompaniesRepository } from '../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryCourtsRepository } from '../repositories/in-memory/in-memory-courts-repository'
import { InMemoryFacilitiesRepository } from '../repositories/in-memory/in-memory-facilities-repository'
import { InMemoryPlansRepository } from '../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../repositories/in-memory/in-memory-subscriptions-repository'
import { CreatePublicBooking } from './create-public-booking'
import { GetPublicCourtAvailability } from './get-public-court-availability'
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

describe('Public bookings', () => {
  beforeEach(() => {
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

  it('should create pending_payment booking when plan has online payment', async () => {
    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    const plan = seedPlan(plansRepository, {
      slug: 'growth',
      hasOnlineReservations: true,
      hasOnlinePayment: true,
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
        basePriceCents: 12000,
        rentalDurationMinutes: 60,
        bufferMinutes: 10,
        isActive: true,
        description: null,
      },
      openingHours: [{ weekday: 2, startMinute: 480, endMinute: 1320 }],
      weekdayPrices: [{ weekday: 2, priceCents: 15000 }],
    })

    const createPublicBooking = new CreatePublicBooking(
      companiesRepository,
      subscriptionsRepository,
      plansRepository,
      facilitiesRepository,
      courtsRepository,
      bookingsRepository,
    )

    const bookingStartsAt = new Date('2026-05-12T10:00:00.000Z')
    const { booking, paymentMode } = await createPublicBooking.execute({
      companySlug: company.slug,
      facilitySlug: facility.slug,
      courtId: court.id,
      customerName: 'João',
      customerPhone: '11999990000',
      startsAt: bookingStartsAt,
    })

    expect(booking.status).toBe('pending_payment')
    expect(booking.totalPriceCents).toBe(15000)
    expect(booking.paymentExpiresAt).toBeTruthy()
    expect(paymentMode).toBe('online_or_counter')
  })

  it('should create confirmed booking for counter-only plans', async () => {
    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    const plan = seedPlan(plansRepository, {
      slug: 'start',
      hasOnlineReservations: true,
      hasOnlinePayment: false,
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
        name: 'Quadra 02',
        sportType: 'futebol',
        status: 'open',
        basePriceCents: 9000,
        rentalDurationMinutes: 60,
        bufferMinutes: 0,
        isActive: true,
        description: null,
      },
      openingHours: [{ weekday: 2, startMinute: 480, endMinute: 1320 }],
      weekdayPrices: [],
    })

    const createPublicBooking = new CreatePublicBooking(
      companiesRepository,
      subscriptionsRepository,
      plansRepository,
      facilitiesRepository,
      courtsRepository,
      bookingsRepository,
    )

    const { booking, paymentMode } = await createPublicBooking.execute({
      companySlug: company.slug,
      facilitySlug: facility.slug,
      courtId: court.id,
      customerName: 'Maria',
      customerPhone: '21999990000',
      startsAt: new Date('2026-05-12T11:00:00.000Z'),
    })

    expect(booking.status).toBe('confirmed')
    expect(booking.paymentExpiresAt).toBeNull()
    expect(paymentMode).toBe('counter_only')
  })

  it('should not allow overlapping public bookings', async () => {
    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    const plan = seedPlan(plansRepository, {
      hasOnlineReservations: true,
      hasOnlinePayment: true,
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
        name: 'Quadra 03',
        sportType: 'futebol',
        status: 'open',
        basePriceCents: 10000,
        rentalDurationMinutes: 60,
        bufferMinutes: 0,
        isActive: true,
        description: null,
      },
      openingHours: [{ weekday: 2, startMinute: 480, endMinute: 1320 }],
      weekdayPrices: [],
    })

    const createPublicBooking = new CreatePublicBooking(
      companiesRepository,
      subscriptionsRepository,
      plansRepository,
      facilitiesRepository,
      courtsRepository,
      bookingsRepository,
    )

    await createPublicBooking.execute({
      companySlug: company.slug,
      facilitySlug: facility.slug,
      courtId: court.id,
      customerName: 'Cliente 1',
      startsAt: new Date('2026-05-12T12:00:00.000Z'),
    })

    await expect(
      createPublicBooking.execute({
        companySlug: company.slug,
        facilitySlug: facility.slug,
        courtId: court.id,
        customerName: 'Cliente 2',
        startsAt: new Date('2026-05-12T12:30:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(BookingSlotUnavailableError)
  })

  it('should return availability slots with blocked windows', async () => {
    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    const plan = seedPlan(plansRepository, {
      hasOnlineReservations: true,
      hasOnlinePayment: true,
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
        name: 'Quadra 04',
        sportType: 'futebol',
        status: 'open',
        basePriceCents: 10000,
        rentalDurationMinutes: 60,
        bufferMinutes: 0,
        isActive: true,
        description: null,
      },
      openingHours: [{ weekday: 2, startMinute: 480, endMinute: 660 }],
      weekdayPrices: [],
    })

    await bookingsRepository.create({
      companyId: company.id,
      courtId: court.id,
      customerName: 'Bloqueado',
      startsAt: new Date('2026-05-12T09:00:00.000Z'),
      endsAt: new Date('2026-05-12T10:00:00.000Z'),
      status: 'confirmed',
      source: 'public',
      totalPriceCents: 10000,
      pricingRule: 'base',
      paymentStatus: 'unpaid',
    })

    const getAvailability = new GetPublicCourtAvailability(
      companiesRepository,
      subscriptionsRepository,
      plansRepository,
      facilitiesRepository,
      courtsRepository,
      bookingsRepository,
    )

    const { slots } = await getAvailability.execute({
      companySlug: company.slug,
      facilitySlug: facility.slug,
      courtId: court.id,
      date: '2026-05-12',
    })

    expect(slots).toHaveLength(3)
    expect(slots[0]?.isAvailable).toBe(true)
    expect(slots[1]?.isAvailable).toBe(false)
    expect(slots[2]?.isAvailable).toBe(true)
  })
})
