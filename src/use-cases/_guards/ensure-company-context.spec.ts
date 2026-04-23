import { beforeEach, describe, expect, it } from 'vitest'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { InMemoryCompaniesRepository } from '../../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryPlansRepository } from '../../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../../repositories/in-memory/in-memory-subscriptions-repository'
import {
  makeActiveSubscription,
  makeCompanyContext,
  seedPlan,
} from '../test-helpers/company-context-helpers'
import { ensureCompanyContext } from './ensure-company-context'

let inMemoryCompaniesRepository: InMemoryCompaniesRepository
let inMemoryCompanyUsersRepository: InMemoryCompanyUsersRepository
let inMemorySubscriptionsRepository: InMemorySubscriptionsRepository
let inMemoryPlansRepository: InMemoryPlansRepository

describe('Ensure Company Context Guard', () => {
  beforeEach(() => {
    inMemoryCompaniesRepository = new InMemoryCompaniesRepository()
    inMemoryCompanyUsersRepository = new InMemoryCompanyUsersRepository()
    inMemorySubscriptionsRepository = new InMemorySubscriptionsRepository()
    inMemoryPlansRepository = new InMemoryPlansRepository()
  })

  it('should return company context when active subscription is not required', async () => {
    // makeCompanyContext creates a company and an owner user
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })

    const result = await ensureCompanyContext({
      companySlug: company.slug,
      userId: ownerUserId,
      allowedRoles: ['owner'],
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
      subscriptionsRepository: inMemorySubscriptionsRepository,
      plansRepository: inMemoryPlansRepository,
    })

    expect(result.company.id).toBe(company.id)
    expect(result.companyUser.userId).toBe(ownerUserId)
    expect(result.subscription).toBeNull()
    expect(result.plan).toBeNull()
  })

  it('should return company, subscription and plan when active subscription is required', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })
    const plan = seedPlan(inMemoryPlansRepository)
    const subscription = await makeActiveSubscription({
      subscriptionsRepository: inMemorySubscriptionsRepository,
      companyId: company.id,
      planId: plan.id,
    })

    const result = await ensureCompanyContext({
      companySlug: company.slug,
      userId: ownerUserId,
      allowedRoles: ['owner'],
      requireActiveSubscription: true,
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
      subscriptionsRepository: inMemorySubscriptionsRepository,
      plansRepository: inMemoryPlansRepository,
    })

    expect(result.company.id).toBe(company.id)
    expect(result.companyUser.userId).toBe(ownerUserId)
    expect(result.subscription.id).toBe(subscription.id)
    expect(result.plan.id).toBe(plan.id)
  })

  it('should throw when company does not exist', async () => {
    await expect(
      ensureCompanyContext({
        companySlug: 'unknown-company',
        userId: crypto.randomUUID(),
        allowedRoles: ['owner'],
        companiesRepository: inMemoryCompaniesRepository,
        companyUsersRepository: inMemoryCompanyUsersRepository,
        subscriptionsRepository: inMemorySubscriptionsRepository,
        plansRepository: inMemoryPlansRepository,
      }),
    ).rejects.toBeInstanceOf(CompanyNotFoundError)
  })

  it('should throw when user is not linked to company', async () => {
    const { company } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })

    await expect(
      ensureCompanyContext({
        companySlug: company.slug,
        userId: crypto.randomUUID(),
        allowedRoles: ['owner'],
        companiesRepository: inMemoryCompaniesRepository,
        companyUsersRepository: inMemoryCompanyUsersRepository,
        subscriptionsRepository: inMemorySubscriptionsRepository,
        plansRepository: inMemoryPlansRepository,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedCompanyAccessError)
  })

  it('should throw when user role is not in allowedRoles', async () => {
    const { company, staffUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
      includeStaffUser: true,
    })

    await expect(
      ensureCompanyContext({
        companySlug: company.slug,
        userId: staffUserId as string,
        allowedRoles: ['owner', 'admin'],
        companiesRepository: inMemoryCompaniesRepository,
        companyUsersRepository: inMemoryCompanyUsersRepository,
        subscriptionsRepository: inMemorySubscriptionsRepository,
        plansRepository: inMemoryPlansRepository,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedCompanyAccessError)
  })

  it('should throw when active subscription is required but missing', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })

    await expect(
      ensureCompanyContext({
        companySlug: company.slug,
        userId: ownerUserId,
        allowedRoles: ['owner'],
        requireActiveSubscription: true,
        companiesRepository: inMemoryCompaniesRepository,
        companyUsersRepository: inMemoryCompanyUsersRepository,
        subscriptionsRepository: inMemorySubscriptionsRepository,
        plansRepository: inMemoryPlansRepository,
      }),
    ).rejects.toBeInstanceOf(ActiveSubscriptionRequiredError)
  })

  it('should throw when subscription plan is not found', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })

    await makeActiveSubscription({
      subscriptionsRepository: inMemorySubscriptionsRepository,
      companyId: company.id,
      planId: crypto.randomUUID(),
    })

    await expect(
      ensureCompanyContext({
        companySlug: company.slug,
        userId: ownerUserId,
        allowedRoles: ['owner'],
        requireActiveSubscription: true,
        companiesRepository: inMemoryCompaniesRepository,
        companyUsersRepository: inMemoryCompanyUsersRepository,
        subscriptionsRepository: inMemorySubscriptionsRepository,
        plansRepository: inMemoryPlansRepository,
      }),
    ).rejects.toBeInstanceOf(PlanNotFoundError)
  })

  it('should throw when allowedRoles is empty', async () => {
    const { company, ownerUserId } = await makeCompanyContext({
      companiesRepository: inMemoryCompaniesRepository,
      companyUsersRepository: inMemoryCompanyUsersRepository,
    })

    await expect(
      ensureCompanyContext({
        companySlug: company.slug,
        userId: ownerUserId,
        allowedRoles: [],
        companiesRepository: inMemoryCompaniesRepository,
        companyUsersRepository: inMemoryCompanyUsersRepository,
        subscriptionsRepository: inMemorySubscriptionsRepository,
        plansRepository: inMemoryPlansRepository,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedCompanyAccessError)
  })
})
