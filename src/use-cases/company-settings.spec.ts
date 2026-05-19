import { beforeEach, describe, expect, it } from 'vitest'
import { CompanyFeatureNotAllowedByPlanError } from '../_errors/company-feature-not-allowed-by-plan-error'
import { InvalidCompanySettingsError } from '../_errors/invalid-company-settings-error'
import { UnauthorizedCompanyAccessError } from '../_errors/unauthorized-company-access-error'
import { InMemoryCompaniesRepository } from '../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryPlansRepository } from '../repositories/in-memory/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from '../repositories/in-memory/in-memory-subscriptions-repository'
import { GetCompanySettings } from './get-company-settings'
import {
  makeActiveSubscription,
  makeCompanyContext,
  seedPlan,
} from './test-helpers/company-context-helpers'
import { UpdateCompanySettings } from './update-company-settings'

let companiesRepository: InMemoryCompaniesRepository
let companyUsersRepository: InMemoryCompanyUsersRepository
let plansRepository: InMemoryPlansRepository
let subscriptionsRepository: InMemorySubscriptionsRepository

describe('Company settings', () => {
  beforeEach(() => {
    companiesRepository = new InMemoryCompaniesRepository()
    companyUsersRepository = new InMemoryCompanyUsersRepository()
    plansRepository = new InMemoryPlansRepository()
    subscriptionsRepository = new InMemorySubscriptionsRepository({
      companyUsersRepository,
      plansRepository,
    })
  })

  describe('GetCompanySettings', () => {
    it('should return effective settings combining plan permissions and company choices', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
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

      const useCase = new GetCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      const result = await useCase.execute({
        companySlug: company.slug,
        userId: ownerUserId,
      })

      expect(result.settings.onlineReservationsEnabled).toBe(true)
      expect(result.settings.onlinePaymentEnabled).toBe(true)
      expect(result.settings.onlineBookingRequiresDeposit).toBe(false)
      expect(result.effective.canUseOnlineReservations).toBe(true)
      expect(result.effective.canUseOnlinePayment).toBe(true)
      expect(result.effective.requiresOnlineDeposit).toBe(false)
    })

    it('should report canUseOnlinePayment as false when plan does not allow it', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
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

      const useCase = new GetCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      const result = await useCase.execute({
        companySlug: company.slug,
        userId: ownerUserId,
      })

      expect(result.effective.canUseOnlineReservations).toBe(true)
      expect(result.effective.canUseOnlinePayment).toBe(false)
    })

    it('should reject staff users', async () => {
      const { company, staffUserId } = await makeCompanyContext({
        companiesRepository,
        companyUsersRepository,
        includeStaffUser: true,
      })
      const plan = seedPlan(plansRepository, { slug: 'growth' })
      await makeActiveSubscription({
        subscriptionsRepository,
        companyId: company.id,
        planId: plan.id,
      })

      const useCase = new GetCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      await expect(
        useCase.execute({
          companySlug: company.slug,
          userId: staffUserId as string,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedCompanyAccessError)
    })
  })

  describe('UpdateCompanySettings', () => {
    it('should turn online reservations off and persist the choice', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
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

      const useCase = new UpdateCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      const result = await useCase.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        onlineReservationsEnabled: false,
        onlinePaymentEnabled: false,
      })

      expect(result.settings.onlineReservationsEnabled).toBe(false)
      expect(result.settings.onlinePaymentEnabled).toBe(false)
      expect(result.effective.canUseOnlineReservations).toBe(false)
      expect(result.effective.canUseOnlinePayment).toBe(false)
    })

    it('should enable required deposit and store the percent', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
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

      const useCase = new UpdateCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      const result = await useCase.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        onlineBookingRequiresDeposit: true,
        onlineBookingDepositPercent: 25,
      })

      expect(result.settings.onlineBookingRequiresDeposit).toBe(true)
      expect(result.settings.onlineBookingDepositPercent).toBe(25)
      expect(result.effective.requiresOnlineDeposit).toBe(true)
      expect(result.effective.depositPercent).toBe(25)
    })

    it('should refuse to enable online payment when plan does not allow it', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
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

      const useCase = new UpdateCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      await expect(
        useCase.execute({
          companySlug: company.slug,
          userId: ownerUserId,
          onlinePaymentEnabled: true,
        }),
      ).rejects.toBeInstanceOf(CompanyFeatureNotAllowedByPlanError)
    })

    it('should refuse to enable online reservations when plan does not allow it', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
        companiesRepository,
        companyUsersRepository,
      })
      const plan = seedPlan(plansRepository, {
        slug: 'restricted',
        hasOnlineReservations: false,
        hasOnlinePayment: false,
      })
      await makeActiveSubscription({
        subscriptionsRepository,
        companyId: company.id,
        planId: plan.id,
      })

      const useCase = new UpdateCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      await expect(
        useCase.execute({
          companySlug: company.slug,
          userId: ownerUserId,
          onlineReservationsEnabled: true,
        }),
      ).rejects.toBeInstanceOf(CompanyFeatureNotAllowedByPlanError)
    })

    it('should refuse to require deposit when online payment is disabled', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
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

      const useCase = new UpdateCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      await expect(
        useCase.execute({
          companySlug: company.slug,
          userId: ownerUserId,
          onlinePaymentEnabled: false,
          onlineBookingRequiresDeposit: true,
          onlineBookingDepositPercent: 30,
        }),
      ).rejects.toBeInstanceOf(InvalidCompanySettingsError)
    })

    it('should refuse invalid deposit percent values', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
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

      const useCase = new UpdateCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      await expect(
        useCase.execute({
          companySlug: company.slug,
          userId: ownerUserId,
          onlineBookingRequiresDeposit: true,
          onlineBookingDepositPercent: 0,
        }),
      ).rejects.toBeInstanceOf(InvalidCompanySettingsError)
    })

    it('should normalize deposit percent to zero when deposit is disabled', async () => {
      const { company, ownerUserId } = await makeCompanyContext({
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

      // Pré-condição: configurar entrada com 30%.
      await companiesRepository.updateSettingsById(company.id, {
        onlineBookingRequiresDeposit: true,
        onlineBookingDepositPercent: 30,
      })

      const useCase = new UpdateCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      const result = await useCase.execute({
        companySlug: company.slug,
        userId: ownerUserId,
        onlineBookingRequiresDeposit: false,
      })

      expect(result.settings.onlineBookingRequiresDeposit).toBe(false)
      expect(result.settings.onlineBookingDepositPercent).toBe(0)
      expect(result.effective.requiresOnlineDeposit).toBe(false)
    })

    it('should reject staff users', async () => {
      const { company, staffUserId } = await makeCompanyContext({
        companiesRepository,
        companyUsersRepository,
        includeStaffUser: true,
      })
      const plan = seedPlan(plansRepository, { slug: 'growth' })
      await makeActiveSubscription({
        subscriptionsRepository,
        companyId: company.id,
        planId: plan.id,
      })

      const useCase = new UpdateCompanySettings(
        companiesRepository,
        companyUsersRepository,
        subscriptionsRepository,
        plansRepository,
      )

      await expect(
        useCase.execute({
          companySlug: company.slug,
          userId: staffUserId as string,
          onlineReservationsEnabled: false,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedCompanyAccessError)
    })
  })
})
