import { beforeEach, describe, expect, it } from 'vitest'
import { UserNotFoundError } from '../../_errors/user-not-found-error'
import { InMemoryCompaniesRepository } from '../../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryPlansRepository } from '../../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../../repositories/in-memory/in-memory-subscriptions-repository'
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-memory-users-repository'
import {
  makeActiveSubscription,
  makeCompanyContext,
  seedPlan,
} from '../test-helpers/company-context-helpers'
import { GetProfile } from './get-profile'

let usersRepository: InMemoryUsersRepository
let companiesRepository: InMemoryCompaniesRepository
let companyUsersRepository: InMemoryCompanyUsersRepository
let subscriptionsRepository: InMemorySubscriptionsRepository
let plansRepository: InMemoryPlansRepository
let sut: GetProfile

describe('Get Profile', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    companiesRepository = new InMemoryCompaniesRepository()
    companyUsersRepository = new InMemoryCompanyUsersRepository()
    plansRepository = new InMemoryPlansRepository()
    subscriptionsRepository = new InMemorySubscriptionsRepository({
      companyUsersRepository,
      plansRepository,
    })
    sut = new GetProfile(
      usersRepository,
      companyUsersRepository,
      companiesRepository,
      subscriptionsRepository,
      plansRepository,
    )
  })

  it('should return profile with no company for users without membership', async () => {
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
    })

    const result = await sut.execute({
      userId: user.id,
    })

    expect(result.user.id).toBe(user.id)
    expect(result.company).toBeNull()
    expect(result.subscription).toBeNull()
    expect(result.onboarding.hasCompany).toBe(false)
    expect(result.onboarding.hasActiveSubscription).toBe(false)
    expect(result.onboarding.canManageBilling).toBe(false)
    expect(result.onboarding.canManageCompanySettings).toBe(false)
    expect(result.user).not.toHaveProperty('passwordHash')
  })

  it('should return owner profile with active subscription', async () => {
    const ownerUser = await usersRepository.create({
      id: crypto.randomUUID(),
      name: 'Owner User',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    })

    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
      ownerUserId: ownerUser.id,
    })

    const plan = seedPlan(plansRepository, {
      slug: 'growth',
      name: 'Growth',
    })

    const subscription = await makeActiveSubscription({
      subscriptionsRepository,
      companyId: company.id,
      planId: plan.id,
      status: 'active',
    })

    const result = await sut.execute({
      userId: ownerUser.id,
    })

    expect(result.company?.role).toBe('owner')
    expect(result.subscription?.id).toBe(subscription.id)
    expect(result.subscription?.plan.slug).toBe('growth')
    expect(result.onboarding.hasCompany).toBe(true)
    expect(result.onboarding.hasActiveSubscription).toBe(true)
    expect(result.onboarding.canManageBilling).toBe(true)
    expect(result.onboarding.canManageCompanySettings).toBe(true)
  })

  it('should return staff profile without billing permissions', async () => {
    const staffUser = await usersRepository.create({
      id: crypto.randomUUID(),
      name: 'Staff User',
      email: 'staff@example.com',
      passwordHash: 'hashed-password',
    })

    const { company } = await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
      ownerUserId: crypto.randomUUID(),
    })

    await companyUsersRepository.create({
      companyId: company.id,
      userId: staffUser.id,
      role: 'staff',
    })

    const result = await sut.execute({
      userId: staffUser.id,
    })

    expect(result.company?.role).toBe('staff')
    expect(result.onboarding.canManageBilling).toBe(false)
    expect(result.onboarding.canManageCompanySettings).toBe(false)
  })

  it('should return null subscription when there is no active one', async () => {
    const ownerUser = await usersRepository.create({
      id: crypto.randomUUID(),
      name: 'Owner User',
      email: 'owner-2@example.com',
      passwordHash: 'hashed-password',
    })

    await makeCompanyContext({
      companiesRepository,
      companyUsersRepository,
      ownerUserId: ownerUser.id,
    })

    const result = await sut.execute({
      userId: ownerUser.id,
    })

    expect(result.company).not.toBeNull()
    expect(result.subscription).toBeNull()
    expect(result.onboarding.hasActiveSubscription).toBe(false)
  })

  it('should throw when user does not exist', async () => {
    await expect(
      sut.execute({
        userId: crypto.randomUUID(),
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError)
  })
})
