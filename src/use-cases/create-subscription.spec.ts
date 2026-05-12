import { beforeEach, describe, expect, it } from 'vitest'
import { CompanyAlreadyHasActiveSubscriptionError } from '../_errors/company-already-has-active-subscription-error'
import { CompanyNotFoundError } from '../_errors/company-not-found-error'
import { PlanInactiveError } from '../_errors/plan-inactive-error'
import { TrialAlreadyUsedError } from '../_errors/trial-already-used-error'
import { UnauthorizedCompanyAccessError } from '../_errors/unauthorized-company-access-error'
import { InMemoryCompaniesRepository } from '../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryPlansRepository } from '../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../repositories/in-memory/in-memory-subscriptions-repository'
import { CreateSubscription } from './create-subscription'
import {
  makeCompanyContext,
  seedPlan,
} from './test-helpers/company-context-helpers'

let inMemoryCompaniesRepository: InMemoryCompaniesRepository
let inMemoryCompanyUsersRepository: InMemoryCompanyUsersRepository
let inMemoryPlansRepository: InMemoryPlansRepository
let inMemorySubscriptionsRepository: InMemorySubscriptionsRepository
let sut: CreateSubscription

describe('Create Subscription', () => {
  beforeEach(() => {
    inMemoryCompaniesRepository = new InMemoryCompaniesRepository()
    inMemoryCompanyUsersRepository = new InMemoryCompanyUsersRepository()
    inMemoryPlansRepository = new InMemoryPlansRepository()
    inMemorySubscriptionsRepository = new InMemorySubscriptionsRepository({
      companyUsersRepository: inMemoryCompanyUsersRepository,
      plansRepository: inMemoryPlansRepository,
    })

    sut = new CreateSubscription(
      inMemoryCompaniesRepository,
      inMemoryCompanyUsersRepository,
      inMemoryPlansRepository,
      inMemorySubscriptionsRepository,
    )
  })

  it('should be able to create an active subscription', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })
    const plan = seedPlan(inMemoryPlansRepository, {
      slug: 'start',
      isActive: true,
    })

    const { subscription } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      planSlug: plan.slug,
    })

    expect(subscription.id).toBeDefined()
    expect(subscription.status).toBe('active')
  })

  it('should create trialing subscription for free_trial plan', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })
    const trialPlan = seedPlan(inMemoryPlansRepository, {
      slug: 'free_trial',
      isActive: true,
      trialDays: 14,
    })

    const { subscription } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      planSlug: trialPlan.slug,
    })

    expect(subscription.status).toBe('trialing')
    expect(subscription.trialEndsAt).not.toBeNull()
  })

  it('should not be able to create subscription for a non-existing company', async () => {
    const plan = seedPlan(inMemoryPlansRepository, {
      slug: 'start',
      isActive: true,
    })

    await expect(
      sut.execute({
        companySlug: 'unknown-company',
        userId: crypto.randomUUID(),
        planSlug: plan.slug,
      }),
    ).rejects.toBeInstanceOf(CompanyNotFoundError)
  })

  it('should not be able to create subscription if user is not owner', async () => {
    const { company, staffUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
      includeStaffUser: true,
    })

    const plan = seedPlan(inMemoryPlansRepository, {
      slug: 'start',
      isActive: true,
    })

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: staffUserId as string,
        planSlug: plan.slug,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedCompanyAccessError)
  })

  it('should not be able to create subscription with an inactive plan', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })
    const inactivePlan = seedPlan(inMemoryPlansRepository, {
      slug: 'start',
      isActive: false,
    })

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        planSlug: inactivePlan.slug,
      }),
    ).rejects.toBeInstanceOf(PlanInactiveError)
  })

  it('should not be able to create a second active subscription for company', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })
    const plan = seedPlan(inMemoryPlansRepository, {
      slug: 'start',
      isActive: true,
    })

    await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      planSlug: plan.slug,
    })

    await expect(
      sut.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        planSlug: plan.slug,
      }),
    ).rejects.toBeInstanceOf(CompanyAlreadyHasActiveSubscriptionError)
  })

  it('should expire stale active subscription before creating a new one', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })
    const trialPlan = seedPlan(inMemoryPlansRepository, {
      slug: 'free_trial',
      isActive: true,
      trialDays: 14,
    })
    const paidPlan = seedPlan(inMemoryPlansRepository, {
      slug: 'pro',
      isActive: true,
      trialDays: 0,
    })

    const staleTrialSubscription = await inMemorySubscriptionsRepository.create(
      {
        companyId: company.id,
        planId: trialPlan.id,
        status: 'trialing',
        currentPeriodStartsAt: new Date('2026-01-01T00:00:00.000Z'),
        currentPeriodEndsAt: new Date('2026-01-15T00:00:00.000Z'),
        trialEndsAt: new Date('2026-01-15T00:00:00.000Z'),
      },
    )

    const { subscription } = await sut.execute({
      companySlug: company.slug,
      userId: ownerUserId,
      planSlug: paidPlan.slug,
    })

    expect(subscription.id).not.toBe(staleTrialSubscription.id)
    expect(subscription.status).toBe('active')

    const updatedStaleSubscription =
      await inMemorySubscriptionsRepository.findById(staleTrialSubscription.id)

    expect(updatedStaleSubscription?.status).toBe('expired')
    expect(updatedStaleSubscription?.endedAt).toBeTruthy()
  })

  it('should not be able to use free trial more than once as owner', async () => {
    const ownerUserId = crypto.randomUUID()
    const trialPlan = seedPlan(inMemoryPlansRepository, {
      slug: 'free_trial',
      isActive: true,
      trialDays: 14,
    })

    const { company: firstCompany } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
      companyName: 'Arena One',
      companySlug: 'arena-one',
      ownerUserId,
    })

    await sut.execute({
      companySlug: firstCompany.slug,
      userId: ownerUserId,
      planSlug: trialPlan.slug,
    })

    const { company: secondCompany } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
      companyName: 'Arena Two',
      companySlug: 'arena-two',
      ownerUserId,
    })

    await expect(
      sut.execute({
        companySlug: secondCompany.slug,
        userId: ownerUserId,
        planSlug: trialPlan.slug,
      }),
    ).rejects.toBeInstanceOf(TrialAlreadyUsedError)
  })
})
