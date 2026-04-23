import { beforeEach, describe, expect, it } from 'vitest'
import { CompanyNotFoundError } from '../_errors/company-not-found-error'
import { FacilityAlreadyExistsError } from '../_errors/facility-already-exists-error'
import { MaxFacilitiesReachedError } from '../_errors/max-facilities-reached-error'
import { InMemoryCompaniesRepository } from '../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryFacilitiesRepository } from '../repositories/in-memory/in-memory-facilities-repository'
import { InMemoryPlansRepository } from '../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../repositories/in-memory/in-memory-subscriptions-repository'
import {
  makeActiveSubscription,
  makeCompanyContext,
  seedPlan,
} from './test-helpers/company-context-helpers'
import { CreateFacility } from './create-facility'

let inMemoryCompaniesRepository: InMemoryCompaniesRepository
let inMemoryCompanyUsersRepository: InMemoryCompanyUsersRepository
let inMemorySubscriptionsRepository: InMemorySubscriptionsRepository
let inMemoryPlansRepository: InMemoryPlansRepository
let inMemoryFacilitiesRepository: InMemoryFacilitiesRepository
let sut: CreateFacility

describe('Create Facility', () => {
  beforeEach(() => {
    inMemoryCompaniesRepository = new InMemoryCompaniesRepository()
    inMemoryCompanyUsersRepository = new InMemoryCompanyUsersRepository()
    inMemorySubscriptionsRepository = new InMemorySubscriptionsRepository()
    inMemoryPlansRepository = new InMemoryPlansRepository()
    inMemoryFacilitiesRepository = new InMemoryFacilitiesRepository()

    sut = new CreateFacility(
      inMemoryCompaniesRepository,
      inMemoryCompanyUsersRepository,
      inMemorySubscriptionsRepository,
      inMemoryPlansRepository,
      inMemoryFacilitiesRepository,
    )
  })

  async function createActiveContext(maxFacilities: number) {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })
    const plan = seedPlan(inMemoryPlansRepository, { maxFacilities })

    await makeActiveSubscription({
      subscriptionsRepository: inMemorySubscriptionsRepository,
      companyId: company.id,
      planId: plan.id,
    })

    return { company, ownerUserId }
  }

  it('should be able to create a facility', async () => {
    const { company, ownerUserId } = await createActiveContext(2)

    const { facility } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      name: 'Unidade Centro',
      address: 'Rua A, 123',
      phone: '11999999999',
    })

    expect(facility.id).toBeDefined()
    expect(facility.slug).toBe('unidade-centro')
  })

  it('should not be able to create a facility with duplicated slug', async () => {
    const { company, ownerUserId } = await createActiveContext(3)

    await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      name: 'Unidade Centro',
    })

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        name: 'Unidade Centro',
      }),
    ).rejects.toBeInstanceOf(FacilityAlreadyExistsError)
  })

  it('should not be able to create a facility when max facilities has been reached', async () => {
    const { company, ownerUserId } = await createActiveContext(1)

    await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      name: 'Unidade Centro',
    })

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        name: 'Unidade Praia',
      }),
    ).rejects.toBeInstanceOf(MaxFacilitiesReachedError)
  })

  it('should not be able to create a facility with invalid company slug', async () => {
    const userId = crypto.randomUUID()

    await expect(
      sut.execute({
        companySlug: 'invalid-company-slug',
        userId,
        name: 'Unidade Centro',
      }),
    ).rejects.toBeInstanceOf(CompanyNotFoundError)
  })
})
