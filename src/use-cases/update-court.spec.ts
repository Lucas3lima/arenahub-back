import { beforeEach, describe, expect, it } from 'vitest'
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
import { UpdateCourt } from './update-court'

let inMemoryCompaniesRepository: InMemoryCompaniesRepository
let inMemoryCompanyUsersRepository: InMemoryCompanyUsersRepository
let inMemorySubscriptionsRepository: InMemorySubscriptionsRepository
let inMemoryPlansRepository: InMemoryPlansRepository
let inMemoryFacilitiesRepository: InMemoryFacilitiesRepository
let inMemoryCourtsRepository: InMemoryCourtsRepository
let createCourt: CreateCourt
let sut: UpdateCourt

describe('Update Court', () => {
  beforeEach(() => {
    inMemoryCompaniesRepository = new InMemoryCompaniesRepository()
    inMemoryCompanyUsersRepository = new InMemoryCompanyUsersRepository()
    inMemorySubscriptionsRepository = new InMemorySubscriptionsRepository()
    inMemoryPlansRepository = new InMemoryPlansRepository()
    inMemoryFacilitiesRepository = new InMemoryFacilitiesRepository()
    inMemoryCourtsRepository = new InMemoryCourtsRepository(
      inMemoryFacilitiesRepository,
    )

    createCourt = new CreateCourt(
      inMemoryCompaniesRepository,
      inMemoryCompanyUsersRepository,
      inMemorySubscriptionsRepository,
      inMemoryPlansRepository,
      inMemoryFacilitiesRepository,
      inMemoryCourtsRepository,
    )

    sut = new UpdateCourt(
      inMemoryCompaniesRepository,
      inMemoryCompanyUsersRepository,
      inMemorySubscriptionsRepository,
      inMemoryPlansRepository,
      inMemoryFacilitiesRepository,
      inMemoryCourtsRepository,
    )
  })

  it('should replace opening hours and weekday prices', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })
    const plan = seedPlan(inMemoryPlansRepository, { maxCourts: 5 })

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

    const created = await createCourt.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      facilitySlug: facility.slug,
      name: 'Quadra 01',
      sportType: 'areia',
      basePriceCents: 15000,
      rentalDurationMinutes: 60,
      openingHours: [{ weekdays: [1, 2], startMinute: 540, endMinute: 1320 }],
      weekdayPrices: [{ weekday: 6, priceCents: 17000 }],
    })

    const { court } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      courtId: created.court.court.id,
      name: 'Quadra 01 - Atualizada',
      openingHours: [
        { weekdays: [1, 2, 3], startMinute: 480, endMinute: 1320 },
        { weekdays: [6], startMinute: 420, endMinute: 1380 },
      ],
      weekdayPrices: [
        { weekday: 5, priceCents: 18000 },
        { weekday: 6, priceCents: 18000 },
      ],
    })

    expect(court.court.name).toBe('Quadra 01 - Atualizada')
    expect(court.openingHours).toHaveLength(4)
    expect(court.weekdayPrices).toEqual([
      expect.objectContaining({ weekday: 5, priceCents: 18000 }),
      expect.objectContaining({ weekday: 6, priceCents: 18000 }),
    ])
  })
})
