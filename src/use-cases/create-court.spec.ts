import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidCourtConfigurationError } from '../_errors/invalid-court-configuration-error'
import { InMemoryCompaniesRepository } from '../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryCourtsRepository } from '../repositories/in-memory/in-memory-courts-repository'
import { InMemoryFacilitiesRepository } from '../repositories/in-memory/in-memory-facilities-repository'
import { InMemoryPlansRepository } from '../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../repositories/in-memory/in-memory-subscriptions-repository'
import {
  makeActiveSubscription,
  makeCompanyContext,
  seedPlan,
} from './test-helpers/company-context-helpers'
import { CreateCourt } from './create-court'
import { FacilityNotFoundError } from '../_errors/facility-not-found-error'

let inMemoryCompaniesRepository: InMemoryCompaniesRepository
let inMemoryCompanyUsersRepository: InMemoryCompanyUsersRepository
let inMemorySubscriptionsRepository: InMemorySubscriptionsRepository
let inMemoryPlansRepository: InMemoryPlansRepository
let inMemoryFacilitiesRepository: InMemoryFacilitiesRepository
let inMemoryCourtsRepository: InMemoryCourtsRepository
let sut: CreateCourt

describe('Create Court', () => {
  beforeEach(() => {
    inMemoryCompaniesRepository = new InMemoryCompaniesRepository()
    inMemoryCompanyUsersRepository = new InMemoryCompanyUsersRepository()
    inMemorySubscriptionsRepository = new InMemorySubscriptionsRepository()
    inMemoryPlansRepository = new InMemoryPlansRepository()
    inMemoryFacilitiesRepository = new InMemoryFacilitiesRepository()
    inMemoryCourtsRepository = new InMemoryCourtsRepository(
      inMemoryFacilitiesRepository,
    )

    sut = new CreateCourt(
      inMemoryCompaniesRepository,
      inMemoryCompanyUsersRepository,
      inMemorySubscriptionsRepository,
      inMemoryPlansRepository,
      inMemoryFacilitiesRepository,
      inMemoryCourtsRepository,
    )
  })

  async function createActiveContext(maxCourts: number) {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })

    const plan = seedPlan(inMemoryPlansRepository, { maxCourts })

    await makeActiveSubscription({
      subscriptionsRepository: inMemorySubscriptionsRepository,
      companyId: company.id,
      planId: plan.id,
    })

    const facility = await inMemoryFacilitiesRepository.create({
      companyId: company.id,
      name: 'Unidade Centro',
      slug: 'unidade-centro',
      address: null,
      phone: null,
    })

    return { company, ownerUserId, facility }
  }

  it('should create a court with grouped opening hours and weekday prices', async () => {
    const { company, ownerUserId, facility } = await createActiveContext(2)

    const { court } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      facilitySlug: facility.slug,
      name: 'Quadra de areia - 01',
      description: 'Quadra com iluminação LED',
      sportType: 'areia',
      basePriceCents: 15000,
      rentalDurationMinutes: 60,
      bufferMinutes: 10,
      status: 'open',
      openingHours: [
        { weekdays: [1, 2, 3, 4], startMinute: 540, endMinute: 1320 },
        { weekdays: [5, 6], startMinute: 420, endMinute: 1380 },
        { weekdays: [0], startMinute: 540, endMinute: 900 },
      ],
      weekdayPrices: [
        { weekday: 5, priceCents: 17000 },
        { weekday: 6, priceCents: 17000 },
      ],
    })

    expect(court.court.id).toBeDefined()
    expect(court.openingHours).toHaveLength(7)
    expect(court.weekdayPrices).toEqual([
      expect.objectContaining({ weekday: 5, priceCents: 17000 }),
      expect.objectContaining({ weekday: 6, priceCents: 17000 }),
    ])
  })

  it('should not allow overlapping opening hours on the same weekday', async () => {
    const { company, ownerUserId, facility } = await createActiveContext(5)

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        facilitySlug: facility.slug,
        name: 'Quadra de areia - 02',
        sportType: 'areia',
        basePriceCents: 12000,
        rentalDurationMinutes: 60,
        openingHours: [
          { weekdays: [1], startMinute: 480, endMinute: 600 },
          { weekdays: [1], startMinute: 570, endMinute: 660 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidCourtConfigurationError)
  })

  it('should not allow creating a court with a base price less than or equal to zero', async () => {
    const { company, ownerUserId, facility } = await createActiveContext(2)

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        facilitySlug: facility.slug,
        name: 'Quadra de areia - 03',
        sportType: 'areia',
        basePriceCents: 0,
        rentalDurationMinutes: 60,
        openingHours: [{ weekdays: [1], startMinute: 480, endMinute: 600 }],
      }),
    ).rejects.toBeInstanceOf(InvalidCourtConfigurationError)
  })

  it('should not allow creating a court with a rental duration less than or equal to zero', async () => {
    const { company, ownerUserId, facility } = await createActiveContext(2)

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        facilitySlug: facility.slug,
        name: 'Quadra de areia - 04',
        sportType: 'areia',
        basePriceCents: 12000,
        rentalDurationMinutes: 0,
        openingHours: [{ weekdays: [1], startMinute: 480, endMinute: 600 }],
      }),
    ).rejects.toBeInstanceOf(InvalidCourtConfigurationError)
  })

  it('should not allow creating a court with facility not found', async () => {
    const { company, ownerUserId } = await createActiveContext(2)

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        facilitySlug: 'facility-not-found',
        name: 'Quadra de areia - 05',
        sportType: 'areia',
        basePriceCents: 12000,
        rentalDurationMinutes: 60,
        openingHours: [{ weekdays: [1], startMinute: 480, endMinute: 600 }],
      }),
    ).rejects.toBeInstanceOf(FacilityNotFoundError)
  })
})
