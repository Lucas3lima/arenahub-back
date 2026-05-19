import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingSlotUnavailableError } from '../_errors/booking-slot-unavailable-error'
import { OnlineReservationsNotAvailableError } from '../_errors/online-reservations-not-available-error'
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

// Manter datas estáveis em qualquer dia do calendário real.
const FROZEN_NOW = new Date('2030-05-11T08:00:00.000Z')
const TUESDAY_10AM = new Date('2030-05-14T10:00:00.000Z')
const TUESDAY_11AM = new Date('2030-05-14T11:00:00.000Z')
const TUESDAY_12PM = new Date('2030-05-14T12:00:00.000Z')
const TUESDAY_12_30PM = new Date('2030-05-14T12:30:00.000Z')
const TUESDAY_09AM = new Date('2030-05-14T09:00:00.000Z')

describe('Public bookings', () => {
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

  it('should create confirmed booking when plan allows online payment but company does not require deposit', async () => {
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

    const result = await createPublicBooking.execute({
      companySlug: company.slug,
      facilitySlug: facility.slug,
      courtId: court.id,
      customerName: 'João',
      customerPhone: '11999990000',
      startsAt: TUESDAY_10AM,
    })

    expect(result.booking.status).toBe('confirmed')
    expect(result.booking.totalPriceCents).toBe(15000)
    expect(result.booking.paymentExpiresAt).toBeNull()
    expect(result.booking.depositPercent).toBe(0)
    expect(result.booking.depositAmountCents).toBe(0)
    expect(result.paymentMode).toBe('online_or_counter')
    expect(result.requiresOnlineDeposit).toBe(false)
    expect(result.depositPercent).toBe(0)
    expect(result.depositAmountCents).toBe(0)
  })

  it('should create pending_payment booking with deposit snapshot when company requires deposit', async () => {
    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    await companiesRepository.updateSettingsById(company.id, {
      onlineReservationsEnabled: true,
      onlinePaymentEnabled: true,
      onlineBookingRequiresDeposit: true,
      onlineBookingDepositPercent: 30,
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
        name: 'Quadra Pix',
        sportType: 'futebol',
        status: 'open',
        basePriceCents: 10000,
        rentalDurationMinutes: 60,
        bufferMinutes: 0,
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

    const result = await createPublicBooking.execute({
      companySlug: company.slug,
      facilitySlug: facility.slug,
      courtId: court.id,
      customerName: 'João',
      customerPhone: '11999990000',
      startsAt: TUESDAY_10AM,
    })

    expect(result.booking.status).toBe('pending_payment')
    expect(result.booking.totalPriceCents).toBe(15000)
    expect(result.booking.paymentExpiresAt).toBeTruthy()
    expect(result.booking.depositPercent).toBe(30)
    expect(result.booking.depositAmountCents).toBe(4500)
    expect(result.paymentMode).toBe('online_or_counter')
    expect(result.requiresOnlineDeposit).toBe(true)
    expect(result.depositPercent).toBe(30)
    expect(result.depositAmountCents).toBe(4500)
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

    const result = await createPublicBooking.execute({
      companySlug: company.slug,
      facilitySlug: facility.slug,
      courtId: court.id,
      customerName: 'Maria',
      customerPhone: '21999990000',
      startsAt: TUESDAY_11AM,
    })

    expect(result.booking.status).toBe('confirmed')
    expect(result.booking.paymentExpiresAt).toBeNull()
    expect(result.paymentMode).toBe('counter_only')
    expect(result.requiresOnlineDeposit).toBe(false)
  })

  it('should block public booking when plan allows reservations but company disables it', async () => {
    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    await companiesRepository.updateSettingsById(company.id, {
      onlineReservationsEnabled: false,
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

    await expect(
      createPublicBooking.execute({
        companySlug: company.slug,
        facilitySlug: facility.slug,
        courtId: court.id,
        customerName: 'Cliente',
        startsAt: TUESDAY_10AM,
      }),
    ).rejects.toBeInstanceOf(OnlineReservationsNotAvailableError)
  })

  it('should report counter_only when plan allows online payment but company disables it', async () => {
    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
    })
    await companiesRepository.updateSettingsById(company.id, {
      onlinePaymentEnabled: false,
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
        name: 'Quadra 04',
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

    const result = await createPublicBooking.execute({
      companySlug: company.slug,
      facilitySlug: facility.slug,
      courtId: court.id,
      customerName: 'Cliente Balcão',
      startsAt: TUESDAY_10AM,
    })

    expect(result.booking.status).toBe('confirmed')
    expect(result.paymentMode).toBe('counter_only')
    expect(result.requiresOnlineDeposit).toBe(false)
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
        name: 'Quadra 05',
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
      startsAt: TUESDAY_12PM,
    })

    await expect(
      createPublicBooking.execute({
        companySlug: company.slug,
        facilitySlug: facility.slug,
        courtId: court.id,
        customerName: 'Cliente 2',
        startsAt: TUESDAY_12_30PM,
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
        name: 'Quadra 06',
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
      startsAt: TUESDAY_09AM,
      endsAt: TUESDAY_10AM,
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
      date: '2030-05-14',
    })

    expect(slots).toHaveLength(3)
    expect(slots[0]?.isAvailable).toBe(true)
    expect(slots[1]?.isAvailable).toBe(false)
    expect(slots[2]?.isAvailable).toBe(true)
  })
})
